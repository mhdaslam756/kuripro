import type { Request, Response } from "express";

import { requireTenantContext } from "../../middleware/rbac.js";
import type { MongoIdParam } from "../../utils/common-validators.js";
import * as financeService from "./finance.service.js";
import type { CreateFinanceEntryInput, ListFinanceEntriesQuery } from "./finance.validators.js";

export async function create(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const entry = await financeService.recordFinanceEntry(tenantId, req.auth!.userId, req.body as CreateFinanceEntryInput);
  res.status(201).json({ entry });
}

export async function list(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const result = await financeService.listEntries(tenantId, req.query as unknown as ListFinanceEntriesQuery);
  res.status(200).json(result);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  await financeService.removeFinanceEntry(tenantId, id);
  res.status(204).send();
}
