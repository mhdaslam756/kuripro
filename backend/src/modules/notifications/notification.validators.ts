import { z } from "zod";

import { paginationQuerySchema } from "../../utils/pagination.js";
import {
  NOTIFICATION_AUDIENCES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
  NOTIFICATION_TYPES,
} from "./notification.constants.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const context = z.record(z.string(), z.string()).optional();

// --- Templates ---

export const createTemplateSchema = z.object({
  name: z.string().min(2).max(80),
  type: z.enum(NOTIFICATION_TYPES),
  channel: z.enum(NOTIFICATION_CHANNELS),
  subject: z.string().max(200).optional(),
  body: z.string().min(1).max(2000),
});

export type CreateTemplateBody = z.infer<typeof createTemplateSchema>;

export const updateTemplateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  type: z.enum(NOTIFICATION_TYPES).optional(),
  channel: z.enum(NOTIFICATION_CHANNELS).optional(),
  subject: z.string().max(200).optional(),
  body: z.string().min(1).max(2000).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateTemplateBody = z.infer<typeof updateTemplateSchema>;

export const listTemplatesQuerySchema = z.object({
  type: z.enum(NOTIFICATION_TYPES).optional(),
  channel: z.enum(NOTIFICATION_CHANNELS).optional(),
});

export type ListTemplatesQuery = z.infer<typeof listTemplatesQuerySchema>;

// --- Sending ---

const contentBase = {
  templateId: objectId.optional(),
  channel: z.enum(NOTIFICATION_CHANNELS).optional(),
  type: z.enum(NOTIFICATION_TYPES).optional(),
  subject: z.string().max(200).optional(),
  body: z.string().max(2000).optional(),
  context,
};

export const sendSingleSchema = z.object({
  ...contentBase,
  memberId: objectId.optional(),
  toContact: z.string().max(200).optional(),
  toName: z.string().max(120).optional(),
});

export type SendSingleInput = z.infer<typeof sendSingleSchema>;

export const sendBulkSchema = z.object({
  ...contentBase,
  audience: z.enum(NOTIFICATION_AUDIENCES),
  chitGroupId: objectId.optional(),
  memberIds: z.array(objectId).max(2000).optional(),
});

export type SendBulkInput = z.infer<typeof sendBulkSchema>;

// --- History ---

export const listHistoryQuerySchema = paginationQuerySchema.extend({
  channel: z.enum(NOTIFICATION_CHANNELS).optional(),
  type: z.enum(NOTIFICATION_TYPES).optional(),
  status: z.enum(NOTIFICATION_STATUSES).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type ListHistoryQuery = z.infer<typeof listHistoryQuerySchema>;
