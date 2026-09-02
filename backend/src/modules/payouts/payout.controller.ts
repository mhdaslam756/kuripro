import type { Request, Response } from "express";

import { requireTenantContext } from "../../middleware/rbac.js";
import { AppError } from "../../utils/app-error.js";
import type { MongoIdParam } from "../../utils/common-validators.js";
import { resolveMemberForUser } from "../members/member.service.js";
import * as payoutService from "./payout.service.js";
import type { ListPayoutsQuery, RecordDisbursementInput } from "./payout.validators.js";

export async function list(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  let query = { ...(req.query as unknown as ListPayoutsQuery) };

  if (req.auth?.roleSlug === "MEMBER") {
    const member = await resolveMemberForUser(req.auth.userId, tenantId);
    if (!member) {
      res.status(200).json({ items: [], total: 0, page: query.page || 1, limit: query.limit || 20, totalPages: 0 });
      return;
    }
    query = { ...query, memberId: member._id.toString() };
  }

  const result = await payoutService.listPayouts(tenantId, query);
  res.status(200).json(result);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const payout = await payoutService.getPayoutDetail(tenantId, id);

  if (req.auth?.roleSlug === "MEMBER") {
    const member = await resolveMemberForUser(req.auth.userId, tenantId);
    if (!member || payout.member.id !== member._id.toString()) {
      throw AppError.forbidden("Access denied: You may only view your own prize payout");
    }
  }

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

  if (req.auth?.roleSlug === "MEMBER") {
    const member = await resolveMemberForUser(req.auth.userId, tenantId);
    const dto = await payoutService.getDisbursementReceipt(tenantId, id);
    if (!member || dto.member.memberCode !== member.memberCode) {
      throw AppError.forbidden("Access denied: You may only view your own payout receipt");
    }
    res.status(200).json({ receipt: dto });
    return;
  }

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
