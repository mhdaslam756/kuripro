import { describe, expect, it } from "vitest";

import { computeSettlement } from "../../src/modules/auctions/settlement.js";
import { percentageOfPaise } from "../../src/utils/money.js";

/**
 * The settlement engine is the money-critical core of the app. The invariant that must always hold:
 *   prize + commission + (dividendPerMember × members) === pot   (exact to the paise)
 */
describe("computeSettlement", () => {
  const scenarios = [
    { label: "clean divide", pot: 5_000_000, members: 20, commPct: 5, discount: 1_000_000 },
    { label: "rounding remainder (7 members)", pot: 10_000_000, members: 7, commPct: 5, discount: 1_234_567 },
    { label: "discount below commission → dividend floored to 0", pot: 5_000_000, members: 20, commPct: 5, discount: 200_000 },
    { label: "lottery / commission-only", pot: 5_000_000, members: 20, commPct: 5, discount: percentageOfPaise(5_000_000, 5) },
    { label: "zero discount (manual winner, no bids)", pot: 5_000_000, members: 20, commPct: 5, discount: 0 },
    { label: "discount capped at pot", pot: 5_000_000, members: 13, commPct: 4, discount: 9_999_999 },
    { label: "prime pot + odd members", pot: 3_333_337, members: 11, commPct: 7, discount: 987_654 },
  ];

  it.each(scenarios)("balances to the paise — $label", ({ pot, members, commPct, discount }) => {
    const r = computeSettlement({ potAmount: pot, totalMembers: members, foremanCommissionPercent: commPct, winningDiscount: discount });
    expect(r.prizeAmount + r.commissionAmount + r.dividendPerMember * members).toBe(pot);
  });

  it.each(scenarios)("never produces a negative amount — $label", ({ pot, members, commPct, discount }) => {
    const r = computeSettlement({ potAmount: pot, totalMembers: members, foremanCommissionPercent: commPct, winningDiscount: discount });
    expect(r.prizeAmount).toBeGreaterThanOrEqual(0);
    expect(r.commissionAmount).toBeGreaterThanOrEqual(0);
    expect(r.dividendPerMember).toBeGreaterThanOrEqual(0);
    expect(r.dividendTotal).toBe(r.dividendPerMember * members);
  });

  it("prize = pot − discount", () => {
    const r = computeSettlement({ potAmount: 5_000_000, totalMembers: 20, foremanCommissionPercent: 5, winningDiscount: 1_000_000 });
    expect(r.prizeAmount).toBe(4_000_000);
    expect(r.discountAmount).toBe(1_000_000);
  });

  it("caps the discount at the pot and zeroes the prize", () => {
    const r = computeSettlement({ potAmount: 5_000_000, totalMembers: 13, foremanCommissionPercent: 4, winningDiscount: 9_999_999 });
    expect(r.discountAmount).toBe(5_000_000);
    expect(r.prizeAmount).toBe(0);
  });

  it("keeps commission ≥ the plain foreman cut when the discount exceeds it", () => {
    const r = computeSettlement({ potAmount: 5_000_000, totalMembers: 20, foremanCommissionPercent: 5, winningDiscount: 1_000_000 });
    expect(r.commissionAmount).toBeGreaterThanOrEqual(percentageOfPaise(5_000_000, 5));
  });
});
