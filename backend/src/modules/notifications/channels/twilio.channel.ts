import { env } from "../../../config/env.js";
import { AppError } from "../../../utils/app-error.js";
import type { Channel, ChannelMessage, ChannelSendResult } from "./channel.js";

const hasTwilio = Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN);

/** Posts a message via Twilio's REST API (no SDK — a plain authenticated fetch). */
async function sendViaTwilio(from: string, to: string, body: string): Promise<ChannelSendResult> {
  const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw AppError.internal(`Twilio send failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  const data = (await res.json()) as { sid?: string };
  return { providerMessageId: data.sid };
}

export const smsChannel: Channel = {
  channel: "SMS",
  isConfigured: hasTwilio && Boolean(env.TWILIO_SMS_FROM),
  send: (message: ChannelMessage) => sendViaTwilio(env.TWILIO_SMS_FROM!, message.to, message.body),
};

export const whatsappChannel: Channel = {
  channel: "WHATSAPP",
  isConfigured: hasTwilio && Boolean(env.TWILIO_WHATSAPP_FROM),
  send: (message: ChannelMessage) =>
    sendViaTwilio(`whatsapp:${env.TWILIO_WHATSAPP_FROM}`, `whatsapp:${message.to}`, message.body),
};
