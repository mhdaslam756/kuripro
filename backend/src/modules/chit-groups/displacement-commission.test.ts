import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DisplacementCommissionSettings } from "../tenants/tenant.model.js";
import { activeDisplacementPolicy } from "./displacement-commission.service.js";
import { allocateProportional, computeDisplacementAllocation, type AllocationHolder } from "./displacement-commission.js";

const cfg = (over: Partial<DisplacementCommissionSettings>): DisplacementCommissionSettings => ({
  commissionAllocationEnabled: true,
  displacementCommissionMode: "CYCLE_BASED",
  previousMemberPercentage: 50,
  replacementMemberPercentage: 50,
  previousMemberFixedAmount: 0,
  replacementMemberFixedAmount: 0,
  remainingCommissionPolicy: "ORGANIZATION",
  ...over,
});
const holder = (role: "PREVIOUS" | "REPLACEMENT", cycles: number, contribution = 0, shareUnits = 2): AllocationHolder => ({
  role, shareUnits, eligibleCycles: cycles, eligibleContribution: contribution, memberId: role,
});
const sum = (a: { holders: { amount: number }[]; organizationShare: number }) => a.holders.reduce((s, h) => s + h.amount, 0) + a.organizationShare;

describe("allocateProportional", () => {
  it("always adds back to the total (largest remainder)", () => {
    const parts = allocateProportional(100, [1, 1, 1])!;
    assert.deepEqual(parts.slice().sort(), [33, 33, 34]);
    assert.equal(parts.reduce((a, b) => a + b, 0), 100);
  });
  it("is exact for amounts beyond float precision", () => {
    const total = 9_007_199_254_740_991;
    const parts = allocateProportional(total, [3, 7])!;
    assert.equal(parts[0]! + parts[1]!, total);
  });
  it("returns null when every weight is zero", () => assert.equal(allocateProportional(10, [0, 0]), null));
});

describe("cycle-based", () => {
  it("splits 6 of 20 / 14 of 20 as 30% / 70%", () => {
    const r = computeDisplacementAllocation(cfg({}), 100000, [holder("PREVIOUS", 6), holder("REPLACEMENT", 14)]);
    assert.equal(r.previousMemberShare, 30000);
    assert.equal(r.replacementMemberShare, 70000);
    assert.equal(r.holders[0]!.percentageBps, 3000);
  });
  it("gives a member who exits before any eligible cycle nothing", () => {
    const r = computeDisplacementAllocation(cfg({}), 100000, [holder("PREVIOUS", 0), holder("REPLACEMENT", 20)]);
    assert.equal(r.previousMemberShare, 0);
    assert.equal(r.replacementMemberShare, 100000);
  });
  it("handles several sequential replacements", () => {
    const r = computeDisplacementAllocation(cfg({}), 100000, [holder("PREVIOUS", 5), holder("PREVIOUS", 5), holder("REPLACEMENT", 10)]);
    assert.deepEqual(r.holders.map((h) => h.amount), [25000, 25000, 50000]);
    assert.equal(sum(r), 100000);
  });
  it("rounds so nothing is lost", () => {
    const r = computeDisplacementAllocation(cfg({}), 100001, [holder("PREVIOUS", 1), holder("REPLACEMENT", 2)]);
    assert.equal(sum(r), 100001);
  });
  it("weights a full ticket handed to two halves as one ticket", () => {
    const r = computeDisplacementAllocation(cfg({}), 100000, [holder("PREVIOUS", 10, 0, 2), holder("REPLACEMENT", 10, 0, 1), holder("REPLACEMENT", 10, 0, 1)]);
    assert.deepEqual(r.holders.map((h) => h.amount), [50000, 25000, 25000]);
  });
});

describe("contribution-based", () => {
  it("uses money actually paid: 30,000 / 70,000", () => {
    const r = computeDisplacementAllocation(cfg({ displacementCommissionMode: "CONTRIBUTION_BASED" }), 100000, [
      holder("PREVIOUS", 6, 3000000), holder("REPLACEMENT", 14, 7000000),
    ]);
    assert.equal(r.previousMemberShare, 30000);
    assert.equal(r.replacementMemberShare, 70000);
  });
  it("leaves the commission to the remaining-commission policy when nobody has paid", () => {
    const r = computeDisplacementAllocation(cfg({ displacementCommissionMode: "CONTRIBUTION_BASED" }), 5000, [holder("PREVIOUS", 3), holder("REPLACEMENT", 3)]);
    assert.equal(r.remainingCommission, 5000);
    assert.equal(r.organizationShare, 5000);
  });
});

describe("custom percentage", () => {
  it("splits 40 / 60", () => {
    const r = computeDisplacementAllocation(cfg({ displacementCommissionMode: "CUSTOM_PERCENTAGE", previousMemberPercentage: 40, replacementMemberPercentage: 60 }), 100000, [holder("PREVIOUS", 3), holder("REPLACEMENT", 3)]);
    assert.equal(r.previousMemberShare, 40000);
    assert.equal(r.replacementMemberShare, 60000);
  });
  it("blocks percentages that don't total 100", () => {
    const r = computeDisplacementAllocation(cfg({ displacementCommissionMode: "CUSTOM_PERCENTAGE", previousMemberPercentage: 40, replacementMemberPercentage: 50 }), 100000, [holder("PREVIOUS", 3), holder("REPLACEMENT", 3)]);
    assert.match(r.blockedReason ?? "", /100%/);
  });
  it("accepts two-decimal percentages that total 100", () => {
    const r = computeDisplacementAllocation(cfg({ displacementCommissionMode: "CUSTOM_PERCENTAGE", previousMemberPercentage: 33.33, replacementMemberPercentage: 66.67 }), 10000, [holder("PREVIOUS", 3), holder("REPLACEMENT", 3)]);
    assert.equal(r.blockedReason, null);
    assert.equal(sum(r), 10000);
  });
});

describe("fixed amount", () => {
  const fixed = { displacementCommissionMode: "FIXED_AMOUNT" as const, previousMemberFixedAmount: 20000, replacementMemberFixedAmount: 30000 };
  it("applies the amounts and sends the rest to the organisation", () => {
    const r = computeDisplacementAllocation(cfg(fixed), 100000, [holder("PREVIOUS", 3), holder("REPLACEMENT", 3)]);
    assert.equal(r.previousMemberShare, 20000);
    assert.equal(r.replacementMemberShare, 30000);
    assert.equal(r.remainingCommission, 50000);
    assert.equal(r.organizationShare, 50000);
  });
  it("sends the rest to a member when the policy says so", () => {
    const r = computeDisplacementAllocation(cfg({ ...fixed, remainingCommissionPolicy: "REPLACEMENT_MEMBER" }), 100000, [holder("PREVIOUS", 3), holder("REPLACEMENT", 3)]);
    assert.equal(r.replacementMemberShare, 80000);
    assert.equal(r.organizationShare, 0);
  });
  it("blocks fixed amounts larger than the available commission", () => {
    const r = computeDisplacementAllocation(cfg(fixed), 40000, [holder("PREVIOUS", 3), holder("REPLACEMENT", 3)]);
    assert.match(r.blockedReason ?? "", /more than the commission/);
    assert.equal(sum(r), 0);
  });
});

describe("edge cases", () => {
  it("allocates nothing when the commission is zero", () => {
    const r = computeDisplacementAllocation(cfg({}), 0, [holder("PREVIOUS", 3), holder("REPLACEMENT", 3)]);
    assert.equal(sum(r), 0);
    assert.equal(r.blockedReason, null);
  });
});

describe("policy timing (organisation changes)", () => {
  const settings = { displacementCommission: cfg({ effectiveFrom: new Date("2030-01-01") }) } as never;
  it("is not applied before its effective date", () => assert.equal(activeDisplacementPolicy(settings, new Date("2029-12-31")), null));
  it("applies from its effective date", () => assert.ok(activeDisplacementPolicy(settings, new Date("2030-01-01"))));
  it("is off when disabled", () => assert.equal(activeDisplacementPolicy({ displacementCommission: cfg({ commissionAllocationEnabled: false }) } as never), null));
});
