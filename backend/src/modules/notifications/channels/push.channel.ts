import { logger } from "../../../config/logger.js";
import { env } from "../../../config/env.js";
import { AppError } from "../../../utils/app-error.js";
import type { Channel, ChannelMessage, ChannelSendResult } from "./channel.js";
import { deleteTokensByValue } from "../../devices/device-token.repository.js";

const isWebPushConfigured = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

let webpushInstance: any = null;
let webpushInitAttempted = false;

async function getWebPush(): Promise<any> {
  if (webpushInstance) return webpushInstance;
  if (webpushInitAttempted && !webpushInstance) return null;
  webpushInitAttempted = true;

  try {
    const mod = await import("web-push");
    webpushInstance = mod.default || mod;
    if (isWebPushConfigured && webpushInstance?.setVapidDetails) {
      webpushInstance.setVapidDetails(
        env.VAPID_SUBJECT,
        env.VAPID_PUBLIC_KEY!,
        env.VAPID_PRIVATE_KEY!,
      );
    }
  } catch (err) {
    logger.error({ err }, "Failed to initialize web-push module");
    webpushInstance = null;
  }
  return webpushInstance;
}

// Background initialization
void getWebPush().catch(() => {});

/**
 * Server-side push delivery channel.
 * Implements standard W3C Web Push with VAPID (RFC 8291 / RFC 8292).
 * Works across ALL devices:
 * - Android (Chrome, Firefox, Edge, Samsung Internet)
 * - iOS / iPadOS 16.4+ (PWA added to Home Screen via APNs)
 * - Desktop (Chrome, Safari, Firefox, Edge)
 */
async function sendPush(message: ChannelMessage): Promise<ChannelSendResult> {
  if (!message.to) throw AppError.badRequest("No push token registered for this recipient");

  const title = message.subject ?? "KuriPro 🔔";
  const body = message.body;

  // Standard Web Push subscription JSON
  if (message.to.includes('"endpoint"')) {
    if (!isWebPushConfigured) {
      logger.warn("Web Push VAPID keys not configured on server");
      throw AppError.badRequest("Web Push VAPID keys not configured on server");
    }
    const wp = await getWebPush();
    if (!wp) {
      logger.error("Web Push module could not be loaded");
      throw new Error("Web Push service unavailable");
    }

    try {
      const subscription = JSON.parse(message.to);
      const payloadString = JSON.stringify({
        title,
        body,
        icon: "/pwa-192.png",
        badge: "/pwa-192.png",
        notification: {
          title,
          body,
          icon: "/pwa-192.png",
          badge: "/pwa-192.png",
        },
        data: {
          url: "/notifications",
          title,
          body,
        },
      });

      const res = await wp.sendNotification(subscription, payloadString, {
        TTL: 86400,
        urgency: "high",
      });

      logger.info(
        { statusCode: res.statusCode, endpoint: subscription.endpoint?.slice(0, 45) },
        "Web Push dispatched successfully",
      );
      return { providerMessageId: `webpush-${res.statusCode}` };
    } catch (err: any) {
      logger.error(
        { err: err?.message || err, statusCode: err?.statusCode, body: err?.body },
        "WebPush sendNotification failed",
      );
      // 404 Not Found or 410 Gone means subscription has expired or user unsubscribed
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        logger.info({ tokenPrefix: message.to.slice(0, 40) }, "Pruning expired push subscription");
        void deleteTokensByValue([message.to]).catch(() => null);
      }
      throw err;
    }
  }

  // Purge any obsolete legacy synthetic tokens
  if (message.to.startsWith("web_token_") || message.to.startsWith("user:") || message.to.startsWith("member:")) {
    logger.warn({ to: message.to }, "Ignored obsolete non-push target");
    void deleteTokensByValue([message.to]).catch(() => null);
    throw AppError.badRequest("Target is not an active Web Push subscription");
  }

  throw AppError.badRequest("Unsupported push token format");
}

export const pushChannel: Channel = {
  channel: "PUSH",
  isConfigured: isWebPushConfigured,
  send: sendPush,
};
