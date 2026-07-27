import { Types, type ClientSession } from "mongoose";

import type { ObjectIdLike } from "../../utils/mongoose-helpers.js";
import { buildPaginatedResult, toSkipLimit, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";
import { Notification, type NotificationDoc, type NotificationDocument } from "./notification.model.js";
import type { NotificationChannel, NotificationStatus, NotificationType } from "./notification.constants.js";

export type CreateNotificationInput = Omit<
  NotificationDoc,
  "createdAt" | "updatedAt" | "tenantId" | "memberId" | "templateId" | "createdBy" | "status"
> & {
  tenantId: ObjectIdLike;
  memberId?: ObjectIdLike;
  templateId?: ObjectIdLike;
  createdBy: ObjectIdLike;
  status?: NotificationStatus;
};

export async function insertNotifications(data: CreateNotificationInput[]): Promise<NotificationDocument[]> {
  if (data.length === 0) return [];
  return Notification.insertMany(data, {});
}

export async function findNotificationById(id: string, tenantId: string): Promise<NotificationDocument | null> {
  return Notification.findOne({ _id: id, tenantId });
}

export async function saveNotification(notification: NotificationDocument, session?: ClientSession): Promise<NotificationDocument> {
  return notification.save({ session });
}

export interface ListNotificationsFilter {
  tenantId: string;
  channel?: NotificationChannel;
  type?: NotificationType;
  status?: NotificationStatus;
  from?: Date;
  to?: Date;
}

export async function listNotifications(
  filter: ListNotificationsFilter,
  query: PaginationQuery,
): Promise<PaginatedResult<NotificationDocument>> {
  const mongoFilter: Record<string, unknown> = { tenantId: filter.tenantId };
  if (filter.channel) mongoFilter["channel"] = filter.channel;
  if (filter.type) mongoFilter["type"] = filter.type;
  if (filter.status) mongoFilter["status"] = filter.status;
  if (filter.from || filter.to) {
    mongoFilter["createdAt"] = { ...(filter.from ? { $gte: filter.from } : {}), ...(filter.to ? { $lte: filter.to } : {}) };
  }
  const { skip, limit } = toSkipLimit(query);
  const [items, total] = await Promise.all([
    Notification.find(mongoFilter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(mongoFilter),
  ]);
  return buildPaginatedResult(items, total, query);
}

export interface NotificationStats {
  total: number;
  sent: number;
  failed: number;
  queued: number;
  byChannel: { channel: string; count: number }[];
}

export async function notificationStats(tenantId: string): Promise<NotificationStats> {
  const [byStatus, byChannel] = await Promise.all([
    Notification.aggregate<{ _id: string; count: number }>([
      { $match: { tenantId: new Types.ObjectId(tenantId) } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Notification.aggregate<{ _id: string; count: number }>([
      { $match: { tenantId: new Types.ObjectId(tenantId) } },
      { $group: { _id: "$channel", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);
  const statusMap = new Map(byStatus.map((r) => [r._id, r.count]));
  return {
    total: byStatus.reduce((s, r) => s + r.count, 0),
    sent: statusMap.get("SENT") ?? 0,
    failed: statusMap.get("FAILED") ?? 0,
    queued: (statusMap.get("QUEUED") ?? 0) + (statusMap.get("SENDING") ?? 0),
    byChannel: byChannel.map((r) => ({ channel: r._id, count: r.count })),
  };
}
