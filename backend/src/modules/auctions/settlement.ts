import { percentageOfPaise } from "../../utils/money.js";

export interface SettlementInput {
  /** Total pot for the cycle in paise (chit value). */
  potAmount: number;
  totalMembers: number;
  foremanCommissionPercent: number;
  /**
   * The winner's forgone amount (paise). For an AUCTION this is the winning bid's discount; for a
   * LOTTERY/MANUAL winner there is no bidding, so it defaults to the foreman commission (the winner
   * forgoes only the commission and there is no dividend).
   */
  winningDiscount: number;
}

export interface SettlementResult {
  /** Paise the winner receives = pot − discount. */
  prizeAmount: number;
  /** Foreman's cut, capped so the dividend can't go negative; absorbs the per-member rounding remainder. */
  commissionAmount: number;
  /** The forgone amount actually applied (== winningDiscount, echoed for storage). */
  discountAmount: number;
  /** Per-member dividend (floored to whole paise). */
  dividendPerMember: number;
  /** Total dividend distributed = dividendPerMember × totalMembers. */
  dividendTotal: number;
}

/**
 * Computes a chit cycle's settlement, exact to the paise. The books always balance:
 *
 *   prize + commission + (dividendPerMember × members) === pot
 *
 * The discount pool (winner's forgone amount minus the foreman commission) is split evenly among all
 * members as dividend; the foreman absorbs the sub-paise-per-member rounding remainder so nothing is
 * lost or created.
 */
export function computeSettlement(input: SettlementInput): SettlementResult {
  const { potAmount, totalMembers, foremanCommissionPercent, winningDiscount } = input;

  const fullCommission = percentageOfPaise(potAmount, foremanCommissionPercent);
  const discountAmount = Math.max(0, Math.min(winningDiscount, potAmount));

  // Commission can't exceed the discount pool, else the dividend would be negative.
  const baseCommission = Math.min(fullCommission, discountAmount);
  const dividendPool = discountAmount - baseCommission;

  const dividendPerMember = Math.floor(dividendPool / totalMembers);
  const distributed = dividendPerMember * totalMembers;
  const roundingRemainder = dividendPool - distributed;

  const commissionAmount = baseCommission + roundingRemainder;
  const prizeAmount = potAmount - discountAmount;

  return {
    prizeAmount,
    commissionAmount,
    discountAmount,
    dividendPerMember,
    dividendTotal: distributed,
  };
}
