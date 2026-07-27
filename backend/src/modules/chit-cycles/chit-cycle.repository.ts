import type { ClientSession } from "mongoose";

import { buildPaginatedResult, toSkipLimit, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";
import type { ObjectIdLike } from "../../utils/mongoose-helpers.js";
import { ChitCycle, type ChitCycleDoc, type ChitCycleDocument } from "./chit-cycle.model.js";

export type CreateChitCycleData = Omit<ChitCycleDoc, "createdAt" | "updatedAt" | "tenantId" | "chitGroupId"> & {
  tenantId: ObjectIdLike;
  chitGroupId: ObjectIdLike;
};

export interface ChitCycleScope {
  tenantId: string;
  chitGroupId: string;
}

export async function insertChitCycles(
  cycles: CreateChitCycleData[],
  session?: ClientSession,
): Promise<ChitCycleDocument[]> {
  return ChitCycle.insertMany(cycles, { session });
}

export async function findChitCycleById(id: string, tenantId: string): Promise<ChitCycleDocument | null> {
  return ChitCycle.findOne({ _id: id, tenantId });
}

export async function listChitCyclesByIds(tenantId: string, ids: string[]): Promise<ChitCycleDocument[]> {
  if (ids.length === 0) return [];
  return ChitCycle.find({ tenantId, _id: { $in: ids } });
}

export async function findChitCycleByNumber(
  tenantId: string,
  chitGroupId: string,
  cycleNumber: number,
): Promise<ChitCycleDocument | null> {
  return ChitCycle.findOne({ tenantId, chitGroupId, cycleNumber });
}

export async function saveChitCycle(cycle: ChitCycleDocument, session?: ClientSession): Promise<ChitCycleDocument> {
  return cycle.save({ session });
}

/** True if any cycle numbered *after* `cycleNumber` in this group is already SETTLED. */
export async function hasSettledCycleAfter(
  tenantId: string,
  chitGroupId: string,
  cycleNumber: number,
): Promise<boolean> {
  const later = await ChitCycle.exists({
    tenantId,
    chitGroupId,
    cycleNumber: { $gt: cycleNumber },
    status: "SETTLED",
  });
  return later !== null;
}

export async function countSettledCycles(tenantId: string, chitGroupId: string): Promise<number> {
  return ChitCycle.countDocuments({ tenantId, chitGroupId, status: "SETTLED" });
}

export async function listChitCycles(
  scope: ChitCycleScope,
  query: PaginationQuery,
): Promise<PaginatedResult<ChitCycleDocument>> {
  const { skip, limit } = toSkipLimit(query);

  const [items, total] = await Promise.all([
    ChitCycle.find(scope).sort({ cycleNumber: 1 }).skip(skip).limit(limit),
    ChitCycle.countDocuments(scope),
  ]);

  return buildPaginatedResult(items, total, query);
}

/** Cycles won by any of the given memberships — the Member module's Prize History. */
export async function listWonCyclesByMembershipIds(
  tenantId: string,
  chitMembershipIds: string[],
): Promise<ChitCycleDocument[]> {
  if (chitMembershipIds.length === 0) return [];
  return ChitCycle.find({ tenantId, winnerMembershipId: { $in: chitMembershipIds } }).sort({ settledAt: -1 });
}
