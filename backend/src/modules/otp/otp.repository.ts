import type { ObjectIdLike } from "../../utils/mongoose-helpers.js";
import { Otp, type OtpDoc, type OtpDocument, type OtpPurpose } from "./otp.model.js";

export type CreateOtpInput = Omit<OtpDoc, "createdAt" | "updatedAt" | "attempts" | "userId" | "consumedAt"> & {
  userId: ObjectIdLike;
  attempts?: number;
};

export async function createOtp(data: CreateOtpInput): Promise<OtpDocument> {
  return Otp.create(data);
}

/** Most recent, not-yet-consumed, not-yet-expired OTP for this target+purpose. */
export async function findActiveOtp(target: string, purpose: OtpPurpose): Promise<OtpDocument | null> {
  return Otp.findOne({
    target: target.toLowerCase(),
    purpose,
    consumedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
}

export async function incrementOtpAttempts(otp: OtpDocument): Promise<OtpDocument> {
  otp.attempts += 1;
  return otp.save();
}

export async function consumeOtp(otp: OtpDocument): Promise<OtpDocument> {
  otp.consumedAt = new Date();
  return otp.save();
}
