import { Types, type ClientSession } from "mongoose";

import { safeObjectId, type ObjectIdLike } from "../../utils/mongoose-helpers.js";
import { buildPaginatedResult, toSkipLimit, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";
import { computeInstallmentStatus } from "./installment-status.js";
import { Payment, type PaymentDoc, type PaymentDocument, type PaymentStatus } from "./payment.model.js";

// --- Installment (due) write path, owned by the Collections module ---

export type CreateInstallmentInput = Omit<
  PaymentDoc,
  "createdAt" | "updatedAt" | "tenantId" | "chitGroupId" | "chitCycleId" | "chitMembershipId" | "amountPaid" | "status"
> & {
  tenantId: ObjectIdLike;
  chitGroupId: ObjectIdLike;
  chitCycleId: ObjectIdLike;
  chitMembershipId: ObjectIdLike;
  amountPaid?: number;
  status?: PaymentStatus;
};

export interface PopulatedInstallmentMember {
  _id: Types.ObjectId;
  name: string;
  memberCode: string;
  phone: string;
}

export interface PopulatedInstallmentMembership {
  _id: Types.ObjectId;
  ticketNumber: number;
  memberId: PopulatedInstallmentMember;
}

export type PopulatedInstallment = Omit<PaymentDocument, "chitMembershipId"> & {
  chitMembershipId: PopulatedInstallmentMembership;
};

export interface ListInstallmentsFilter {
  tenantId: string;
  chitGroupId?: string;
  chitCycleId?: string;
  chitMembershipId?: string;
  chitMembershipIds?: string[];
  status?: PaymentStatus;
}

export async function insertInstallments(
  data: CreateInstallmentInput[],
  session?: ClientSession,
): Promise<PaymentDocument[]> {
  if (data.length === 0) return [];
  return Payment.insertMany(data, { session });
}

export async function findInstallmentById(id: string, tenantId: string): Promise<PaymentDocument | null> {
  return Payment.findOne({ _id: id, tenantId });
}

export async function findInstallmentByCycleAndMembership(
  tenantId: string,
  chitCycleId: string,
  chitMembershipId: string,
): Promise<PaymentDocument | null> {
  return Payment.findOne({ tenantId, chitCycleId, chitMembershipId });
}

export async function saveInstallment(payment: PaymentDocument, session?: ClientSession): Promise<PaymentDocument> {
  return payment.save({ session });
}

export async function listMembershipIdsWithInstallment(
  tenantId: string,
  chitCycleId: string,
): Promise<string[]> {
  const rows = await Payment.find({ tenantId, chitCycleId }, { chitMembershipId: 1 }).lean();
  return rows.map((row) => row.chitMembershipId.toString());
}

function buildInstallmentFilter(filter: ListInstallmentsFilter): Record<string, unknown> {
  const mongoFilter: Record<string, unknown> = {};

  const tenantObjId = safeObjectId(filter.tenantId);
  if (tenantObjId) mongoFilter["tenantId"] = tenantObjId;
  else if (filter.tenantId) mongoFilter["tenantId"] = filter.tenantId;

  const groupObjId = safeObjectId(filter.chitGroupId);
  if (groupObjId) mongoFilter["chitGroupId"] = groupObjId;

  const cycleObjId = safeObjectId(filter.chitCycleId);
  if (cycleObjId) mongoFilter["chitCycleId"] = cycleObjId;

  const membershipObjId = safeObjectId(filter.chitMembershipId);
  if (membershipObjId) mongoFilter["chitMembershipId"] = membershipObjId;

  if (filter.chitMembershipIds !== undefined) {
    const validIds = filter.chitMembershipIds.map(safeObjectId).filter((id): id is Types.ObjectId => id !== null);
    mongoFilter["chitMembershipId"] = { $in: validIds };
  }

  if (filter.status) mongoFilter["status"] = filter.status;
  return mongoFilter;
}

export async function listInstallments(
  filter: ListInstallmentsFilter,
  query: PaginationQuery,
): Promise<PaginatedResult<PopulatedInstallment>> {
  const mongoFilter = buildInstallmentFilter(filter);
  const { skip, limit } = toSkipLimit(query);

  const [items, total] = await Promise.all([
    Payment.find(mongoFilter)
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(limit)
      .populate<{ chitMembershipId: PopulatedInstallmentMembership }>({
        path: "chitMembershipId",
        match: { tenantId: { $exists: true } },
        select: "ticketNumber memberId",
        populate: { path: "memberId", match: { tenantId: { $exists: true } }, select: "name memberCode phone" },
      }),
    Payment.countDocuments(mongoFilter),
  ]);

  return buildPaginatedResult(items, total, query);
}

export async function countInstallmentsByStatus(
  tenantId: string,
  chitCycleId: string,
): Promise<Record<PaymentStatus, number>> {
  const rows = await Payment.aggregate<{ _id: PaymentStatus; count: number }>([
    { $match: { tenantId: new Types.ObjectId(tenantId), chitCycleId: new Types.ObjectId(chitCycleId) } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const result = { PENDING: 0, PARTIAL: 0, PAID: 0, OVERDUE: 0, WAIVED: 0 } as Record<PaymentStatus, number>;
  for (const row of rows) result[row._id] = row.count;
  return result;
}

/**
 * Auto Dividend application: reduces a cycle's installments that are still at the base amount by
 * `dividendPerMember` (net installment = base − dividend), then recomputes each status. Only touches
 * installments whose `amountDue` still equals `baseAmount` — so it's a no-op on installments that
 * were already raised net of the dividend (prevents double-application). Returns the count adjusted.
 */
export async function applyDividendToCycleInstallments(
  tenantId: string,
  chitCycleId: string,
  baseAmount: number,
  dividendPerMember: number,
): Promise<number> {
  if (dividendPerMember <= 0) return 0;
  const installments = await Payment.find({ tenantId, chitCycleId }).populate<{
    chitMembershipId: { share?: number; shareType?: string };
  }>("chitMembershipId");
  let count = 0;
  for (const installment of installments) {
    const mem = installment.chitMembershipId as { share?: number; shareType?: string } | null;
    const share = mem?.share ?? (mem?.shareType === "HALF" ? 0.5 : 1);
    const fullExpectedBase = Math.round(baseAmount * share);
    if (installment.amountDue === fullExpectedBase) {
      const netAmount = Math.max(0, Math.round((baseAmount - dividendPerMember) * share));
      installment.amountDue = netAmount;
      installment.status = computeInstallmentStatus(installment.amountPaid, netAmount, installment.dueDate);
      if (installment.status === "PAID" && !installment.paidAt) installment.paidAt = new Date();
      await installment.save();
      count += 1;
    }
  }
  return count;
}

/** Reverses `applyDividendToCycleInstallments` — restores installments still at the net amount back to base. */
export async function restoreDividendOnCycleInstallments(
  tenantId: string,
  chitCycleId: string,
  baseAmount: number,
  dividendPerMember: number,
): Promise<number> {
  if (dividendPerMember <= 0) return 0;
  const installments = await Payment.find({ tenantId, chitCycleId }).populate<{
    chitMembershipId: { share?: number; shareType?: string };
  }>("chitMembershipId");
  let count = 0;
  for (const installment of installments) {
    const mem = installment.chitMembershipId as { share?: number; shareType?: string } | null;
    const share = mem?.share ?? (mem?.shareType === "HALF" ? 0.5 : 1);
    const netExpected = Math.max(0, Math.round((baseAmount - dividendPerMember) * share));
    const fullBase = Math.round(baseAmount * share);
    if (installment.amountDue === netExpected) {
      installment.amountDue = fullBase;
      installment.status = computeInstallmentStatus(installment.amountPaid, fullBase, installment.dueDate);
      if (installment.status !== "PAID") installment.paidAt = undefined;
      await installment.save();
      count += 1;
    }
  }
  return count;
}

/** Distinct membership ids that currently hold an OVERDUE installment — for reminder audiences. */
export async function distinctOverdueMembershipIds(tenantId: string, chitGroupId?: string): Promise<string[]> {
  const ids = await Payment.distinct("chitMembershipId", {
    tenantId,
    status: "OVERDUE",
    ...(chitGroupId ? { chitGroupId } : {}),
  });
  return ids.map((id) => id.toString());
}

/** Marks past-due, not-fully-paid installments in a group as OVERDUE. Returns the count updated. */
export async function markOverdueInstallments(tenantId: string, chitGroupId: string, asOf: Date): Promise<number> {
  const result = await Payment.updateMany(
    { tenantId, chitGroupId, dueDate: { $lt: asOf }, status: { $in: ["PENDING", "PARTIAL"] } },
    { $set: { status: "OVERDUE" } },
  );
  return result.modifiedCount;
}

/**
 * Read-side only, for the Member module's Payment History and risk-scoring. These pre-date the
 * Collections write path above and are kept as-is.
 */
export async function listPaymentsByMembershipIds(
  tenantId: string,
  chitMembershipIds: string[],
  query: PaginationQuery,
): Promise<PaginatedResult<PaymentDocument>> {
  const filter = { tenantId, chitMembershipId: { $in: chitMembershipIds } };
  const { skip, limit } = toSkipLimit(query);

  const [items, total] = await Promise.all([
    Payment.find(filter).sort({ dueDate: -1 }).skip(skip).limit(limit),
    Payment.countDocuments(filter),
  ]);

  return buildPaginatedResult(items, total, query);
}

export interface PaymentPunctualityStats {
  duePastInstallments: number;
  onTimePaidInstallments: number;
  overdueInstallments: number;
}

export async function getPaymentPunctualityStats(
  tenantId: string,
  chitMembershipIds: string[],
): Promise<PaymentPunctualityStats> {
  if (chitMembershipIds.length === 0) {
    return { duePastInstallments: 0, onTimePaidInstallments: 0, overdueInstallments: 0 };
  }

  const now = new Date();
  const [duePast, onTimePaid, overdue] = await Promise.all([
    Payment.countDocuments({ tenantId, chitMembershipId: { $in: chitMembershipIds }, dueDate: { $lte: now } }),
    Payment.countDocuments({
      tenantId,
      chitMembershipId: { $in: chitMembershipIds },
      status: "PAID",
      $expr: { $lte: ["$paidAt", "$dueDate"] },
    }),
    Payment.countDocuments({ tenantId, chitMembershipId: { $in: chitMembershipIds }, status: "OVERDUE" }),
  ]);

  return { duePastInstallments: duePast, onTimePaidInstallments: onTimePaid, overdueInstallments: overdue };
}
