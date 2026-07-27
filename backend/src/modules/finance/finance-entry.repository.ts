import { Types } from "mongoose";

import type { ObjectIdLike } from "../../utils/mongoose-helpers.js";
import { buildPaginatedResult, toSkipLimit, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";
import {
  FinanceEntry,
  type FinanceChannel,
  type FinanceEntryDoc,
  type FinanceEntryDocument,
  type FinanceEntryType,
} from "./finance-entry.model.js";

export type CreateFinanceEntryInput = Omit<
  FinanceEntryDoc,
  "createdAt" | "updatedAt" | "tenantId" | "createdBy" | "chitGroupId"
> & {
  tenantId: ObjectIdLike;
  createdBy: ObjectIdLike;
  chitGroupId?: ObjectIdLike;
};

export interface FinanceEntryFilter {
  tenantId: string;
  type?: FinanceEntryType;
  channel?: FinanceChannel;
  from?: Date;
  to?: Date;
}

function buildFilter(filter: FinanceEntryFilter): Record<string, unknown> {
  const mongoFilter: Record<string, unknown> = { tenantId: filter.tenantId };
  if (filter.type) mongoFilter["type"] = filter.type;
  if (filter.channel) mongoFilter["channel"] = filter.channel;
  if (filter.from || filter.to) {
    mongoFilter["date"] = { ...(filter.from ? { $gte: filter.from } : {}), ...(filter.to ? { $lte: filter.to } : {}) };
  }
  return mongoFilter;
}

export async function createFinanceEntry(data: CreateFinanceEntryInput): Promise<FinanceEntryDocument> {
  return FinanceEntry.create(data);
}

export async function findFinanceEntryById(id: string, tenantId: string): Promise<FinanceEntryDocument | null> {
  return FinanceEntry.findOne({ _id: id, tenantId });
}

export async function deleteFinanceEntry(id: string, tenantId: string): Promise<boolean> {
  const result = await FinanceEntry.deleteOne({ _id: id, tenantId });
  return result.deletedCount > 0;
}

export async function listFinanceEntries(
  filter: FinanceEntryFilter,
  query: PaginationQuery,
): Promise<PaginatedResult<FinanceEntryDocument>> {
  const mongoFilter = buildFilter(filter);
  const { skip, limit } = toSkipLimit(query);
  const [items, total] = await Promise.all([
    FinanceEntry.find(mongoFilter).sort({ date: -1 }).skip(skip).limit(limit),
    FinanceEntry.countDocuments(mongoFilter),
  ]);
  return buildPaginatedResult(items, total, query);
}

/** All entries matching the filter, unpaginated — for report aggregation. Capped defensively. */
export async function listFinanceEntriesForReport(filter: FinanceEntryFilter, cap = 50_000): Promise<FinanceEntryDocument[]> {
  return FinanceEntry.find(buildFilter(filter)).sort({ date: 1 }).limit(cap);
}

export interface CategoryTotal {
  category: string;
  total: number;
  count: number;
}

/** Totals grouped by category for a given type (INCOME or EXPENSE) within an optional date window. */
export async function sumByCategory(filter: FinanceEntryFilter): Promise<CategoryTotal[]> {
  const match = buildFilter(filter);
  if (typeof match["tenantId"] === "string") match["tenantId"] = new Types.ObjectId(match["tenantId"] as string);
  const rows = await FinanceEntry.aggregate<{ _id: string; total: number; count: number }>([
    { $match: match },
    { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);
  return rows.map((row) => ({ category: row._id, total: row.total, count: row.count }));
}
