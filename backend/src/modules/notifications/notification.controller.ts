import type { Request, Response } from "express";

import { requireTenantContext } from "../../middleware/rbac.js";
import type { MongoIdParam } from "../../utils/common-validators.js";
import * as service from "./notification.service.js";
import type {
  CreateTemplateBody,
  ListHistoryQuery,
  ListTemplatesQuery,
  SendBulkInput,
  SendSingleInput,
  UpdateTemplateBody,
} from "./notification.validators.js";

// --- Templates ---

export async function listTemplates(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const query = req.query as unknown as ListTemplatesQuery;
  const templates = await service.listTemplates(tenantId, { type: query.type, channel: query.channel });
  res.status(200).json({ templates });
}

export async function createTemplate(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const template = await service.createTemplate(tenantId, req.body as CreateTemplateBody);
  res.status(201).json({ template });
}

export async function updateTemplate(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const template = await service.updateTemplate(tenantId, id, req.body as UpdateTemplateBody);
  res.status(200).json({ template });
}

export async function deleteTemplate(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  await service.deleteTemplate(tenantId, id);
  res.status(204).send();
}

// --- Sending ---

export async function send(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const result = await service.sendSingle(tenantId, req.auth!.userId, req.body as SendSingleInput);
  res.status(202).json(result);
}

export async function sendBulk(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const result = await service.sendBulk(tenantId, req.auth!.userId, req.body as SendBulkInput);
  res.status(202).json(result);
}

// --- History & meta ---

export async function history(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const query = req.query as unknown as ListHistoryQuery;
  const result = await service.listHistory(
    tenantId,
    { channel: query.channel, type: query.type, status: query.status, from: query.from, to: query.to },
    query,
  );
  res.status(200).json(result);
}

export async function meta(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const [channels, stats] = await Promise.all([service.getChannelAvailability(), service.getStats(tenantId)]);
  res.status(200).json({ channels, stats });
}
