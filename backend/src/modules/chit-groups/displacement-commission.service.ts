import type { Types } from "mongoose";

import { Payment } from "../payments/payment.model.js";
import type { DisplacementCommissionSettings, MemberReplacementSettings } from "../tenants/tenant.model.js";
import { ChitMembership, type ChitMembershipDocument } from "./chit-membership.model.js";
import type { AllocationHolder } from "./displacement-commission.js";

/** Ticket-share weight: full = 2, half = 1. */
export function shareUnitsOf(m: Pick<ChitMembershipDocument, "share" | "shareType">): number {
  return Math.round((m.share ?? (m.shareType === "HALF" ? 0.5 : 1)) * 2);
}

/** The displacement policy that applies to a replacement made `at`, or null when it is off / not yet effective. */
export function activeDisplacementPolicy(settings: MemberReplacementSettings, at: Date = new Date()): DisplacementCommissionSettings | null {
  const cfg = settings.displacementCommission;
  if (cfg?.commissionAllocationEnabled && !(cfg.effectiveFrom && cfg.effectiveFrom.getTime() > at.getTime())) return cfg;
  // The two proportional shortcuts reuse the same engine, so they get the same per-holder breakdown and audit record.
  const shortcut = (mode: DisplacementCommissionSettings["displacementCommissionMode"], prev: number, repl: number): DisplacementCommissionSettings => ({
    commissionAllocationEnabled: true,
    displacementCommissionMode: mode,
    previousMemberPercentage: prev,
    replacementMemberPercentage: repl,
    previousMemberFixedAmount: 0,
    replacementMemberFixedAmount: 0,
    remainingCommissionPolicy: "ORGANIZATION",
  });
  if (settings.commissionOwnershipMode === "EQUAL_SPLIT") return shortcut("CUSTOM_PERCENTAGE", 50, 50);
  if (settings.commissionOwnershipMode === "BY_CYCLES") return shortcut("CYCLE_BASED", 0, 0);
  return null;
}

export interface ReplacementHolderInput {
  memberIds: (string | undefined)[];
  /** First cycle the replacement(s) own the ticket from. */
  effectiveCycleNumber: number;
  totalCycles: number;
  shareUnits: number;
}

/**
 * Every membership that has held the slot (the one leaving and any earlier holders, so repeated
 * replacements are handled) plus the incoming holder(s), with their owned cycles and what they paid in.
 */
export async function loadAllocationHolders(
  tenantId: string,
  chitGroupId: string,
  leaving: ChitMembershipDocument,
  incoming: ReplacementHolderInput,
  numberByCycleId: Map<string, number>,
): Promise<AllocationHolder[]> {
  const slotKey = leaving.subTicket ?? "";
  const holders = (await ChitMembership.find({ tenantId, chitGroupId, ticketNumber: leaving.ticketNumber })).filter(
    (m) => (m.subTicket ?? "") === slotKey,
  );
  const ids = holders.map((m) => m._id as Types.ObjectId);
  const payments = await Payment.find({ tenantId, chitMembershipId: { $in: ids } });

  const previous: AllocationHolder[] = holders.map((m) => {
    const from = m.effectiveFromCycleNumber ?? 1;
    const to = m._id.equals(leaving._id) ? incoming.effectiveCycleNumber - 1 : (m.lastCycleNumber ?? from - 1);
    const contribution = payments
      .filter((p) => p.chitMembershipId.equals(m._id))
      .filter((p) => {
        const n = numberByCycleId.get(p.chitCycleId.toString()) ?? 0;
        return n >= from && n <= to;
      })
      .reduce((s, p) => s + p.amountPaid, 0);
    return {
      role: "PREVIOUS" as const,
      membershipId: m._id.toString(),
      memberId: m.memberId.toString(),
      shareUnits: shareUnitsOf(m),
      eligibleCycles: Math.max(0, to - from + 1),
      eligibleContribution: contribution,
    };
  });

  const replacement: AllocationHolder[] = incoming.memberIds.map((memberId) => ({
    role: "REPLACEMENT" as const,
    membershipId: null,
    memberId: memberId ?? null,
    shareUnits: incoming.shareUnits,
    eligibleCycles: Math.max(0, incoming.totalCycles - incoming.effectiveCycleNumber + 1),
    // Nothing has been paid by the replacement yet, and unpaid or scheduled amounts never count.
    eligibleContribution: 0,
  }));
  return [...previous, ...replacement];
}
