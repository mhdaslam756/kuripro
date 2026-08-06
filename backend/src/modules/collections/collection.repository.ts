import { Types, type ClientSession } from "mongoose";

import { safeObjectId, type ObjectIdLike } from "../../utils/mongoose-helpers.js";
import { buildPaginatedResult, toSkipLimit, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";
import {
  Collection,
  type CollectionDoc,
  type CollectionDocument,
  type CollectionMethod,
  type CollectionStatus,
} from "./collection.model.js";

export type CreateCollectionInput = Omit<
  CollectionDoc,
  | "createdAt"
  | "updatedAt"
  | "tenantId"
  | "chitGroupId"
  | "chitCycleId"
  | "chitMembershipId"
  | "paymentId"
  | "memberId"
  | "collectedBy"
  | "status"
  | "isAdvance"
  | "isOffline"
  | "collectedAt"
> & {
  tenantId: ObjectIdLike;
  chitGroupId: ObjectIdLike;
  chitCycleId: ObjectIdLike;
  chitMembershipId: ObjectIdLike;
  paymentId: ObjectIdLike;
  memberId: ObjectIdLike;
  collectedBy: ObjectIdLike;
  status?: CollectionStatus;
  isAdvance?: boolean;
  isOffline?: boolean;
  collectedAt?: Date;
};

export interface PopulatedMemberRef {
  _id: Types.ObjectId;
  name: string;
  memberCode: string;
  phone: string;
}

export type PopulatedCollection = Omit<CollectionDocument, "memberId"> & { memberId: PopulatedMemberRef };

export interface ListCollectionsFilter {
  tenantId: string;
  chitGroupId?: string;
  memberId?: string;
  method?: CollectionMethod;
  status?: CollectionStatus;
  dateFrom?: Date;
  dateTo?: Date;
}

export async function createCollection(data: CreateCollectionInput, session?: ClientSession): Promise<CollectionDocument> {
  const [collection] = await Collection.create([data], { session });
  if (!collection) throw new Error("Failed to create collection");
  return collection;
}

export async function findCollectionById(id: string, tenantId: string): Promise<CollectionDocument | null> {
  return Collection.findOne({ _id: id, tenantId });
}

export async function findCollectionByReceiptToken(token: string, tenantId: string): Promise<CollectionDocument | null> {
  return Collection.findOne({ receiptToken: token, tenantId });
}

export async function findCollectionByPaymentId(paymentId: string, tenantId: string): Promise<CollectionDocument | null> {
  return Collection.findOne({ paymentId, tenantId }).sort({ createdAt: -1 });
}

export async function findCollectionByClientReceiptId(
  clientReceiptId: string,
  tenantId: string,
): Promise<CollectionDocument | null> {
  return Collection.findOne({ clientReceiptId, tenantId });
}

export async function saveCollection(collection: CollectionDocument, session?: ClientSession): Promise<CollectionDocument> {
  return collection.save({ session });
}

function buildFilter(filter: ListCollectionsFilter): Record<string, unknown> {
  const mongoFilter: Record<string, unknown> = { tenantId: filter.tenantId };
  if (filter.chitGroupId) mongoFilter["chitGroupId"] = filter.chitGroupId;
  if (filter.memberId) mongoFilter["memberId"] = filter.memberId;
  if (filter.method) mongoFilter["method"] = filter.method;
  if (filter.status) mongoFilter["status"] = filter.status;
  if (filter.dateFrom || filter.dateTo) {
    mongoFilter["collectedAt"] = {
      ...(filter.dateFrom ? { $gte: filter.dateFrom } : {}),
      ...(filter.dateTo ? { $lte: filter.dateTo } : {}),
    };
  }
  return mongoFilter;
}

export async function listCollections(
  filter: ListCollectionsFilter,
  query: PaginationQuery,
): Promise<PaginatedResult<PopulatedCollection>> {
  const mongoFilter = buildFilter(filter);
  const { skip, limit } = toSkipLimit(query);

  const [items, total] = await Promise.all([
    Collection.find(mongoFilter)
      .sort({ collectedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate<{ memberId: PopulatedMemberRef }>({
        path: "memberId",
        match: { tenantId: { $exists: true } },
        select: "name memberCode phone",
      }),
    Collection.countDocuments(mongoFilter),
  ]);

  return buildPaginatedResult(items, total, query);
}

export interface CollectionTotals {
  count: number;
  amount: number;
}

/** Sum of COMPLETED + PENDING_CLEARANCE collections (booked money) matching the filter. */
export async function sumCollections(filter: ListCollectionsFilter): Promise<CollectionTotals> {
  const mongoFilter = { ...buildFilter(filter), status: { $in: ["COMPLETED", "PENDING_CLEARANCE"] } };
  const rows = await Collection.aggregate<{ count: number; amount: number }>([
    { $match: normalizeForAggregate(mongoFilter) },
    { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: "$amount" } } },
  ]);
  return rows[0] ? { count: rows[0].count, amount: rows[0].amount } : { count: 0, amount: 0 };
}

/** Aggregation needs real ObjectIds for id fields, not strings. */
function normalizeForAggregate(filter: Record<string, unknown>): Record<string, unknown> {
  const idKeys = ["tenantId", "chitGroupId", "memberId", "chitCycleId", "paymentId"];
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(filter)) {
    if (idKeys.includes(key)) {
      const objId = safeObjectId(val);
      if (objId) out[key] = objId;
    } else {
      out[key] = val;
    }
  }
  return out;
}
