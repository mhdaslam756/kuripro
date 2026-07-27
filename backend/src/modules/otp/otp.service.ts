import { createHash, randomInt, timingSafeEqual } from "node:crypto";

import type { Types } from "mongoose";

import { AppError } from "../../utils/app-error.js";
import type { ObjectIdLike } from "../../utils/mongoose-helpers.js";
import { consumeOtp, createOtp, findActiveOtp, incrementOtpAttempts } from "./otp.repository.js";
import type { OtpPurpose } from "./otp.model.js";

const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function generateCode(): string {
  return randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/** Generates a code, stores its hash, and returns the plaintext code for the caller to deliver. */
export async function generateOtp(userId: ObjectIdLike, target: string, purpose: OtpPurpose): Promise<string> {
  const code = generateCode();
  await createOtp({
    purpose,
    target,
    userId,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });
  return code;
}

/** Verifies a code and, on success, consumes it — returns the userId it was issued for. */
export async function verifyOtp(target: string, purpose: OtpPurpose, code: string): Promise<Types.ObjectId> {
  const otp = await findActiveOtp(target, purpose);
  if (!otp) {
    throw AppError.unauthorized("This code is invalid or has expired", "OTP_INVALID");
  }

  if (otp.attempts >= MAX_ATTEMPTS) {
    throw AppError.unauthorized("Too many incorrect attempts — request a new code", "OTP_LOCKED");
  }

  const providedHash = Buffer.from(hashCode(code), "hex");
  const storedHash = Buffer.from(otp.codeHash, "hex");
  const isValid = storedHash.length === providedHash.length && timingSafeEqual(storedHash, providedHash);

  if (!isValid) {
    await incrementOtpAttempts(otp);
    throw AppError.unauthorized("Incorrect code", "OTP_INVALID");
  }

  await consumeOtp(otp);
  return otp.userId;
}
