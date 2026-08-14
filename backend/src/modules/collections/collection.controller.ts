import type { Request, Response } from "express";

import { requireTenantContext } from "../../middleware/rbac.js";
import { AppError } from "../../utils/app-error.js";
import type { MongoIdParam, PaymentIdParam } from "../../utils/common-validators.js";
import { listChitMembershipsByMemberId } from "../chit-groups/chit-membership.repository.js";
import { resolveMemberForUser } from "../members/member.service.js";
import * as collectionService from "./collection.service.js";
import type {
  BulkCollectionInput,
  FlagOverdueInput,
  ListCollectionsQuery,
  ListDuesQuery,
  RaiseDuesInput,
  RecordCollectionInput,
  SyncOfflineInput,
} from "./collection.validators.js";

// --- Auto Due ---

export async function raiseDues(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const result = await collectionService.raiseCycleDues(tenantId, req.body as RaiseDuesInput, req.auth?.userId);
  res.status(201).json(result);
}

export async function flagOverdue(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { chitGroupId } = req.body as FlagOverdueInput;
  const result = await collectionService.flagOverdue(tenantId, chitGroupId);
  res.status(200).json(result);
}

export async function listDues(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  let query = { ...(req.query as unknown as ListDuesQuery) };

  if (req.auth?.roleSlug === "MEMBER") {
    const member = await resolveMemberForUser(req.auth.userId, tenantId);
    if (member) {
      const memberships = await listChitMembershipsByMemberId(tenantId, member._id.toString());
      const chitMembershipIds = memberships.map((m) => m._id.toString());
      query = { ...query, chitMembershipIds } as any;
    } else {
      query = { ...query, chitMembershipIds: [] } as any;
    }
  }

  const result = await collectionService.listDues(tenantId, query);
  res.status(200).json(result);
}

export async function cycleSummary(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { chitGroupId, chitCycleId } = req.query as { chitGroupId?: string; chitCycleId?: string };
  if (!chitGroupId || !chitCycleId) {
    throw AppError.badRequest("chitGroupId and chitCycleId query params are required");
  }
  const summary = await collectionService.getCycleCollectionSummary(tenantId, chitGroupId, chitCycleId);
  res.status(200).json({ summary });
}

// --- Recording ---

export async function record(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const result = await collectionService.recordCollection(tenantId, req.auth!.userId, req.body as RecordCollectionInput);
  res.status(201).json({ collection: result.collection, installment: result.installment });
}

export async function bulk(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const result = await collectionService.bulkRecordCollections(tenantId, req.auth!.userId, req.body as BulkCollectionInput);
  res.status(200).json(result);
}

export async function sync(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const result = await collectionService.syncOfflineCollections(tenantId, req.auth!.userId, req.body as SyncOfflineInput);
  res.status(200).json(result);
}

// --- History ---

export async function list(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  let query = { ...(req.query as unknown as ListCollectionsQuery) };

  if (req.auth?.roleSlug === "MEMBER") {
    const member = await resolveMemberForUser(req.auth.userId, tenantId);
    if (member) {
      query = { ...query, memberId: member._id.toString() };
    }
  }

  const result = await collectionService.listCollections(tenantId, query);
  res.status(200).json(result);
}

// --- Reconciliation ---

export async function clear(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const collection = await collectionService.clearCollection(tenantId, id);
  res.status(200).json({ collection });
}

export async function bounce(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const collection = await collectionService.bounceCollection(tenantId, id, req.auth!.userId);
  res.status(200).json({ collection });
}

// --- Receipts ---

export async function receipt(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const dto = await collectionService.getReceipt(tenantId, id);
  res.status(200).json({ receipt: dto });
}

export async function receiptByPaymentId(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { paymentId } = req.params as unknown as PaymentIdParam;
  const dto = await collectionService.getReceiptByPaymentId(tenantId, paymentId);
  res.status(200).json({ receipt: dto });
}

export async function verify(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const token = (req.query as { token?: string }).token;
  if (!token) throw AppError.badRequest("A 'token' query parameter is required");
  const dto = await collectionService.verifyReceipt(tenantId, token);
  res.status(200).json({ receipt: dto });
}
