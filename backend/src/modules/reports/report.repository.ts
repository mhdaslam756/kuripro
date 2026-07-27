import { Types } from "mongoose";

import { ChitCycle } from "../chit-cycles/chit-cycle.model.js";
import { ChitGroup } from "../chit-groups/chit-group.model.js";
import { Collection } from "../collections/collection.model.js";
import { FinanceEntry } from "../finance/finance-entry.model.js";
import { Member } from "../members/member.model.js";
import { Payment } from "../payments/payment.model.js";
import { PayoutDisbursement } from "../payouts/payout-disbursement.model.js";

/**
 * Read-only reporting repository. Reports intentionally span many collections, so all report
 * aggregation lives here in one place rather than being scattered across every module's repository.
 * It never writes — every query is tenant-scoped via the passed tenantId (satisfying the
 * tenant-scope guard) and returns plain aggregation shapes the report service composes into DTOs.
 */

function oid(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}

function dateRange(from?: Date, to?: Date): Record<string, Date> | undefined {
  if (!from && !to) return undefined;
  return { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
}

// --- Collections ---

const BOOKED_COLLECTION_STATUSES = ["COMPLETED", "PENDING_CLEARANCE"] as const;

export interface MethodTotal {
  method: string;
  total: number;
  count: number;
}

export async function collectionsByMethod(
  tenantId: string,
  from?: Date,
  to?: Date,
  chitGroupId?: string,
): Promise<MethodTotal[]> {
  const range = dateRange(from, to);
  const rows = await Collection.aggregate<{ _id: string; total: number; count: number }>([
    {
      $match: {
        tenantId: oid(tenantId),
        status: { $in: BOOKED_COLLECTION_STATUSES },
        ...(range ? { collectedAt: range } : {}),
        ...(chitGroupId ? { chitGroupId: oid(chitGroupId) } : {}),
      },
    },
    { $group: { _id: "$method", total: { $sum: "$amount" }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);
  return rows.map((r) => ({ method: r._id, total: r.total, count: r.count }));
}

export interface DaySeriesPoint {
  day: string;
  total: number;
  count: number;
}

export async function collectionsByDay(tenantId: string, from?: Date, to?: Date, chitGroupId?: string): Promise<DaySeriesPoint[]> {
  const range = dateRange(from, to);
  const rows = await Collection.aggregate<{ _id: string; total: number; count: number }>([
    {
      $match: {
        tenantId: oid(tenantId),
        status: { $in: BOOKED_COLLECTION_STATUSES },
        ...(range ? { collectedAt: range } : {}),
        ...(chitGroupId ? { chitGroupId: oid(chitGroupId) } : {}),
      },
    },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$collectedAt" } }, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((r) => ({ day: r._id, total: r.total, count: r.count }));
}

export interface CollectionRow {
  receiptNumber: string;
  memberName: string;
  memberCode: string;
  amount: number;
  method: string;
  status: string;
  collectedAt: Date;
}

export async function collectionRows(tenantId: string, from?: Date, to?: Date, chitGroupId?: string, cap = 5000): Promise<CollectionRow[]> {
  const range = dateRange(from, to);
  const docs = await Collection.find({
    tenantId,
    ...(range ? { collectedAt: range } : {}),
    ...(chitGroupId ? { chitGroupId } : {}),
  })
    .sort({ collectedAt: -1 })
    .limit(cap)
    .populate<{ memberId: { name: string; memberCode: string } }>("memberId", "name memberCode");
  return docs.map((d) => ({
    receiptNumber: d.receiptNumber,
    memberName: d.memberId?.name ?? "Unknown",
    memberCode: d.memberId?.memberCode ?? "",
    amount: d.amount,
    method: d.method,
    status: d.status,
    collectedAt: d.collectedAt,
  }));
}

// --- Defaulters (overdue installments grouped by member) ---

export interface DefaulterRow {
  memberName: string;
  memberCode: string;
  phone: string;
  chitGroupName: string;
  overdueCount: number;
  overdueAmount: number;
  oldestDueDate: Date;
}

export async function defaulters(tenantId: string, chitGroupId?: string): Promise<DefaulterRow[]> {
  return Payment.aggregate<DefaulterRow>([
    {
      $match: {
        tenantId: oid(tenantId),
        status: "OVERDUE",
        ...(chitGroupId ? { chitGroupId: oid(chitGroupId) } : {}),
      },
    },
    {
      $group: {
        _id: { membershipId: "$chitMembershipId", chitGroupId: "$chitGroupId" },
        overdueCount: { $sum: 1 },
        overdueAmount: { $sum: { $subtract: ["$amountDue", "$amountPaid"] } },
        oldestDueDate: { $min: "$dueDate" },
      },
    },
    { $lookup: { from: "chitmemberships", localField: "_id.membershipId", foreignField: "_id", as: "membership" } },
    { $unwind: "$membership" },
    { $lookup: { from: "members", localField: "membership.memberId", foreignField: "_id", as: "member" } },
    { $unwind: "$member" },
    { $lookup: { from: "chitgroups", localField: "_id.chitGroupId", foreignField: "_id", as: "group" } },
    { $unwind: "$group" },
    {
      $project: {
        _id: 0,
        memberName: "$member.name",
        memberCode: "$member.memberCode",
        phone: "$member.phone",
        chitGroupName: "$group.name",
        overdueCount: 1,
        overdueAmount: 1,
        oldestDueDate: 1,
      },
    },
    { $sort: { overdueAmount: -1 } },
  ]);
}

// --- Members ---

export interface MemberStats {
  total: number;
  byStatus: { key: string; count: number }[];
  byKyc: { key: string; count: number }[];
  byRisk: { key: string; count: number }[];
  newInRange: number;
}

async function groupCount(tenantId: string, field: string): Promise<{ key: string; count: number }[]> {
  const rows = await Member.aggregate<{ _id: string | null; count: number }>([
    { $match: { tenantId: oid(tenantId) } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return rows.map((r) => ({ key: r._id ?? "NONE", count: r.count }));
}

export async function memberStats(tenantId: string, from?: Date, to?: Date): Promise<MemberStats> {
  const range = dateRange(from, to);
  const [total, byStatus, byKyc, byRisk, newInRange] = await Promise.all([
    Member.countDocuments({ tenantId }),
    groupCount(tenantId, "status"),
    groupCount(tenantId, "kyc.status"),
    groupCount(tenantId, "riskScore.band"),
    range ? Member.countDocuments({ tenantId, createdAt: range }) : Member.countDocuments({ tenantId }),
  ]);
  return { total, byStatus, byKyc, byRisk, newInRange };
}

// --- Auctions (settled cycles) ---

export interface SettledCycleRow {
  chitGroupName: string;
  cycleNumber: number;
  winnerName: string;
  prizeAmount: number;
  discountAmount: number;
  commissionAmount: number;
  dividendPerMember: number;
  settledAt?: Date;
}

export async function settledCycles(tenantId: string, from?: Date, to?: Date, chitGroupId?: string): Promise<SettledCycleRow[]> {
  const range = dateRange(from, to);
  return ChitCycle.aggregate<SettledCycleRow>([
    {
      $match: {
        tenantId: oid(tenantId),
        status: "SETTLED",
        ...(range ? { settledAt: range } : {}),
        ...(chitGroupId ? { chitGroupId: oid(chitGroupId) } : {}),
      },
    },
    { $lookup: { from: "chitgroups", localField: "chitGroupId", foreignField: "_id", as: "group" } },
    { $unwind: "$group" },
    { $lookup: { from: "chitmemberships", localField: "winnerMembershipId", foreignField: "_id", as: "winner" } },
    { $unwind: { path: "$winner", preserveNullAndEmptyArrays: true } },
    { $lookup: { from: "members", localField: "winner.memberId", foreignField: "_id", as: "winnerMember" } },
    { $unwind: { path: "$winnerMember", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        chitGroupName: "$group.name",
        cycleNumber: 1,
        winnerName: { $ifNull: ["$winnerMember.name", "—"] },
        prizeAmount: { $ifNull: ["$prizeAmount", 0] },
        discountAmount: { $ifNull: ["$discountAmount", 0] },
        commissionAmount: { $ifNull: ["$commissionAmount", 0] },
        dividendPerMember: { $ifNull: ["$dividendPerMember", 0] },
        settledAt: 1,
      },
    },
    { $sort: { settledAt: -1 } },
  ]);
}

/** Total foreman commission from cycles settled in the range — the chit business's core income. */
export async function commissionIncome(tenantId: string, from?: Date, to?: Date): Promise<number> {
  const range = dateRange(from, to);
  const rows = await ChitCycle.aggregate<{ total: number }>([
    { $match: { tenantId: oid(tenantId), status: "SETTLED", ...(range ? { settledAt: range } : {}) } },
    { $group: { _id: null, total: { $sum: { $ifNull: ["$commissionAmount", 0] } } } },
  ]);
  return rows[0]?.total ?? 0;
}

// --- Payout disbursements ---

export interface DisbursementRow {
  receiptNumber: string;
  memberName: string;
  chitGroupName: string;
  amount: number;
  method: string;
  disbursedAt: Date;
}

export async function disbursementRows(tenantId: string, from?: Date, to?: Date, cap = 5000): Promise<DisbursementRow[]> {
  const range = dateRange(from, to);
  const docs = await PayoutDisbursement.find({ tenantId, ...(range ? { disbursedAt: range } : {}) })
    .sort({ disbursedAt: -1 })
    .limit(cap)
    .populate<{ memberId: { name: string } }>("memberId", "name")
    .populate<{ chitGroupId: { name: string } }>("chitGroupId", "name");
  return docs.map((d) => ({
    receiptNumber: d.receiptNumber,
    memberName: (d.memberId as unknown as { name?: string })?.name ?? "Unknown",
    chitGroupName: (d.chitGroupId as unknown as { name?: string })?.name ?? "Unknown",
    amount: d.amount,
    method: d.method,
    disbursedAt: d.disbursedAt,
  }));
}

export async function disbursementsByMethod(tenantId: string, from?: Date, to?: Date): Promise<MethodTotal[]> {
  const range = dateRange(from, to);
  const rows = await PayoutDisbursement.aggregate<{ _id: string; total: number; count: number }>([
    { $match: { tenantId: oid(tenantId), ...(range ? { disbursedAt: range } : {}) } },
    { $group: { _id: "$method", total: { $sum: "$amount" }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);
  return rows.map((r) => ({ method: r._id, total: r.total, count: r.count }));
}

// --- Finance entries (income / expense) ---

export interface FinanceRow {
  date: Date;
  type: string;
  category: string;
  channel: string;
  amount: number;
  description?: string;
}

export async function financeRows(
  tenantId: string,
  opts: { type?: "INCOME" | "EXPENSE"; channel?: "CASH" | "BANK"; from?: Date; to?: Date },
  cap = 20000,
): Promise<FinanceRow[]> {
  const range = dateRange(opts.from, opts.to);
  const docs = await FinanceEntry.find({
    tenantId,
    ...(opts.type ? { type: opts.type } : {}),
    ...(opts.channel ? { channel: opts.channel } : {}),
    ...(range ? { date: range } : {}),
  })
    .sort({ date: 1 })
    .limit(cap);
  return docs.map((d) => ({
    date: d.date,
    type: d.type,
    category: d.category,
    channel: d.channel,
    amount: d.amount,
    description: d.description,
  }));
}

export interface CategoryTotalRow {
  category: string;
  total: number;
  count: number;
}

export async function financeByCategory(
  tenantId: string,
  type: "INCOME" | "EXPENSE",
  from?: Date,
  to?: Date,
): Promise<CategoryTotalRow[]> {
  const range = dateRange(from, to);
  const rows = await FinanceEntry.aggregate<{ _id: string; total: number; count: number }>([
    { $match: { tenantId: oid(tenantId), type, ...(range ? { date: range } : {}) } },
    { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);
  return rows.map((r) => ({ category: r._id, total: r.total, count: r.count }));
}

// --- Cashbook / Bank movement components ---

export interface MovementRow {
  date: Date;
  particulars: string;
  reference: string;
  inflow: number;
  outflow: number;
}

/** Cash (channel CASH / method CASH) inflows and outflows across collections, disbursements and finance entries. */
export async function cashMovements(tenantId: string, from?: Date, to?: Date): Promise<MovementRow[]> {
  return channelMovements(tenantId, "CASH", from, to);
}

export async function bankMovements(tenantId: string, from?: Date, to?: Date): Promise<MovementRow[]> {
  return channelMovements(tenantId, "BANK", from, to);
}

async function channelMovements(tenantId: string, channel: "CASH" | "BANK", from?: Date, to?: Date): Promise<MovementRow[]> {
  const range = dateRange(from, to);
  const collectionMethod = channel === "CASH" ? "CASH" : "BANK_TRANSFER";

  const [collections, disbursements, finance] = await Promise.all([
    Collection.find({
      tenantId,
      method: collectionMethod,
      status: { $in: BOOKED_COLLECTION_STATUSES },
      ...(range ? { collectedAt: range } : {}),
    })
      .sort({ collectedAt: 1 })
      .limit(20000)
      .populate<{ memberId: { name: string } }>("memberId", "name"),
    PayoutDisbursement.find({ tenantId, method: collectionMethod, ...(range ? { disbursedAt: range } : {}) })
      .sort({ disbursedAt: 1 })
      .limit(20000)
      .populate<{ memberId: { name: string } }>("memberId", "name"),
    FinanceEntry.find({ tenantId, channel, ...(range ? { date: range } : {}) }).sort({ date: 1 }).limit(20000),
  ]);

  const rows: MovementRow[] = [];
  for (const c of collections) {
    rows.push({
      date: c.collectedAt,
      particulars: `Collection · ${(c.memberId as unknown as { name?: string })?.name ?? "member"}`,
      reference: c.receiptNumber,
      inflow: c.amount,
      outflow: 0,
    });
  }
  for (const d of disbursements) {
    rows.push({
      date: d.disbursedAt,
      particulars: `Prize payout · ${(d.memberId as unknown as { name?: string })?.name ?? "member"}`,
      reference: d.receiptNumber,
      inflow: 0,
      outflow: d.amount,
    });
  }
  for (const f of finance) {
    rows.push({
      date: f.date,
      particulars: `${f.type === "INCOME" ? "Income" : "Expense"} · ${f.category}`,
      reference: f.description ?? "",
      inflow: f.type === "INCOME" ? f.amount : 0,
      outflow: f.type === "EXPENSE" ? f.amount : 0,
    });
  }
  rows.sort((a, b) => a.date.getTime() - b.date.getTime());
  return rows;
}

// --- Group name helper for report headers ---

export async function chitGroupName(tenantId: string, chitGroupId: string): Promise<string | null> {
  const group = await ChitGroup.findOne({ _id: chitGroupId, tenantId }).select("name");
  return group?.name ?? null;
}
