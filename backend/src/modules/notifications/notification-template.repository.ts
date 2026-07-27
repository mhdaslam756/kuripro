import type { ObjectIdLike } from "../../utils/mongoose-helpers.js";
import {
  NotificationTemplate,
  type NotificationTemplateDoc,
  type NotificationTemplateDocument,
} from "./notification-template.model.js";
import type { NotificationChannel, NotificationType } from "./notification.constants.js";

export type CreateTemplateInput = Omit<NotificationTemplateDoc, "createdAt" | "updatedAt" | "tenantId" | "isSystem" | "isActive"> & {
  tenantId: ObjectIdLike;
  isSystem?: boolean;
  isActive?: boolean;
};

export async function createTemplate(data: CreateTemplateInput): Promise<NotificationTemplateDocument> {
  return NotificationTemplate.create(data);
}

export async function findTemplateById(id: string, tenantId: string): Promise<NotificationTemplateDocument | null> {
  return NotificationTemplate.findOne({ _id: id, tenantId });
}

export async function findTemplateByName(tenantId: string, name: string): Promise<NotificationTemplateDocument | null> {
  return NotificationTemplate.findOne({ tenantId, name });
}

export async function saveTemplate(template: NotificationTemplateDocument): Promise<NotificationTemplateDocument> {
  return template.save();
}

export async function deleteTemplate(id: string, tenantId: string): Promise<boolean> {
  const result = await NotificationTemplate.deleteOne({ _id: id, tenantId });
  return result.deletedCount > 0;
}

export interface ListTemplatesFilter {
  tenantId: string;
  type?: NotificationType;
  channel?: NotificationChannel;
}

export async function listTemplates(filter: ListTemplatesFilter): Promise<NotificationTemplateDocument[]> {
  return NotificationTemplate.find({
    tenantId: filter.tenantId,
    ...(filter.type ? { type: filter.type } : {}),
    ...(filter.channel ? { channel: filter.channel } : {}),
  }).sort({ type: 1, channel: 1, name: 1 });
}

export async function countTemplates(tenantId: string): Promise<number> {
  return NotificationTemplate.countDocuments({ tenantId });
}
