import { Schema, model, Types, type HydratedDocument } from "mongoose";

import { tenantScopedPlugin } from "../../middleware/tenant-scope.plugin.js";
import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";

export interface SessionDoc extends Timestamps {
  tenantId: Types.ObjectId | null;
  userId: Types.ObjectId;

  /** Matches the refresh-token key's tokenId — this document is metadata only, never the secret. */
  tokenId: string;

  /** Stable client-generated id for "this browser/app install" — lets a returning device reuse one session row. */
  deviceId: string;
  deviceLabel: string;
  userAgent?: string;
  ipAddress?: string;

  /** "Remember this device" — trusted sessions get a longer-lived refresh token (see token.service.ts). */
  isTrusted: boolean;

  lastUsedAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
}

export type SessionDocument = HydratedDocument<SessionDoc>;

const sessionSchema = new Schema<SessionDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", default: null },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    tokenId: { type: String, required: true, unique: true },

    deviceId: { type: String, required: true },
    deviceLabel: { type: String, required: true, trim: true },
    userAgent: { type: String },
    ipAddress: { type: String },

    isTrusted: { type: Boolean, required: true, default: false },

    lastUsedAt: { type: Date, required: true, default: () => new Date() },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
  },
  baseSchemaOptions,
);

// `tokenId` is already uniquely indexed via its field-level `unique: true`.
sessionSchema.index({ userId: 1, revokedAt: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

sessionSchema.plugin(tenantScopedPlugin);

export const Session = model<SessionDoc>("Session", sessionSchema);
