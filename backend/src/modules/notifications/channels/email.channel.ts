import { env } from "../../../config/env.js";
import { AppError } from "../../../utils/app-error.js";
import type { Channel, ChannelMessage, ChannelSendResult } from "./channel.js";

/** Sends email via the Resend HTTP API (no SMTP socket / SDK dependency). */
async function sendViaResend(message: ChannelMessage): Promise<ChannelSendResult> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [message.to],
      subject: message.subject ?? "Notification",
      text: message.body,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw AppError.internal(`Email send failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  const data = (await res.json()) as { id?: string };
  return { providerMessageId: data.id };
}

export const emailChannel: Channel = {
  channel: "EMAIL",
  isConfigured: Boolean(env.RESEND_API_KEY && env.EMAIL_FROM),
  send: sendViaResend,
};
