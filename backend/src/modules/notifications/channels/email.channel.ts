import { env } from "../../../config/env.js";
import { AppError } from "../../../utils/app-error.js";
import type { Channel, ChannelMessage, ChannelSendResult } from "./channel.js";

const isResendConfigured = Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);

/** Sends email via the Resend HTTP API (no SMTP socket / SDK dependency). */
async function sendViaResend(message: ChannelMessage): Promise<ChannelSendResult> {
  let from = env.EMAIL_FROM?.trim() || "KuriPro <onboarding@resend.dev>";

  // Resend disallows sending from unverified public webmail domains like @gmail.com
  const publicDomainRegex = /@(gmail|yahoo|hotmail|outlook|live|icloud)\.com/i;
  if (publicDomainRegex.test(from)) {
    from = "KuriPro <onboarding@resend.dev>";
  } else if (!from.includes("<")) {
    from = `KuriPro <${from}>`;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject ?? "Notification",
      text: message.body,
      html: message.html,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    let errorMessage = `Resend email send failed (${res.status})`;
    try {
      const parsed = JSON.parse(detail) as { message?: string };
      if (parsed.message) {
        errorMessage = `Resend: ${parsed.message}`;
      }
    } catch {
      if (detail) errorMessage = `Resend: ${detail.slice(0, 200)}`;
    }
    throw AppError.internal(errorMessage);
  }
  const data = (await res.json()) as { id?: string };
  return { providerMessageId: data.id };
}

export const emailChannel: Channel = {
  channel: "EMAIL",
  isConfigured: isResendConfigured,
  async send(message: ChannelMessage): Promise<ChannelSendResult> {
    if (isResendConfigured) {
      return sendViaResend(message);
    }
    throw AppError.internal("Email delivery is not configured — please set RESEND_API_KEY and EMAIL_FROM in .env");
  },
};


