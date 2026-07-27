import { Types } from "mongoose";

import { findUserByIdInTenant } from "../users/user.repository.js";
import { AppError } from "../../utils/app-error.js";
import type { PaginatedResult, PaginationQuery } from "../../utils/pagination.js";
import {
  createBranch,
  findBranchById,
  listBranches as repoListBranches,
  saveBranch,
} from "./branch.repository.js";
import type { BranchDocument, BranchStatus } from "./branch.model.js";
import type { CreateBranchInput, UpdateBranchInput } from "./branch.validators.js";

async function assertManagerInTenant(tenantId: string, managerId: string | undefined): Promise<void> {
  if (!managerId) return;
  const manager = await findUserByIdInTenant(managerId, tenantId);
  if (!manager) {
    throw AppError.badRequest("managerId must reference a user in this organization");
  }
}

export async function createOrgBranch(tenantId: string, input: CreateBranchInput): Promise<BranchDocument> {
  await assertManagerInTenant(tenantId, input.managerId);

  return createBranch({
    tenantId,
    name: input.name,
    code: input.code,
    address: input.address,
    managerId: input.managerId,
  });
}

export async function getBranch(tenantId: string, branchId: string): Promise<BranchDocument> {
  const branch = await findBranchById(branchId, tenantId);
  if (!branch) {
    throw AppError.notFound("Branch not found");
  }
  return branch;
}

export async function updateBranch(
  tenantId: string,
  branchId: string,
  input: UpdateBranchInput,
): Promise<BranchDocument> {
  const branch = await getBranch(tenantId, branchId);

  if (input.managerId !== undefined) {
    await assertManagerInTenant(tenantId, input.managerId ?? undefined);
    branch.managerId = input.managerId ? new Types.ObjectId(input.managerId) : undefined;
  }
  if (input.name) branch.name = input.name;
  if (input.address) branch.address = input.address;
  if (input.status) branch.status = input.status;

  return saveBranch(branch);
}

export async function listOrgBranches(
  tenantId: string,
  query: PaginationQuery & { status?: BranchStatus },
): Promise<PaginatedResult<BranchDocument>> {
  return repoListBranches({ tenantId, status: query.status }, query);
}
