import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_REPLACEMENT_SETTINGS,
  allocateCommission,
  allocatePrizeRefund,
  refundRemaining,
  computeReplacementFinancials,
  resolveReplacementSettings,
} from "./replacement-policy.js";

const base = { ...DEFAULT_REPLACEMENT_SETTINGS };

describe("resolveReplacementSettings", () => {
  it("falls back to the defaults for organisations saved before these settings existed", () => {
    assert.deepEqual(resolveReplacementSettings({}), DEFAULT_REPLACEMENT_SETTINGS);
    assert.deepEqual(resolveReplacementSettings(undefined), DEFAULT_REPLACEMENT_SETTINGS);
  });
  it("keeps saved values and fills the gaps", () => {
    const s = resolveReplacementSettings({ memberReplacement: { replacementFeeMode: "FIXED", replacementFeeAmount: 50000 } });
    assert.equal(s.replacementFeeMode, "FIXED");
    assert.equal(s.installmentSettlementMode, "PENDING");
  });
});

describe("allocateCommission", () => {
  it("keeps everything with the chit company by default", () => {
    const { allocation } = allocateCommission(base, 100000);
    assert.deepEqual(allocation, { total: 100000, previousMemberShare: 0, replacementMemberShare: 0, organizationShare: 100000 });
  });
  it("can give everything to the previous member", () => {
    const { allocation } = allocateCommission({ ...base, commissionOwnershipMode: "PREVIOUS_MEMBER" }, 100000);
    assert.deepEqual(allocation, { total: 100000, previousMemberShare: 100000, replacementMemberShare: 0, organizationShare: 0 });
  });
  it("gives everything to the replacement member", () => {
    const { allocation } = allocateCommission({ ...base, commissionOwnershipMode: "REPLACEMENT_MEMBER" }, 100000);
    assert.equal(allocation.previousMemberShare, 0);
    assert.equal(allocation.replacementMemberShare, 100000);
  });
  it("splits a fixed amount to the previous member and the remainder to the replacement, with nothing lost", () => {
    const { allocation, blockedReason } = allocateCommission(
      { ...base, commissionOwnershipMode: "FIXED_AMOUNT", fixedCommissionAmount: 30001 },
      100000,
    );
    assert.equal(blockedReason, null);
    assert.equal(allocation.previousMemberShare, 30001);
    assert.equal(allocation.replacementMemberShare, 69999);
    assert.equal(allocation.previousMemberShare + allocation.replacementMemberShare, allocation.total);
  });
  it("blocks a fixed amount larger than the available commission", () => {
    const { blockedReason } = allocateCommission({ ...base, commissionOwnershipMode: "FIXED_AMOUNT", fixedCommissionAmount: 100001 }, 100000);
    assert.match(blockedReason ?? "", /more than the total commission/);
  });
  it("allows a fixed amount equal to the total", () => {
    const { allocation, blockedReason } = allocateCommission({ ...base, commissionOwnershipMode: "FIXED_AMOUNT", fixedCommissionAmount: 100000 }, 100000);
    assert.equal(blockedReason, null);
    assert.equal(allocation.replacementMemberShare, 0);
  });
});

describe("computeReplacementFinancials fee", () => {
  const common = { ticketCommission: 200000, previousMemberTotalPaid: 1000000, remainingInstalmentsTotal: 3000000 };
  it("charges nothing by default", () => {
    assert.equal(computeReplacementFinancials({ settings: base, ...common }).fee.amount, 0);
  });
  it("charges the fixed fee", () => {
    const f = computeReplacementFinancials({ settings: { ...base, replacementFeeMode: "FIXED", replacementFeeAmount: 50000 }, ...common });
    assert.equal(f.fee.amount, 50000);
  });
  it("applies the percentage to the chosen base", () => {
    const pct = { ...base, replacementFeeMode: "PERCENTAGE" as const, replacementFeePercentage: 10 };
    assert.equal(computeReplacementFinancials({ settings: pct, ...common }).fee.amount, 20000);
    assert.equal(computeReplacementFinancials({ settings: { ...pct, commissionCalculationBase: "REMAINING_INSTALMENTS" }, ...common }).fee.amount, 300000);
    assert.equal(computeReplacementFinancials({ settings: { ...pct, commissionCalculationBase: "PREVIOUS_MEMBER_PAID" }, ...common }).fee.amount, 100000);
  });
  it("rounds a percentage to whole paise", () => {
    const f = computeReplacementFinancials({ settings: { ...base, replacementFeeMode: "PERCENTAGE", replacementFeePercentage: 12.5 }, ...common, ticketCommission: 101 });
    assert.equal(Number.isInteger(f.fee.amount), true);
  });
  it("reports a blocked policy without throwing", () => {
    const f = computeReplacementFinancials({ settings: { ...base, commissionOwnershipMode: "FIXED_AMOUNT", fixedCommissionAmount: 999999999 }, ...common });
    assert.ok(f.blockedReason);
  });
});

describe("allocatePrizeRefund (zero company loss)", () => {
  const sum = (r: ReturnType<typeof allocatePrizeRefund>) => r.refundTotal + r.winnerNet;
  it("pending refund: ₹29,000 prize, ₹14,500 refund → winner ₹14,500", () => {
    const r = allocatePrizeRefund([{ replacementId: "a", entitlement: 1450000 }], 2900000);
    assert.equal(r.refundTotal, 1450000);
    assert.equal(r.winnerNet, 1450000);
    assert.equal(sum(r), 2900000);
  });
  it("a refund paid earlier is still allocated, so the winner never gets the full prize", () => {
    // entitlement is the same whether or not it was paid; paid money is handled by refundRemaining
    const r = allocatePrizeRefund([{ replacementId: "a", entitlement: 1450000 }], 2900000);
    assert.equal(r.winnerNet, 1450000);
    assert.equal(refundRemaining(r.items[0]!.amount, 1450000), 0);
  });
  it("part-paid refund: ₹5,000 paid → ₹9,500 remaining, total cash ₹29,000", () => {
    const r = allocatePrizeRefund([{ replacementId: "a", entitlement: 1450000 }], 2900000);
    const remaining = refundRemaining(r.items[0]!.amount, 500000);
    assert.equal(remaining, 950000);
    assert.equal(500000 + remaining + r.winnerNet, 2900000);
  });
  it("zero refund leaves the whole prize to the winner", () => {
    const r = allocatePrizeRefund([{ replacementId: "a", entitlement: 0 }], 2900000);
    assert.equal(r.items.length, 0);
    assert.equal(r.winnerNet, 2900000);
  });
  it("refund larger than the prize is capped, flagged, and never company-funded", () => {
    const r = allocatePrizeRefund([{ replacementId: "a", entitlement: 5000000 }], 2900000);
    assert.equal(r.refundTotal + r.winnerNet, 2900000);
    assert.equal(r.winnerNet, 1);
    assert.equal(r.shortfall, 5000000 - 2899999);
  });
  it("several replacements of one ticket share the same prize and never exceed it", () => {
    const r = allocatePrizeRefund([{ replacementId: "a", entitlement: 1000000 }, { replacementId: "b", entitlement: 1200000 }], 2900000);
    assert.equal(r.refundTotal, 2200000);
    assert.equal(r.winnerNet, 700000);
    assert.equal(sum(r), 2900000);
  });
  it("never allocates more than the prize, whatever the claims", () => {
    for (const gross of [1, 2, 100, 2900000]) {
      const r = allocatePrizeRefund([{ replacementId: "a", entitlement: 3000000 }, { replacementId: "b", entitlement: 3000000 }], gross);
      assert.ok(r.refundTotal + r.winnerNet <= gross);
      assert.ok(r.winnerNet >= Math.min(1, gross));
    }
  });
  it("remaining refund is never negative", () => assert.equal(refundRemaining(1000, 5000), 0));
});
