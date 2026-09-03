import type { Request, Response } from "express";

import { requireTenantContext } from "../../middleware/rbac.js";
import type { MongoIdParam } from "../../utils/common-validators.js";
import { resolveMemberForUser } from "../members/member.service.js";
import * as service from "./notification.service.js";
import { addMemberNotificationListener } from "./notification.stream.js";
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

  let memberIdFilter: string | undefined;
  if (req.auth?.roleSlug === "MEMBER") {
    const member = await resolveMemberForUser(req.auth.userId, tenantId);
    if (!member) {
      res.status(200).json({ items: [], total: 0, page: query.page || 1, limit: query.limit || 20, totalPages: 0 });
      return;
    }
    memberIdFilter = member._id.toString();
  }

  const result = await service.listHistory(
    tenantId,
    {
      channel: query.channel,
      type: query.type,
      status: query.status,
      from: query.from,
      to: query.to,
      memberId: memberIdFilter,
    },
    query,
  );
  res.status(200).json(result);
}

export async function meta(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const [channels, stats] = await Promise.all([service.getChannelAvailability(), service.getStats(tenantId)]);
  res.status(200).json({ channels, stats });
}

export async function notificationStream(req: Request, res: Response): Promise<void> {
  const userId = req.auth?.userId;
  const tenantId = req.auth?.tenantId;
  if (!userId) {
    res.status(401).end();
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (res.flushHeaders) {
    res.flushHeaders();
  }

  res.write("event: connected\ndata: {}\n\n");

  const unsubs: Array<() => void> = [];
  const onPayload = (payload: any) => {
    res.write(`event: notification\ndata: ${JSON.stringify(payload)}\n\n`);
  };

  unsubs.push(service.subscribeToUserNotifications(userId, onPayload));

  if (tenantId) {
    try {
      const member = await resolveMemberForUser(userId, tenantId);
      if (member) {
        unsubs.push(addMemberNotificationListener(member._id.toString(), onPayload));
      }
    } catch {
      // Ignore member resolution error
    }
  }

  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    for (const u of unsubs) u();
  });
}
