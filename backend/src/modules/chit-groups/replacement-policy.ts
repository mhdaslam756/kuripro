import { AppError } from "../../utils/app-error.js";
import { percentageOfPaise } from "../../utils/money.js";
import type { MemberReplacementSettings } from "../tenants/tenant.model.js";
import { computeDisplacementAllocation, type AllocationHolder, type DisplacementAllocation } from "./displacement-commission.js";

/**
 * Pure replacement-policy maths. Everything is integer paise. No database access, so the rules the
 * organisation configured can be tested on their own and applied identically to preview and execution.
 */

export const DEFAULT_REPLACEMENT_SETTINGS: MemberReplacementSettings = {
  installmentSettlementMode: "PENDING",
  // The chit company keeps the commission unless the organisation chooses otherwise.
  commissionOwnershipMode: "ORGANIZATION",
  fixedCommissionAmount: 0,
  replacementFeeMode: "NONE",
  replacementFeeAmount: 0,
  replacementFeePercentage: 0,
  commissionCalculationBase: "TOTAL_COMMISSION",
};

/** Organisations saved before these settings existed have none — fall back to the defaults. */
export function resolveReplacementSettings(settings: { memberReplacement?: Partial<MemberReplacementSettings> | null } | undefined): MemberReplacementSettings {
  return { ...DEFAULT_REPLACEMENT_SETTINGS, ...(settings?.memberReplacement ?? {}) };
}

export interface CommissionAllocation {
  /** Commission the ticket generates (one cycle's foreman commission × the slot's share). */
  total: number;
  previousMemberShare: number;
  replacementMemberShare: number;
  /** Commission left for the organisation by the displacement policy; always 0 for the simple ownership modes. */
  organizationShare: number;
}

export interface ReplacementFee {
  mode: MemberReplacementSettings["replacementFeeMode"];
  base: MemberReplacementSettings["commissionCalculationBase"] | null;
  baseAmount: number;
  percentage: number | null;
  amount: number;
}

export interface ReplacementFinancialsInput {
  settings: MemberReplacementSettings;
  ticketCommission: number;
  /** Everything the outgoing member has paid in, for any cycle. */
  previousMemberTotalPaid: number;
  /** What the replacement takes on: their remaining instalments. */
  remainingInstalmentsTotal: number;
  /** Set when the organisation's displacement policy is active: the holders to divide the commission between. */
  displacement?: { policy: NonNullable<MemberReplacementSettings["displacementCommission"]>; holders: AllocationHolder[] };
}

export interface ReplacementFinancials {
  commission: CommissionAllocation;
  /** Full per-holder breakdown when the displacement policy is in use. */
  allocation: DisplacementAllocation | null;
  fee: ReplacementFee;
  /** Set when the saved policy cannot be applied to this ticket (e.g. fixed commission above the total). */
  blockedReason: string | null;
}

export function allocateCommission(settings: MemberReplacementSettings, total: number): { allocation: CommissionAllocation; blockedReason: string | null } {
  switch (settings.commissionOwnershipMode) {
    case "ORGANIZATION":
      return { allocation: { total, previousMemberShare: 0, replacementMemberShare: 0, organizationShare: total }, blockedReason: null };
    case "REPLACEMENT_MEMBER":
      return { allocation: { total, previousMemberShare: 0, replacementMemberShare: total, organizationShare: 0 }, blockedReason: null };
    case "FIXED_AMOUNT": {
      if (settings.fixedCommissionAmount > total) {
        return {
          allocation: { total, previousMemberShare: 0, replacementMemberShare: total, organizationShare: 0 },
          blockedReason: "The fixed commission amount is more than the total commission available on this ticket",
        };
      }
      // The configured amount stays with the outgoing member; the rest passes to the replacement.
      return {
        allocation: {
          total,
          previousMemberShare: settings.fixedCommissionAmount,
          replacementMemberShare: total - settings.fixedCommissionAmount,
          organizationShare: 0,
        },
        blockedReason: null,
      };
    }
    case "PREVIOUS_MEMBER":
    default:
      return { allocation: { total, previousMemberShare: total, replacementMemberShare: 0, organizationShare: 0 }, blockedReason: null };
  }
}

export function computeReplacementFee(settings: MemberReplacementSettings, bases: { totalCommission: number; remainingInstalments: number; previousPaid: number }): ReplacementFee {
  if (settings.replacementFeeMode === "FIXED") {
    return { mode: "FIXED", base: null, baseAmount: 0, percentage: null, amount: settings.replacementFeeAmount };
  }
  if (settings.replacementFeeMode === "PERCENTAGE") {
    const base = settings.commissionCalculationBase;
    const baseAmount =
      base === "REMAINING_INSTALMENTS"
        ? bases.remainingInstalments
        : base === "PREVIOUS_MEMBER_PAID"
          ? bases.previousPaid
          : bases.totalCommission;
    return {
      mode: "PERCENTAGE",
      base,
      baseAmount,
      percentage: settings.replacementFeePercentage,
      amount: percentageOfPaise(baseAmount, settings.replacementFeePercentage),
    };
  }
  return { mode: "NONE", base: null, baseAmount: 0, percentage: null, amount: 0 };
}

export function computeReplacementFinancials(input: ReplacementFinancialsInput): ReplacementFinancials {
  const detail = input.displacement
    ? computeDisplacementAllocation(input.displacement.policy, input.ticketCommission, input.displacement.holders)
    : null;
  const { allocation, blockedReason } = detail
    ? {
        allocation: {
          total: detail.total,
          previousMemberShare: detail.previousMemberShare,
          replacementMemberShare: detail.replacementMemberShare,
          organizationShare: detail.organizationShare,
        },
        blockedReason: detail.blockedReason,
      }
    : allocateCommission(input.settings, input.ticketCommission);
  const fee = computeReplacementFee(input.settings, {
    totalCommission: input.ticketCommission,
    remainingInstalments: input.remainingInstalmentsTotal,
    previousPaid: input.previousMemberTotalPaid,
  });
  return { commission: allocation, allocation: detail, fee, blockedReason };
}

export function assertFinancialsApplicable(financials: ReplacementFinancials): void {
  if (financials.blockedReason) throw AppError.badRequest(financials.blockedReason);
}

// --- Previous member's refund taken out of a later prize ---

export interface PrizeRefundClaim {
  replacementId: string;
  /** What the previous member is owed in total (their refund entitlement), in paise. */
  entitlement: number;
}

export interface PrizeRefundAllocation {
  replacementId: string;
  entitlement: number;
  /** Part of the prize set aside for this refund = min(entitlement, what is left of the prize). */
  amount: number;
  /** Entitlement the prize could not cover. It stays outstanding and needs explicit review — never company-funded. */
  shortfall: number;
}

/**
 * Splits a gross prize between the previous members' refunds and the winner. The refunds are always
 * taken out of the prize, so the total handed out can never exceed it. The winner keeps at least one
 * paisa (a payout row cannot be zero); anything the prize cannot cover is reported as a shortfall.
 */
export function allocatePrizeRefund(
  claims: PrizeRefundClaim[],
  grossPrize: number,
): { items: PrizeRefundAllocation[]; refundTotal: number; winnerNet: number; shortfall: number } {
  let room = Math.max(0, grossPrize - 1);
  const items = claims
    .filter((c) => c.entitlement > 0)
    .map((c) => {
      const amount = Math.min(c.entitlement, room);
      room -= amount;
      return { replacementId: c.replacementId, entitlement: c.entitlement, amount, shortfall: c.entitlement - amount };
    });
  const refundTotal = items.reduce((s, i) => s + i.amount, 0);
  return { items, refundTotal, winnerNet: grossPrize - refundTotal, shortfall: items.reduce((s, i) => s + i.shortfall, 0) };
}

/** Refund still to be paid against a prize allocation. Money paid earlier counts as already distributed. */
export function refundRemaining(allocation: number, alreadyPaid: number): number {
  return Math.max(0, allocation - alreadyPaid);
}
