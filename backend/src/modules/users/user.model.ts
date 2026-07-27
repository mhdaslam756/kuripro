import { Schema, model, Types, type HydratedDocument } from "mongoose";

import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";

export const USER_STATUSES = ["ACTIVE", "INVITED", "PENDING_APPROVAL", "SUSPENDED"] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

/**
 * `User` is purely an authentication/identity record. KYC, documents, occupation, nominees and the
 * rest of a person's business profile live on `Member` (see modules/members) — a Member optionally
 * links to a User once granted portal access. KYC used to sit here as a placeholder before the
 * Member module existed; it was moved (not duplicated) to keep this model focused on auth.
 */
export interface UserDoc extends Timestamps {
  tenantId: Types.ObjectId | null;
  /** Replaces the old hardcoded role enum — see modules/roles. Resolved to permissions at login. */
  roleId: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  /** True after an organizer/staff-issued temporary password, until the user sets their own. */
  mustChangePassword: boolean;
  status: UserStatus;
  lastLoginAt?: Date;
}

export type UserDocument = HydratedDocument<UserDoc>;

const userSchema = new Schema<UserDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", default: null },
    roleId: { type: Schema.Types.ObjectId, ref: "Role", required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    mustChangePassword: { type: Boolean, required: true, default: false },
    status: { type: String, enum: USER_STATUSES, required: true, default: "ACTIVE" },
    lastLoginAt: { type: Date },
  },
  baseSchemaOptions,
);

// `email` is already uniquely indexed via its field-level `unique: true`.
userSchema.index({ tenantId: 1, roleId: 1 });
userSchema.index({ phone: 1 });

export const User = model<UserDoc>("User", userSchema);
