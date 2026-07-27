import { Types, type ClientSession } from "mongoose";

import type { ObjectIdLike } from "../../utils/mongoose-helpers.js";
import { buildPaginatedResult, toSkipLimit, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";
import { Payout, type PayoutDoc, type PayoutDocument, type PayoutStatus } from "./payout.model.js";

export type CreatePayoutInput = Omit<
  PayoutDoc,
  "createdAt" | "updatedAt" | "tenantId" | "chitGroupId" | "chitCycleId" | "chitMembershipId" | "memberId" | "amountPaid" | "status"
> & {
  tenantId: ObjectIdLike;
  chitGroupId: ObjectIdLike;
  chitCycleId: ObjectIdLike;
  chitMembershipId: ObjectIdLike;
  memberId: ObjectIdLike;
  amountPaid?: number;
  status?: PayoutStatus;
};

export interface PopulatedPayoutMember {
  _id: Types.ObjectId;
  name: string;
  memberCode: string;
  phone: string;
}
export interface PopulatedPayoutGroup {
  _id: Types.ObjectId;
  name: string;
}
export type PopulatedPayout = Omit<PayoutDocument, "memberId" | "chitGroupId"> & {
  memberId: PopulatedPayoutMember;
  chitGroupId: PopulatedPayoutGroup;
};

export interface ListPayoutsFilter {
  tenantId: string;
  chitGroupId?: string;
  memberId?: string;
  status?: PayoutStatus;
}

export async function createPayout(data: CreatePayoutInput, session?: ClientSession): Promise<PayoutDocument> {
  const [payout] = await Payout.create([data], { session });
  if (!payout) throw new Error("Failed to create payout");
  return payout;
}

export async function findPayoutByCycle(tenantId: string, chitCycleId: string): Promise<PayoutDocument | null> {
  return Payout.findOne({ tenantId, chitCycleId });
}

export async function findPayoutById(id: string, tenantId: string): Promise<PayoutDocument | null> {
  return Payout.findOne({ _id: id, tenantId });
}

export async function savePayout(payout: PayoutDocument, session?: ClientSession): Promise<PayoutDocument> {
  return payout.save({ session });
}

/** Model-level delete (keeps the tenant filter so the tenant-scope guard is satisfied). Used by auction re-pick. */
export async function deletePayoutByCycle(tenantId: string, chitCycleId: string, session?: ClientSession): Promise<void> {
  await Payout.deleteOne({ tenantId, chitCycleId }, { session });
}

export async function listPayouts(
  filter: ListPayoutsFilter,
  query: PaginationQuery,
): Promise<PaginatedResult<PopulatedPayout>> {
  const mongoFilter: Record<string, unknown> = { tenantId: filter.tenantId };
  if (filter.chitGroupId) mongoFilter["chitGroupId"] = filter.chitGroupId;
  if (filter.memberId) mongoFilter["memberId"] = filter.memberId;
  if (filter.status) mongoFilter["status"] = filter.status;
  const { skip, limit } = toSkipLimit(query);

  const [items, total] = await Promise.all([
    Payout.find(mongoFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate<{ memberId: PopulatedPayoutMember }>({
        path: "memberId",
        match: { tenantId: { $exists: true } },
        select: "name memberCode phone",
      })
      .populate<{ chitGroupId: PopulatedPayoutGroup }>({
        path: "chitGroupId",
        match: { tenantId: { $exists: true } },
        select: "name",
      }),
    Payout.countDocuments(mongoFilter),
  ]);

  return buildPaginatedResult(items as unknown as PopulatedPayout[], total, query);
}

/** Read-side only, for the Member module's Prize History. */
export async function listPayoutsByCycleIds(tenantId: string, chitCycleIds: string[]): Promise<PayoutDocument[]> {
  if (chitCycleIds.length === 0) return [];
  return Payout.find({ tenantId, chitCycleId: { $in: chitCycleIds } });
}

/** Sum of disbursed prize money matching the filter (for the group summary report later). */
export async function sumDisbursedPayouts(tenantId: string, chitGroupId: string): Promise<number> {
  const rows = await Payout.aggregate<{ total: number }>([
    { $match: { tenantId: new Types.ObjectId(tenantId), chitGroupId: new Types.ObjectId(chitGroupId) } },
    { $group: { _id: null, total: { $sum: "$amountPaid" } } },
  ]);
  return rows[0]?.total ?? 0;
}
