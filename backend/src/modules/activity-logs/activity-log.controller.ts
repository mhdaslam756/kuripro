import type { Request, Response } from "express";

import { requireTenantContext } from "../../middleware/rbac.js";
import { AppError } from "../../utils/app-error.js";
import type { PaginationQuery } from "../../utils/pagination.js";
import * as activityLogService from "./activity-log.service.js";

export async function listMine(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    throw AppError.unauthorized();
  }
  const query = req.query as unknown as PaginationQuery;

  const result = await activityLogService.listUserActivity(req.auth.tenantId, req.auth.userId, query);
  res.status(200).json(result);
}

export async function listForTenant(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const query = req.query as unknown as PaginationQuery;

  const result = await activityLogService.listTenantActivity(tenantId, query);
  res.status(200).json(result);
}
