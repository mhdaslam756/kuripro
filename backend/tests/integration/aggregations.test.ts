import { Types } from "mongoose";
import { beforeEach, expect, it } from "vitest";

import { Collection } from "../../src/modules/collections/collection.model.js";
import { Payment } from "../../src/modules/payments/payment.model.js";
import { collectionsBetween, monthlyCollections, pendingSummary } from "../../src/modules/dashboard/dashboard.repository.js";
import { describeDb, useTestDb } from "../helpers/db.js";

/**
 * Integration coverage for the money aggregations that feed the dashboard — run against real
 * documents in the in-memory database, so the Mongoose pipelines (and the paise arithmetic inside
 * them) are exercised end to end.
 */
describeDb("dashboard aggregations", () => {
  useTestDb();

  const tenantId = new Types.ObjectId();
  const otherTenant = new Types.ObjectId();

  function payment(fields: Partial<Record<string, unknown>>) {
    return {
      tenantId,
      chitGroupId: new Types.ObjectId(),
      chitCycleId: new Types.ObjectId(),
      chitMembershipId: new Types.ObjectId(),
      amountDue: 100_000,
      amountPaid: 0,
      dueDate: new Date(),
      status: "PENDING",
      ...fields,
    };
  }

  function collection(fields: Partial<Record<string, unknown>>) {
    return {
      tenantId,
      chitGroupId: new Types.ObjectId(),
      chitCycleId: new Types.ObjectId(),
      chitMembershipId: new Types.ObjectId(),
      paymentId: new Types.ObjectId(),
      memberId: new Types.ObjectId(),
      amount: 50_000,
      method: "CASH",
      status: "COMPLETED",
      receiptNumber: `RCP-${Math.random().toString(36).slice(2)}`,
      receiptToken: Math.random().toString(36).slice(2),
      // Unique per doc so the {tenantId, clientReceiptId} unique index doesn't collide on repeated nulls.
      clientReceiptId: `cid-${Math.random().toString(36).slice(2)}`,
      collectedBy: new Types.ObjectId(),
      collectedAt: new Date(),
      ...fields,
    };
  }

  it("pendingSummary sums outstanding (due − paid) and splits out overdue", async () => {
    await Payment.create([
      payment({ amountDue: 100_000, amountPaid: 0, status: "OVERDUE" }),
      payment({ amountDue: 100_000, amountPaid: 40_000, status: "PARTIAL" }),
      payment({ amountDue: 100_000, amountPaid: 0, status: "PENDING" }),
      payment({ amountDue: 100_000, amountPaid: 100_000, status: "PAID" }), // excluded
      payment({ tenantId: otherTenant, amountDue: 999_999, status: "OVERDUE" }), // other tenant, excluded
    ]);

    const summary = await pendingSummary(tenantId.toString());
    expect(summary.pendingCount).toBe(3);
    expect(summary.pendingAmount).toBe(100_000 + 60_000 + 100_000);
    expect(summary.overdueCount).toBe(1);
    expect(summary.overdueAmount).toBe(100_000);
  });

  it("collectionsBetween totals only booked collections in the window", async () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfWindow = new Date(now.getTime() + 60_000); // guard against sub-ms seed timing
    await Collection.create([
      collection({ amount: 50_000, status: "COMPLETED" }),
      collection({ amount: 30_000, status: "PENDING_CLEARANCE" }),
      collection({ amount: 40_000, status: "COMPLETED", collectedAt: new Date(now.getTime() - 40 * 86_400_000) }), // last month
      collection({ tenantId: otherTenant, amount: 77_000, status: "COMPLETED" }), // other tenant
    ]);

    const today = await collectionsBetween(tenantId.toString(), startOfToday, endOfWindow);
    expect(today.count).toBe(2);
    expect(today.total).toBe(80_000);
  });

  it("monthlyCollections buckets booked collections by month", async () => {
    const now = new Date();
    await Collection.create([
      collection({ amount: 50_000 }),
      collection({ amount: 30_000 }),
      collection({ amount: 40_000, collectedAt: new Date(now.getFullYear(), now.getMonth() - 1, 15) }),
    ]);

    const series = await monthlyCollections(tenantId.toString(), new Date(now.getFullYear(), now.getMonth() - 3, 1));
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const thisMonth = series.find((p) => p.month === thisMonthKey);
    expect(thisMonth?.total).toBe(80_000);
    expect(series.reduce((s, p) => s + (p.total as number), 0)).toBe(120_000);
  });

  // Ensure the per-test wipe keeps suites isolated.
  beforeEach(async () => {
    expect(await Payment.countDocuments({ tenantId })).toBe(0);
  });
});
