import nodemailer from "nodemailer";

import { env } from "../../../config/env.js";
import { AppError } from "../../../utils/app-error.js";
import type { Channel, ChannelMessage, ChannelSendResult } from "./channel.js";

const isResendConfigured = Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
const isSmtpConfigured = Boolean(
  (env.SMTP_HOST || env.SMTP_SERVICE) && env.SMTP_USER && env.SMTP_PASS,
);

let smtpTransporter: nodemailer.Transporter | null = null;

function getSmtpTransporter(): nodemailer.Transporter {
  if (!smtpTransporter) {
    if (env.SMTP_SERVICE) {
      smtpTransporter = nodemailer.createTransport({
        service: env.SMTP_SERVICE,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    } else {
      smtpTransporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT ?? 587,
        secure: env.SMTP_SECURE ?? (env.SMTP_PORT === 465),
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    }
  }
  return smtpTransporter;
}

async function sendViaSmtp(message: ChannelMessage): Promise<ChannelSendResult> {
  const transporter = getSmtpTransporter();
  const from = env.EMAIL_FROM || env.SMTP_USER || "KuriPro <no-reply@kuripro.com>";

  const info = await transporter.sendMail({
    from,
    to: message.to,
    subject: message.subject ?? "Notification",
    text: message.body,
    html: message.html,
  });

  return { providerMessageId: info.messageId };
}

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
  isConfigured: Boolean(isSmtpConfigured || isResendConfigured),
  async send(message: ChannelMessage): Promise<ChannelSendResult> {
    if (isSmtpConfigured) {
      return sendViaSmtp(message);
    }
    if (isResendConfigured) {
      return sendViaResend(message);
    }
    throw AppError.internal("Email delivery is not configured — please set SMTP or Resend credentials in .env");
  },
};

