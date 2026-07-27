import { buildPaginatedResult, toSkipLimit, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";
import type { ObjectIdLike } from "../../utils/mongoose-helpers.js";
import { Branch, type BranchDoc, type BranchDocument, type BranchStatus } from "./branch.model.js";

export type CreateBranchInput = Omit<BranchDoc, "createdAt" | "updatedAt" | "tenantId" | "status" | "managerId"> & {
  tenantId: ObjectIdLike;
  status?: BranchStatus;
  managerId?: ObjectIdLike;
};

export interface ListBranchesFilter {
  tenantId: string;
  status?: BranchStatus;
}

export async function createBranch(data: CreateBranchInput): Promise<BranchDocument> {
  return Branch.create(data);
}

export async function findBranchById(id: string, tenantId: string): Promise<BranchDocument | null> {
  return Branch.findOne({ _id: id, tenantId });
}

export async function findBranchByCode(tenantId: string, code: string): Promise<BranchDocument | null> {
  return Branch.findOne({ tenantId, code: code.toUpperCase() });
}

export async function findBranchByCodeOrName(tenantId: string, search: string): Promise<BranchDocument | null> {
  const normalized = search.trim();
  const branch = await Branch.findOne({
    tenantId,
    $or: [
      { code: normalized.toUpperCase() },
      { name: { $regex: `^${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
    ],
  });
  if (branch) return branch;
  return Branch.findOne({ tenantId }).sort({ createdAt: 1 });
}

export async function saveBranch(branch: BranchDocument): Promise<BranchDocument> {
  return branch.save();
}

export async function listBranches(
  filter: ListBranchesFilter,
  query: PaginationQuery,
): Promise<PaginatedResult<BranchDocument>> {
  const mongoFilter = { tenantId: filter.tenantId, ...(filter.status ? { status: filter.status } : {}) };
  const { skip, limit } = toSkipLimit(query);

  const [items, total] = await Promise.all([
    Branch.find(mongoFilter).sort({ name: 1 }).skip(skip).limit(limit),
    Branch.countDocuments(mongoFilter),
  ]);

  return buildPaginatedResult(items, total, query);
}
