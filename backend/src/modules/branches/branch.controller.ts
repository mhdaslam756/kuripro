import type { Request, Response } from "express";

import { requireTenantContext } from "../../middleware/rbac.js";
import type { MongoIdParam } from "../../utils/common-validators.js";
import type { PaginationQuery } from "../../utils/pagination.js";
import * as branchService from "./branch.service.js";
import type { BranchStatus } from "./branch.model.js";
import type { CreateBranchInput, UpdateBranchInput } from "./branch.validators.js";

export async function create(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const input = req.body as CreateBranchInput;

  const branch = await branchService.createOrgBranch(tenantId, input);
  res.status(201).json({ branch });
}

export async function list(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const query = req.query as unknown as PaginationQuery & { status?: BranchStatus };

  const result = await branchService.listOrgBranches(tenantId, query);
  res.status(200).json(result);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;

  const branch = await branchService.getBranch(tenantId, id);
  res.status(200).json({ branch });
}

export async function update(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const input = req.body as UpdateBranchInput;

  const branch = await branchService.updateBranch(tenantId, id, input);
  res.status(200).json({ branch });
}
