import { Schema, model, Types, type HydratedDocument } from "mongoose";

import { tenantScopedPlugin } from "../../middleware/tenant-scope.plugin.js";
import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
  NOTIFICATION_TYPES,
  type NotificationChannel,
  type NotificationStatus,
  type NotificationType,
} from "./notification.constants.js";

/**
 * The History record for one notification to one recipient. Created QUEUED with the already-rendered
 * content (so History is accurate immediately), then moved to SENT/FAILED by the dispatch worker.
 */
export interface NotificationDoc extends Timestamps {
  tenantId: Types.ObjectId;
  channel: NotificationChannel;
  type: NotificationType;

  /** The member this went to (when the recipient is a member); denormalized name for History display. */
  memberId?: Types.ObjectId;
  recipientName: string;
  /** Phone / email / push-token — the actual destination for the chosen channel. */
  recipientContact: string;

  templateId?: Types.ObjectId;
  subject?: string;
  body: string;

  status: NotificationStatus;
  /** Provider message id when a real adapter accepted it; useful for later delivery reconciliation. */
  providerMessageId?: string;
  error?: string;
  sentAt?: Date;
  /** Grouping id so a bulk send's notifications can be counted/filtered together. */
  batchId?: string;

  createdBy: Types.ObjectId;
}

export type NotificationDocument = HydratedDocument<NotificationDoc>;

const notificationSchema = new Schema<NotificationDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    channel: { type: String, enum: NOTIFICATION_CHANNELS, required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },

    memberId: { type: Schema.Types.ObjectId, ref: "Member" },
    recipientName: { type: String, required: true, trim: true },
    recipientContact: { type: String, required: true, trim: true },

    templateId: { type: Schema.Types.ObjectId, ref: "NotificationTemplate" },
    subject: { type: String, trim: true },
    body: { type: String, required: true },

    status: { type: String, enum: NOTIFICATION_STATUSES, required: true, default: "QUEUED" },
    providerMessageId: { type: String },
    error: { type: String },
    sentAt: { type: Date },
    batchId: { type: String },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  baseSchemaOptions,
);

notificationSchema.index({ tenantId: 1, createdAt: -1 });
notificationSchema.index({ tenantId: 1, channel: 1, status: 1, createdAt: -1 });
notificationSchema.index({ tenantId: 1, memberId: 1, createdAt: -1 });
notificationSchema.index({ tenantId: 1, batchId: 1 });

notificationSchema.plugin(tenantScopedPlugin);

export const Notification = model<NotificationDoc>("Notification", notificationSchema);
