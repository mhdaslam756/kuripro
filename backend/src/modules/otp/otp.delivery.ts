import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../../utils/app-error.js";
import { emailChannel } from "../notifications/channels/email.channel.js";
import type { OtpPurpose } from "./otp.model.js";

export function formatOtpEmail(purpose: OtpPurpose, code: string): { subject: string; text: string; html: string } {
  let title = "Verification Code";
  let subject = "Your KuriPro verification code";
  let explanation = "Use the verification code below to complete your request.";

  if (purpose === "EMAIL_VERIFICATION") {
    title = "Verify Your Email Address";
    subject = "Verify your KuriPro email address";
    explanation = "Thank you for registering with KuriPro. Please use the verification code below to confirm your email address and activate your account.";
  } else if (purpose === "PASSWORD_RESET") {
    title = "Password Reset Request";
    subject = "Reset your KuriPro password";
    explanation = "We received a request to reset your KuriPro account password. Enter the code below to proceed.";
  } else if (purpose === "LOGIN") {
    title = "Login Verification";
    subject = "Your KuriPro login verification code";
    explanation = "Use the verification code below to securely sign in to your KuriPro account.";
  }

  const text = `${title}\n\n${explanation}\n\nYour verification code is: ${code}\n\nThis code expires in 10 minutes.\nIf you did not request this code, please disregard this email.`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8f9fc; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.05); overflow: hidden;">
          <tr>
            <td style="padding: 36px 36px 20px 36px; text-align: center;">
              <div style="display: inline-block; width: 52px; height: 52px; line-height: 52px; background-color: #6d28d9; border-radius: 14px; color: #ffffff; font-size: 24px; font-weight: 800; margin-bottom: 16px;">
                K
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em;">
                ${title}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 36px 28px 36px; text-align: center;">
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #64748b;">
                ${explanation}
              </p>
              <div style="margin: 20px auto; padding: 18px 24px; background: #f5f3ff; border: 1.5px solid #ddd6fe; border-radius: 16px; display: inline-block;">
                <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #6d28d9; text-indent: 10px; display: block;">
                  ${code}
                </span>
              </div>
              <div style="margin-top: 14px;">
                <span style="display: inline-block; background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 9999px; padding: 6px 16px; font-size: 12px; font-weight: 600; color: #92400e;">
                  Valid for 10 minutes only
                </span>
              </div>
              <p style="margin: 24px 0 0 0; font-size: 12px; line-height: 1.5; color: #94a3b8;">
                If you did not request this verification code, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 36px 28px 36px; background-color: #fafafc; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                © 2026 KuriPro Chit Fund Management Platform. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

/**
 * Sends an OTP code to `target` (email). If SMTP or Resend is configured,
 * it delivers the email; in development/testing it also logs the code for easy local verification.
 */
export async function deliverOtp(target: string, purpose: OtpPurpose, code: string): Promise<void> {
  const { subject, text, html } = formatOtpEmail(purpose, code);

  if (emailChannel.isConfigured) {
    try {
      await emailChannel.send({ to: target, subject, body: text, html });
      logger.info({ target, purpose }, `OTP code successfully sent to email: ${target}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ err, target, purpose, message }, "Failed to deliver OTP via email channel");
      if (env.NODE_ENV === "production") {
        throw AppError.internal("Failed to send verification code email", "OTP_DELIVERY_FAILED");
      }
    }
  } else {
    logger.warn(
      { target, purpose },
      "Email delivery channel is NOT configured in .env (provide SMTP or Resend credentials)",
    );
    if (env.NODE_ENV === "production") {
      throw AppError.internal(
        "OTP delivery is not configured — please configure SMTP or Resend credentials in .env",
        "OTP_DELIVERY_NOT_CONFIGURED",
      );
    }
  }

  if (env.NODE_ENV !== "production") {
    logger.info({ target, purpose }, `DEV MODE — OTP code for ${target}: ${code}`);
  }
}

