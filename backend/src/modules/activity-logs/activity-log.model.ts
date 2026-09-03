import { Schema, model, Types, type HydratedDocument } from "mongoose";

import { tenantScopedPlugin } from "../../middleware/tenant-scope.plugin.js";
import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";

export const ACTIVITY_LOG_ACTIONS = [
  "LOGIN_SUCCEEDED",
  "LOGIN_FAILED",
  "LOGOUT",
  "OTP_REQUESTED",
  "OTP_LOGIN_SUCCEEDED",
  "EMAIL_VERIFIED",
  "EMAIL_VERIFICATION_REQUESTED",
  "PASSWORD_CHANGED",
  "PASSWORD_RESET_REQUESTED",
  "PASSWORD_RESET_COMPLETED",
  "PASSKEY_REGISTERED",
  "PASSKEY_LOGIN_SUCCEEDED",
  "USER_APPROVED",
  "SESSION_REVOKED",
  "ALL_SESSIONS_REVOKED",
  "MEMBER_REGISTERED",
  "MEMBER_UPDATED",
  "MEMBER_KYC_SUBMITTED",
  "MEMBER_KYC_VERIFIED",
  "MEMBER_KYC_REJECTED",
  "MEMBER_DOCUMENT_UPLOADED",
  "MEMBER_INVITED_TO_PORTAL",
  "COLLECTION_RECORDED",
  "COLLECTION_REVERSED",
  "PAYOUT_DISBURSED",
] as const;
export type ActivityLogAction = (typeof ACTIVITY_LOG_ACTIONS)[number];

export interface ActivityLogDoc extends Timestamps {
  tenantId: Types.ObjectId | null;
  /** The user whose account the action is attributed to — the actor, not necessarily the subject. */
  userId: Types.ObjectId;
  /**
   * Optional subject reference for member lifecycle events (KYC, registration, documents) — set
   * only when `userId` (the staff member acting) differs from who the event is about, so a
   * per-member timeline can be queried independently of who performed each action.
   */
  memberId?: Types.ObjectId;
  action: ActivityLogAction;
  message: string;
  ipAddress?: string;
  userAgent?: string;
}

export type ActivityLogDocument = HydratedDocument<ActivityLogDoc>;

/** Append-only — written via `.create()` only, never updated or deleted. */
const activityLogSchema = new Schema<ActivityLogDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", default: null },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    memberId: { type: Schema.Types.ObjectId, ref: "Member" },
    action: { type: String, enum: ACTIVITY_LOG_ACTIONS, required: true },
    message: { type: String, required: true, trim: true },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  baseSchemaOptions,
);

activityLogSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
activityLogSchema.index({ tenantId: 1, memberId: 1, createdAt: -1 }, { sparse: true });

activityLogSchema.plugin(tenantScopedPlugin);

export const ActivityLog = model<ActivityLogDoc>("ActivityLog", activityLogSchema);
