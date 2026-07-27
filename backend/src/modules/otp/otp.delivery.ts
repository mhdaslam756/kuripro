import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../../utils/app-error.js";
import type { OtpPurpose } from "./otp.model.js";

/**
 * Sends an OTP code to `target` (email). No SMS/email provider has been selected yet — an open
 * decision flagged since Phase 1. In development this logs the code so the flow is testable
 * end-to-end without a real gateway; in production it fails loudly rather than silently
 * pretending to have delivered anything.
 */
export async function deliverOtp(target: string, purpose: OtpPurpose, code: string): Promise<void> {
  if (env.NODE_ENV !== "production") {
    logger.info({ target, purpose }, `DEV MODE — OTP code for ${target}: ${code}`);
    return;
  }

  throw AppError.internal(
    "OTP delivery is not configured — no SMS/email provider is wired up yet",
    "OTP_DELIVERY_NOT_CONFIGURED",
  );
}
