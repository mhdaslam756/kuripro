import type { Request, Response } from "express";

import { requireTenantContext } from "../../middleware/rbac.js";
import * as service from "./dashboard.service.js";
import type { ActivityQuery, TrendsQuery } from "./dashboard.validators.js";

export async function summary(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const result = await service.getSummary(tenantId);
  res.status(200).json(result);
}

export async function trends(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { months } = req.query as unknown as TrendsQuery;
  const result = await service.getTrends(tenantId, months);
  res.status(200).json(result);
}

export async function activity(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { limit } = req.query as unknown as ActivityQuery;
  const items = await service.getActivity(tenantId, limit);
  res.status(200).json({ items });
}
