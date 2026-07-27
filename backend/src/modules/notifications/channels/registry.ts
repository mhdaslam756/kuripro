import type { NotificationChannel } from "../notification.constants.js";
import type { Channel } from "./channel.js";
import { emailChannel } from "./email.channel.js";
import { pushChannel } from "./push.channel.js";
import { smsChannel, whatsappChannel } from "./twilio.channel.js";

const REGISTRY: Record<NotificationChannel, Channel> = {
  SMS: smsChannel,
  WHATSAPP: whatsappChannel,
  EMAIL: emailChannel,
  PUSH: pushChannel,
};

export function getChannel(channel: NotificationChannel): Channel {
  return REGISTRY[channel];
}

/** Which channels have their provider credentials configured — surfaced in the UI. */
export function channelAvailability(): { channel: NotificationChannel; configured: boolean }[] {
  return (Object.keys(REGISTRY) as NotificationChannel[]).map((channel) => ({
    channel,
    configured: REGISTRY[channel].isConfigured,
  }));
}
