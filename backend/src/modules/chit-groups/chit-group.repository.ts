import type { ClientSession } from "mongoose";

import { buildPaginatedResult, toSkipLimit, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";
import type { ObjectIdLike } from "../../utils/mongoose-helpers.js";
import { ChitGroup, type ChitGroupDoc, type ChitGroupDocument, type ChitGroupFrequency, type ChitGroupStatus } from "./chit-group.model.js";

export type CreateChitGroupData = Omit<
  ChitGroupDoc,
  "createdAt" | "updatedAt" | "frequency" | "tenantId" | "createdBy" | "documents"
> & {
  tenantId: ObjectIdLike;
  createdBy: ObjectIdLike;
  frequency?: ChitGroupFrequency;
  documents?: ChitGroupDoc["documents"];
};

export interface ListChitGroupsFilter {
  tenantId: string;
  status?: ChitGroupStatus;
}

export async function createChitGroup(data: CreateChitGroupData): Promise<ChitGroupDocument> {
  return ChitGroup.create(data);
}

export async function findChitGroupById(id: string, tenantId: string): Promise<ChitGroupDocument | null> {
  return ChitGroup.findOne({ _id: id, tenantId });
}

export async function saveChitGroup(chitGroup: ChitGroupDocument, session?: ClientSession): Promise<ChitGroupDocument> {
  return chitGroup.save({ session });
}

export async function listChitGroups(
  filter: ListChitGroupsFilter,
  query: PaginationQuery,
): Promise<PaginatedResult<ChitGroupDocument>> {
  const mongoFilter = { tenantId: filter.tenantId, ...(filter.status ? { status: filter.status } : {}) };
  const { skip, limit } = toSkipLimit(query);

  const [items, total] = await Promise.all([
    ChitGroup.find(mongoFilter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ChitGroup.countDocuments(mongoFilter),
  ]);

  return buildPaginatedResult(items, total, query);
}
