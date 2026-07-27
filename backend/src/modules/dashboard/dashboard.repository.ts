import { Types } from "mongoose";

import { ChitCycle } from "../chit-cycles/chit-cycle.model.js";
import { ChitGroup } from "../chit-groups/chit-group.model.js";
import { Collection } from "../collections/collection.model.js";
import { FinanceEntry } from "../finance/finance-entry.model.js";
import { Member } from "../members/member.model.js";
import { Payment } from "../payments/payment.model.js";
import { PayoutDisbursement } from "../payouts/payout-disbursement.model.js";

/**
 * Read-only dashboard repository. Like the reports repository, the dashboard intentionally spans many
 * collections, so all of its aggregation lives here in one place. It never writes; every query is
 * tenant-scoped via the passed tenantId (satisfying the tenant-scope guard) and returns plain shapes
 * the service composes into DTOs. Monthly series come back sparse (only months with data) — the
 * service zero-fills the full window.
 */

function oid(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}

const BOOKED_COLLECTION_STATUSES = ["COMPLETED", "PENDING_CLEARANCE"] as const;
const OPEN_PAYMENT_STATUSES = ["PENDING", "PARTIAL", "OVERDUE"] as const;
const OPEN_CYCLE_STATUSES = ["SCHEDULED", "BIDDING_OPEN"] as const;

export interface MonthPoint {
  month: string; // YYYY-MM
  [key: string]: string | number;
}

// --- Headline counts ---

export async function countActiveMembers(tenantId: string): Promise<number> {
  return Member.countDocuments({ tenantId, status: "ACTIVE" });
}

export async function countActiveGroups(tenantId: string): Promise<number> {
  return ChitGroup.countDocuments({ tenantId, status: "ACTIVE" });
}

export interface TotalCount {
  total: number;
  count: number;
}

/** Booked collections in a window (used for "today" and month-to-date). */
export async function collectionsBetween(tenantId: string, from: Date, to: Date): Promise<TotalCount> {
  const [row] = await Collection.aggregate<{ total: number; count: number }>([
    { $match: { tenantId: oid(tenantId), status: { $in: BOOKED_COLLECTION_STATUSES }, collectedAt: { $gte: from, $lte: to } } },
    { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
  ]);
  return { total: row?.total ?? 0, count: row?.count ?? 0 };
}

export interface PendingSummary {
  pendingCount: number;
  pendingAmount: number;
  overdueCount: number;
  overdueAmount: number;
}

/** Outstanding installments — everything not yet fully paid or waived, split out by overdue. */
export async function pendingSummary(tenantId: string): Promise<PendingSummary> {
  const rows = await Payment.aggregate<{ _id: boolean; count: number; amount: number }>([
    { $match: { tenantId: oid(tenantId), status: { $in: OPEN_PAYMENT_STATUSES } } },
    {
      $group: {
        _id: { $eq: ["$status", "OVERDUE"] },
        count: { $sum: 1 },
        amount: { $sum: { $subtract: ["$amountDue", "$amountPaid"] } },
      },
    },
  ]);
  const summary: PendingSummary = { pendingCount: 0, pendingAmount: 0, overdueCount: 0, overdueAmount: 0 };
  for (const row of rows) {
    summary.pendingCount += row.count;
    summary.pendingAmount += row.amount;
    if (row._id) {
      summary.overdueCount = row.count;
      summary.overdueAmount = row.amount;
    }
  }
  return summary;
}

export interface UpcomingCycleRow {
  cycleId: string;
  chitGroupId: string;
  chitGroupName: string;
  cycleNumber: number;
  scheduledDate: string;
  status: string;
  potAmount: number;
}

/** The next auctions due — scheduled or with bidding already open — soonest first. */
export async function upcomingCycles(tenantId: string, limit: number): Promise<UpcomingCycleRow[]> {
  const rows = await ChitCycle.aggregate<{
    _id: Types.ObjectId;
    chitGroupId: Types.ObjectId;
    cycleNumber: number;
    scheduledDate: Date;
    status: string;
    group: { name: string; chitValue: number }[];
  }>([
    { $match: { tenantId: oid(tenantId), status: { $in: OPEN_CYCLE_STATUSES } } },
    { $sort: { scheduledDate: 1 } },
    { $limit: limit },
    { $lookup: { from: "chitgroups", localField: "chitGroupId", foreignField: "_id", as: "group" } },
  ]);
  return rows.map((r) => ({
    cycleId: r._id.toString(),
    chitGroupId: r.chitGroupId.toString(),
    chitGroupName: r.group[0]?.name ?? "—",
    cycleNumber: r.cycleNumber,
    scheduledDate: r.scheduledDate.toISOString(),
    status: r.status,
    potAmount: r.group[0]?.chitValue ?? 0,
  }));
}

// --- Monthly trend series (from a start date to now) ---

export async function monthlyCollections(tenantId: string, from: Date): Promise<MonthPoint[]> {
  const rows = await Collection.aggregate<{ _id: string; total: number; count: number }>([
    { $match: { tenantId: oid(tenantId), status: { $in: BOOKED_COLLECTION_STATUSES }, collectedAt: { $gte: from } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$collectedAt" } }, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((r) => ({ month: r._id, total: r.total, count: r.count }));
}

export async function monthlyNewMembers(tenantId: string, from: Date): Promise<MonthPoint[]> {
  const rows = await Member.aggregate<{ _id: string; count: number }>([
    { $match: { tenantId: oid(tenantId), createdAt: { $gte: from } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((r) => ({ month: r._id, count: r.count }));
}

export async function monthlyAuctions(tenantId: string, from: Date): Promise<MonthPoint[]> {
  const rows = await ChitCycle.aggregate<{ _id: string; prize: number; commission: number; count: number }>([
    { $match: { tenantId: oid(tenantId), status: "SETTLED", settledAt: { $gte: from } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$settledAt" } },
        prize: { $sum: { $ifNull: ["$prizeAmount", 0] } },
        commission: { $sum: { $ifNull: ["$commissionAmount", 0] } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((r) => ({ month: r._id, prize: r.prize, commission: r.commission, count: r.count }));
}

export interface FinanceMonthPoint {
  month: string;
  income: number;
  expense: number;
}

/** Income/expense from manual finance entries (misc income + operating costs). */
export async function monthlyFinance(tenantId: string, from: Date): Promise<FinanceMonthPoint[]> {
  const rows = await FinanceEntry.aggregate<{ _id: { month: string; type: string }; amount: number }>([
    { $match: { tenantId: oid(tenantId), date: { $gte: from } } },
    { $group: { _id: { month: { $dateToString: { format: "%Y-%m", date: "$date" } }, type: "$type" }, amount: { $sum: "$amount" } } },
  ]);
  const byMonth = new Map<string, FinanceMonthPoint>();
  for (const row of rows) {
    const point = byMonth.get(row._id.month) ?? { month: row._id.month, income: 0, expense: 0 };
    if (row._id.type === "INCOME") point.income += row.amount;
    else point.expense += row.amount;
    byMonth.set(row._id.month, point);
  }
  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
}

/** Prize money paid out per month — an outflow for cash-flow. */
export async function monthlyDisbursements(tenantId: string, from: Date): Promise<MonthPoint[]> {
  const rows = await PayoutDisbursement.aggregate<{ _id: string; total: number }>([
    { $match: { tenantId: oid(tenantId), disbursedAt: { $gte: from } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$disbursedAt" } }, total: { $sum: "$amount" } } },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((r) => ({ month: r._id, total: r.total }));
}

// --- Category breakdowns (this window) ---

export interface CategoryTotal {
  category: string;
  total: number;
}

export async function financeByType(tenantId: string, type: "INCOME" | "EXPENSE", from: Date): Promise<CategoryTotal[]> {
  const rows = await FinanceEntry.aggregate<{ _id: string; total: number }>([
    { $match: { tenantId: oid(tenantId), type, date: { $gte: from } } },
    { $group: { _id: "$category", total: { $sum: "$amount" } } },
    { $sort: { total: -1 } },
  ]);
  return rows.map((r) => ({ category: r._id, total: r.total }));
}

/** Total foreman commission booked from settled cycles in the window — the core operating income. */
export async function commissionSince(tenantId: string, from: Date): Promise<number> {
  const [row] = await ChitCycle.aggregate<{ total: number }>([
    { $match: { tenantId: oid(tenantId), status: "SETTLED", settledAt: { $gte: from } } },
    { $group: { _id: null, total: { $sum: { $ifNull: ["$commissionAmount", 0] } } } },
  ]);
  return row?.total ?? 0;
}
