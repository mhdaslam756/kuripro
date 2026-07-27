import { Schema, model, Types, type HydratedDocument } from "mongoose";

import { tenantScopedPlugin } from "../../middleware/tenant-scope.plugin.js";
import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";
import { NOTIFICATION_CHANNELS, NOTIFICATION_TYPES, type NotificationChannel, type NotificationType } from "./notification.constants.js";

/**
 * A reusable message template for a channel + type. The body (and email/push subject) may contain
 * `{{variable}}` placeholders resolved per-recipient at send time (e.g. {{memberName}}, {{amount}}).
 */
export interface NotificationTemplateDoc extends Timestamps {
  tenantId: Types.ObjectId;
  name: string;
  type: NotificationType;
  channel: NotificationChannel;
  /** Subject line for EMAIL, or the notification title for PUSH. Ignored for SMS/WhatsApp. */
  subject?: string;
  body: string;
  /** System-seeded starter templates that can be edited but not deleted. */
  isSystem: boolean;
  isActive: boolean;
}

export type NotificationTemplateDocument = HydratedDocument<NotificationTemplateDoc>;

const templateSchema = new Schema<NotificationTemplateDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    channel: { type: String, enum: NOTIFICATION_CHANNELS, required: true },
    subject: { type: String, trim: true },
    body: { type: String, required: true },
    isSystem: { type: Boolean, required: true, default: false },
    isActive: { type: Boolean, required: true, default: true },
  },
  baseSchemaOptions,
);

templateSchema.index({ tenantId: 1, type: 1, channel: 1 });
templateSchema.index({ tenantId: 1, name: 1 }, { unique: true });

templateSchema.plugin(tenantScopedPlugin);

export const NotificationTemplate = model<NotificationTemplateDoc>("NotificationTemplate", templateSchema);
