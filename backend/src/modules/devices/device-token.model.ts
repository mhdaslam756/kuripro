import { Schema, model, Types, type HydratedDocument } from "mongoose";

import { tenantScopedPlugin } from "../../middleware/tenant-scope.plugin.js";
import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";

export const DEVICE_PLATFORMS = ["web", "android", "ios"] as const;
export type DevicePlatform = (typeof DEVICE_PLATFORMS)[number];

/**
 * A push-notification registration token for one user on one device (FCM web/native). Collected when
 * a user grants notification permission; consumed by the notification PUSH channel to deliver to the
 * member's linked user. A token is device-global (unique), so re-registering reassigns it to the
 * current user rather than duplicating.
 */
export interface DeviceTokenDoc extends Timestamps {
  tenantId: Types.ObjectId | null;
  userId: Types.ObjectId;
  token: string;
  platform: DevicePlatform;
  userAgent?: string;
  lastSeenAt: Date;
}

export type DeviceTokenDocument = HydratedDocument<DeviceTokenDoc>;

const deviceTokenSchema = new Schema<DeviceTokenDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", default: null },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true, unique: true },
    platform: { type: String, enum: DEVICE_PLATFORMS, required: true, default: "web" },
    userAgent: { type: String },
    lastSeenAt: { type: Date, required: true, default: () => new Date() },
  },
  baseSchemaOptions,
);

deviceTokenSchema.index({ tenantId: 1, userId: 1 });

deviceTokenSchema.plugin(tenantScopedPlugin);

export const DeviceToken = model<DeviceTokenDoc>("DeviceToken", deviceTokenSchema);
