import { randomUUID } from "node:crypto";

import { listActiveMembershipsByGroup, listMemberIdsByMembershipIds } from "../chit-groups/chit-membership.repository.js";
import { pushTokensForUser } from "../devices/device.service.js";
import { findMemberById, listMembersByIds, listMembersForExport, listMembersWithBirthday } from "../members/member.repository.js";
import type { MemberDocument } from "../members/member.model.js";
import { distinctOverdueMembershipIds } from "../payments/payment.repository.js";
import { findTenantById } from "../tenants/tenant.repository.js";
import { findUserByPhoneOrEmail } from "../users/user.repository.js";
import { AppError } from "../../utils/app-error.js";
import type { PaginatedResult, PaginationQuery } from "../../utils/pagination.js";
import { channelAvailability } from "./channels/registry.js";
import { DEFAULT_TEMPLATES } from "./notification.defaults.js";
import type { NotificationChannel, NotificationType } from "./notification.constants.js";
import type { NotificationDocument } from "./notification.model.js";
import { enqueueNotification } from "./notification.queue.js";
import {
  insertNotifications,
  listNotifications,
  notificationStats,
  type CreateNotificationInput,
  type ListNotificationsFilter,
  type NotificationStats,
} from "./notification.repository.js";
import {
  countTemplates,
  createTemplate as repoCreateTemplate,
  deleteTemplate as repoDeleteTemplate,
  findTemplateById,
  listTemplates as repoListTemplates,
  saveTemplate,
  type ListTemplatesFilter,
} from "./notification-template.repository.js";
import type { NotificationTemplateDocument } from "./notification-template.model.js";
import { renderTemplate } from "./template.util.js";
import type {
  CreateTemplateBody,
  SendBulkInput,
  SendSingleInput,
  UpdateTemplateBody,
} from "./notification.validators.js";

// --- Templates ---

export async function ensureDefaultTemplates(tenantId: string): Promise<void> {
  if ((await countTemplates(tenantId)) > 0) return;
  for (const template of DEFAULT_TEMPLATES) {
    await repoCreateTemplate({ tenantId, ...template, isSystem: true });
  }
}

export async function listTemplates(tenantId: string, filter: Omit<ListTemplatesFilter, "tenantId">): Promise<NotificationTemplateDocument[]> {
  await ensureDefaultTemplates(tenantId);
  return repoListTemplates({ tenantId, ...filter });
}

export async function createTemplate(tenantId: string, input: CreateTemplateBody): Promise<NotificationTemplateDocument> {
  return repoCreateTemplate({ tenantId, name: input.name, type: input.type, channel: input.channel, subject: input.subject, body: input.body });
}

export async function updateTemplate(tenantId: string, id: string, input: UpdateTemplateBody): Promise<NotificationTemplateDocument> {
  const template = await findTemplateById(id, tenantId);
  if (!template) throw AppError.notFound("Template not found");
  if (input.name !== undefined) template.name = input.name;
  if (input.subject !== undefined) template.subject = input.subject;
  if (input.body !== undefined) template.body = input.body;
  if (input.type !== undefined) template.type = input.type;
  if (input.channel !== undefined) template.channel = input.channel;
  if (input.isActive !== undefined) template.isActive = input.isActive;
  return saveTemplate(template);
}

export async function deleteTemplate(tenantId: string, id: string): Promise<void> {
  const template = await findTemplateById(id, tenantId);
  if (!template) throw AppError.notFound("Template not found");
  if (template.isSystem) throw AppError.conflict("Built-in templates can't be deleted — edit or deactivate them instead");
  await repoDeleteTemplate(id, tenantId);
}

// --- Content + recipient resolution ---

interface ResolvedContent {
  channel: NotificationChannel;
  type: NotificationType;
  templateId?: string;
  subjectTemplate?: string;
  bodyTemplate: string;
}

async function resolveContent(
  tenantId: string,
  input: { channel?: NotificationChannel; type?: NotificationType; templateId?: string; subject?: string; body?: string },
): Promise<ResolvedContent> {
  if (input.templateId) {
    const template = await findTemplateById(input.templateId, tenantId);
    if (!template) throw AppError.badRequest("Template not found");
    return { channel: template.channel, type: template.type, templateId: template._id.toString(), subjectTemplate: template.subject, bodyTemplate: template.body };
  }
  if (!input.channel || !input.body) throw AppError.badRequest("Provide a templateId, or a channel and body");
  return { channel: input.channel, type: input.type ?? "CUSTOM", subjectTemplate: input.subject, bodyTemplate: input.body };
}

function contactFor(member: MemberDocument, channel: NotificationChannel): string {
  if (channel === "EMAIL") return member.email ?? "";
  return member.phone; // SMS, WHATSAPP (PUSH is resolved to device tokens by memberTargets)
}

/**
 * The concrete delivery targets for a member on a channel. For SMS/WhatsApp/Email that's the single
 * phone/email (or none); for PUSH it fans out to every registered device token of the member's linked
 * user — so a member with two devices gets two notifications, and one with none is skipped cleanly.
 */
import { addNotificationListener } from "./notification.stream.js";

async function memberTargets(tenantId: string, member: MemberDocument, channel: NotificationChannel): Promise<string[]> {
  if (channel === "PUSH") {
    let userId = member.userId?.toString();
    if (!userId) {
      let user = member.phone ? await findUserByPhoneOrEmail(member.phone) : null;
      if (!user && member.email) {
        user = await findUserByPhoneOrEmail(member.email);
      }
      if (user) {
        userId = user._id.toString();
        member.userId = user._id;
        void member.save().catch(() => null);
      }
    }
    if (userId) {
      const tokens = await pushTokensForUser(tenantId, userId);
      if (tokens.length > 0) return tokens;
      return [`user:${userId}`];
    }
    return [`member:${member._id.toString()}`];
  }
  const contact = contactFor(member, channel);
  return contact ? [contact] : [];
}

/** Human-readable reason a channel had no target, shown in the bulk-send skipped summary. */
function noTargetReason(channel: NotificationChannel): string {
  if (channel === "PUSH") return "No registered device for push";
  if (channel === "EMAIL") return "No email address on file";
  return "No phone number on file";
}

async function baseContext(tenantId: string, extra?: Record<string, string>): Promise<Record<string, string>> {
  const tenant = await findTenantById(tenantId);
  return { orgName: tenant?.name ?? "KuriPro", ...(extra ?? {}) };
}

function memberContext(member: MemberDocument, base: Record<string, string>): Record<string, string> {
  return { ...base, memberName: member.name, memberCode: member.memberCode, phone: member.phone };
}

// --- Single send ---

export interface SendResult {
  queued: number;
  skipped: { reason: string; count: number }[];
  batchId?: string;
}

export async function sendSingle(tenantId: string, createdBy: string, input: SendSingleInput): Promise<SendResult> {
  const content = await resolveContent(tenantId, input);
  const base = await baseContext(tenantId, input.context);

  let recipientName: string;
  let memberId: string | undefined;
  let context = base;
  let contacts: string[];

  if (input.memberId) {
    const member = await findMemberById(input.memberId, tenantId);
    if (!member) throw AppError.badRequest("Member not found");
    memberId = member._id.toString();
    recipientName = member.name;
    context = memberContext(member, base);
    // PUSH fans out to every registered device; other channels resolve to one phone/email.
    contacts = await memberTargets(tenantId, member, content.channel);
    if (contacts.length === 0) throw AppError.badRequest(noTargetReason(content.channel));
  } else {
    if (!input.toContact) throw AppError.badRequest("Provide a memberId or a toContact");
    recipientName = input.toName ?? input.toContact;
    contacts = [input.toContact];
  }

  const renderedSubject = content.subjectTemplate ? renderTemplate(content.subjectTemplate, context) : undefined;
  const renderedBody = renderTemplate(content.bodyTemplate, context);

  const notifications: CreateNotificationInput[] = contacts.map((recipientContact) => ({
    tenantId,
    channel: content.channel,
    type: content.type,
    memberId,
    recipientName,
    recipientContact,
    templateId: content.templateId,
    subject: renderedSubject,
    body: renderedBody,
    createdBy,
    status: "QUEUED",
  }));

  const created = await insertNotifications(notifications);
  for (const notification of created) await enqueueNotification(tenantId, notification._id.toString());
  return { queued: created.length, skipped: [] };
}

// --- Bulk send ---

async function resolveAudience(tenantId: string, input: SendBulkInput): Promise<MemberDocument[]> {
  switch (input.audience) {
    case "ALL_MEMBERS":
      return listMembersForExport({ tenantId, status: "ACTIVE" });
    case "CHIT_GROUP": {
      if (!input.chitGroupId) throw AppError.badRequest("chitGroupId is required for the CHIT_GROUP audience");
      const memberships = await listActiveMembershipsByGroup(tenantId, input.chitGroupId);
      return listMembersByIds(memberships.map((m) => m.memberId.toString()), tenantId);
    }
    case "OVERDUE": {
      const membershipIds = await distinctOverdueMembershipIds(tenantId, input.chitGroupId);
      const memberIds = await listMemberIdsByMembershipIds(tenantId, membershipIds);
      return listMembersByIds(memberIds, tenantId);
    }
    case "BIRTHDAYS_TODAY": {
      const now = new Date();
      return listMembersWithBirthday(tenantId, now.getMonth() + 1, now.getDate());
    }
    case "CUSTOM_MEMBERS":
      if (!input.memberIds || input.memberIds.length === 0) throw AppError.badRequest("memberIds are required for the CUSTOM_MEMBERS audience");
      return listMembersByIds(input.memberIds, tenantId);
    default:
      throw AppError.badRequest("Unknown audience");
  }
}

export async function sendBulk(tenantId: string, createdBy: string, input: SendBulkInput): Promise<SendResult> {
  const content = await resolveContent(tenantId, input);
  const base = await baseContext(tenantId, input.context);
  const members = await resolveAudience(tenantId, input);

  if (members.length === 0) throw AppError.badRequest("No recipients matched this audience");

  const batchId = randomUUID();
  const toCreate: CreateNotificationInput[] = [];
  let noContact = 0;

  for (const member of members) {
    // PUSH fans out to every registered device; other channels resolve to one phone/email (or none).
    const contacts = await memberTargets(tenantId, member, content.channel);
    if (contacts.length === 0) {
      noContact += 1;
      continue;
    }
    const context = memberContext(member, base);
    const renderedSubject = content.subjectTemplate ? renderTemplate(content.subjectTemplate, context) : undefined;
    const renderedBody = renderTemplate(content.bodyTemplate, context);
    for (const recipientContact of contacts) {
      toCreate.push({
        tenantId,
        channel: content.channel,
        type: content.type,
        memberId: member._id.toString(),
        recipientName: member.name,
        recipientContact,
        templateId: content.templateId,
        subject: renderedSubject,
        body: renderedBody,
        createdBy,
        status: "QUEUED",
        batchId,
      });
    }
  }

  if (toCreate.length === 0) {
    throw AppError.badRequest(`None of the ${members.length} recipients have a ${content.channel} target`);
  }

  const created = await insertNotifications(toCreate);
  for (const notification of created) await enqueueNotification(tenantId, notification._id.toString());

  const skipped: SendResult["skipped"] = [];
  if (noContact > 0) skipped.push({ reason: noTargetReason(content.channel), count: noContact });
  return { queued: created.length, skipped, batchId };
}

// --- History & meta ---

export async function listHistory(tenantId: string, filter: Omit<ListNotificationsFilter, "tenantId">, query: PaginationQuery): Promise<PaginatedResult<NotificationDocument>> {
  return listNotifications({ tenantId, ...filter }, query);
}

export async function getStats(tenantId: string): Promise<NotificationStats> {
  return notificationStats(tenantId);
}

export function getChannelAvailability() {
  return channelAvailability();
}

export function subscribeToUserNotifications(userId: string, listener: (payload: any) => void): () => void {
  return addNotificationListener(userId, listener);
}

