import { Schema, model, Types, type HydratedDocument } from "mongoose";

import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";

export const OTP_PURPOSES = ["LOGIN", "PASSWORD_RESET"] as const;
export type OtpPurpose = (typeof OTP_PURPOSES)[number];

export interface OtpDoc extends Timestamps {
  purpose: OtpPurpose;
  /** Email the code was requested for — lowercased, matches User.email. */
  target: string;
  userId: Types.ObjectId;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  consumedAt?: Date;
}

export type OtpDocument = HydratedDocument<OtpDoc>;

const otpSchema = new Schema<OtpDoc>(
  {
    purpose: { type: String, enum: OTP_PURPOSES, required: true },
    target: { type: String, required: true, trim: true, lowercase: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, required: true, default: 0, min: 0 },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date },
  },
  baseSchemaOptions,
);

// TTL index — Mongo removes the document automatically once expiresAt passes, no manual purge job needed.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ target: 1, purpose: 1, createdAt: -1 });

export const Otp = model<OtpDoc>("Otp", otpSchema);
