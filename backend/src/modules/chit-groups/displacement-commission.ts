import type { DisplacementCommissionSettings } from "../tenants/tenant.model.js";

/**
 * Displacement commission allocation: how the commission a ticket generates is divided between every
 * member who has held it. Pure and integer-only (paise); proportional maths uses BigInt so large
 * amounts can't lose precision, and a largest-remainder pass guarantees the parts add up exactly.
 */

export type HolderRole = "PREVIOUS" | "REPLACEMENT";

export interface AllocationHolder {
  role: HolderRole;
  membershipId?: string | null;
  memberId?: string | null;
  /** 2 for a full ticket, 1 for a half — so a full ticket handed to two halves keeps the same total weight. */
  shareUnits: number;
  /** Cycles this holder owned the ticket for. */
  eligibleCycles: number;
  /** Paise actually received from this holder within their ownership period. */
  eligibleContribution: number;
}

export interface HolderAllocation extends AllocationHolder {
  amount: number;
  /** Share of the total commission in basis points (1% = 100), rounded down. */
  percentageBps: number;
}

export interface DisplacementAllocation {
  mode: DisplacementCommissionSettings["displacementCommissionMode"];
  total: number;
  holders: HolderAllocation[];
  previousMemberShare: number;
  replacementMemberShare: number;
  /** Commission kept by the organisation under the remaining-commission policy. */
  organizationShare: number;
  /** Commission the chosen method left unassigned, before the remaining-commission policy was applied. */
  remainingCommission: number;
  blockedReason: string | null;
}

export function percentToBps(percent: number): number {
  return Math.round(percent * 100);
}

/** Splits `total` by integer `weights`, exactly, using largest remainder. Null when every weight is zero. */
export function allocateProportional(total: number, weights: number[]): number[] | null {
  const sum = weights.reduce((s, w) => s + BigInt(w), 0n);
  if (sum === 0n) return null;
  const t = BigInt(total);
  const floors = weights.map((w) => (t * BigInt(w)) / sum);
  const rems = weights.map((w) => (t * BigInt(w)) % sum);
  let leftover = Number(t - floors.reduce((s, f) => s + f, 0n));
  const order = weights.map((_, i) => i).sort((a, b) => (rems[a]! === rems[b]! ? a - b : rems[a]! > rems[b]! ? -1 : 1));
  const out = floors.map(Number);
  for (const i of order) {
    if (leftover <= 0) break;
    if (weights[i]! > 0) {
      out[i]! += 1;
      leftover -= 1;
    }
  }
  return out;
}

export function computeDisplacementAllocation(
  cfg: DisplacementCommissionSettings,
  total: number,
  holders: AllocationHolder[],
): DisplacementAllocation {
  const amounts = holders.map(() => 0);
  let remaining = total;
  let blockedReason: string | null = null;

  const cycleWeight = (h: AllocationHolder) => h.eligibleCycles * h.shareUnits;

  /** Divides a group's amount among its holders by owned cycles (equal when nobody has any). */
  const distributeGroup = (role: HolderRole, amount: number): boolean => {
    const idx = holders.map((h, i) => (h.role === role ? i : -1)).filter((i) => i >= 0);
    if (idx.length === 0 || amount === 0) return idx.length > 0;
    let weights = idx.map((i) => cycleWeight(holders[i]!));
    if (weights.every((w) => w === 0)) weights = idx.map((i) => holders[i]!.shareUnits || 1);
    const parts = allocateProportional(amount, weights)!;
    idx.forEach((holderIndex, k) => {
      amounts[holderIndex]! += parts[k]!;
    });
    return true;
  };

  if (total > 0) {
    switch (cfg.displacementCommissionMode) {
      case "CYCLE_BASED":
      case "CONTRIBUTION_BASED": {
        const weights = holders.map((h) => (cfg.displacementCommissionMode === "CYCLE_BASED" ? cycleWeight(h) : h.eligibleContribution));
        const parts = allocateProportional(total, weights);
        if (parts) {
          parts.forEach((p, i) => (amounts[i] = p));
          remaining = 0;
        }
        break;
      }
      case "CUSTOM_PERCENTAGE": {
        const prev = percentToBps(cfg.previousMemberPercentage);
        const repl = percentToBps(cfg.replacementMemberPercentage);
        if (prev < 0 || repl < 0 || prev + repl !== 10000) {
          blockedReason = "Previous and replacement percentages must add up to exactly 100%";
          break;
        }
        const [prevAmount, replAmount] = allocateProportional(total, [prev, repl])!;
        distributeGroup("PREVIOUS", prevAmount!);
        distributeGroup("REPLACEMENT", replAmount!);
        remaining = 0;
        break;
      }
      case "FIXED_AMOUNT": {
        const fixed = cfg.previousMemberFixedAmount + cfg.replacementMemberFixedAmount;
        if (fixed > total) {
          blockedReason = "The fixed commission amounts add up to more than the commission available";
          break;
        }
        distributeGroup("PREVIOUS", cfg.previousMemberFixedAmount);
        distributeGroup("REPLACEMENT", cfg.replacementMemberFixedAmount);
        remaining = total - fixed;
        break;
      }
    }
  }

  const remainingCommission = blockedReason ? 0 : remaining;
  let organizationShare = 0;
  if (remainingCommission > 0) {
    if (cfg.remainingCommissionPolicy === "PREVIOUS_MEMBER") distributeGroup("PREVIOUS", remainingCommission);
    else if (cfg.remainingCommissionPolicy === "REPLACEMENT_MEMBER") distributeGroup("REPLACEMENT", remainingCommission);
    else organizationShare = remainingCommission;
  }

  const sumRole = (role: HolderRole) => holders.reduce((s, h, i) => s + (h.role === role ? amounts[i]! : 0), 0);
  return {
    mode: cfg.displacementCommissionMode,
    total,
    holders: holders.map((h, i) => ({
      ...h,
      amount: amounts[i]!,
      percentageBps: total > 0 ? Number((BigInt(amounts[i]!) * 10000n) / BigInt(total)) : 0,
    })),
    previousMemberShare: sumRole("PREVIOUS"),
    replacementMemberShare: sumRole("REPLACEMENT"),
    organizationShare,
    remainingCommission,
    blockedReason,
  };
}
