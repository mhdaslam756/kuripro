import type { Request, Response } from "express";

import { requireTenantContext } from "../../middleware/rbac.js";
import { AppError } from "../../utils/app-error.js";
import type { MongoIdParam } from "../../utils/common-validators.js";
import * as payoutService from "./payout.service.js";
import type { ListPayoutsQuery, RecordDisbursementInput } from "./payout.validators.js";

export async function list(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const result = await payoutService.listPayouts(tenantId, req.query as unknown as ListPayoutsQuery);
  res.status(200).json(result);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const payout = await payoutService.getPayoutDetail(tenantId, id);
  res.status(200).json({ payout });
}

export async function disburse(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const result = await payoutService.recordDisbursement(tenantId, id, req.auth!.userId, req.body as RecordDisbursementInput);
  res.status(201).json(result);
}

export async function receipt(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const dto = await payoutService.getDisbursementReceipt(tenantId, id);
  res.status(200).json({ receipt: dto });
}

export async function verify(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const token = (req.query as { token?: string }).token;
  if (!token) throw AppError.badRequest("A 'token' query parameter is required");
  const dto = await payoutService.verifyDisbursementReceipt(tenantId, token);
  res.status(200).json({ receipt: dto });
}
