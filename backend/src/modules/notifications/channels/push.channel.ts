import { logger } from "../../../config/logger.js";
import { getMessaging } from "firebase-admin/messaging";

import { env } from "../../../config/env.js";
import { firebaseApp, isFirebaseConfigured } from "../../../config/firebase.js";
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

// Background initialization so it never blocks server startup
void getWebPush().catch(() => {});

/**
 * Server-side push delivery channel.
 * Supports:
 * 1. Standard Web Push (W3C Push API via web-push and VAPID) for browsers even when closed
 * 2. Firebase Cloud Messaging (FCM) for native/FCM registration tokens
 * 3. Graceful degradation to real-time SSE stream delivery
 */
async function sendPush(message: ChannelMessage): Promise<ChannelSendResult> {
  if (!message.to) throw AppError.badRequest("No push token registered for this recipient");

  const title = message.subject ?? "KuriPro 🔔";
  const body = message.body;

  // 1. Standard Web Push Subscription (W3C Push API JSON)
  if (message.to.includes('"endpoint"')) {
    if (!isWebPushConfigured) {
      logger.warn("Web Push VAPID keys not configured on server; falling back to in-app stream");
      return { providerMessageId: "webpush-unconfigured-stream" };
    }
    const wp = await getWebPush();
    if (!wp) {
      logger.warn("Web Push module could not be loaded; falling back to in-app stream");
      return { providerMessageId: "webpush-stream" };
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

      logger.info({ statusCode: res.statusCode, endpoint: subscription.endpoint?.slice(0, 45) }, "Web Push dispatched successfully");
      return { providerMessageId: `webpush-${res.statusCode}` };
    } catch (err: any) {
      logger.error(
        { err: err?.message || err, statusCode: err?.statusCode, body: err?.body },
        "WebPush sendNotification failed",
      );
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        // Subscription expired or unsubscribed — prune token from DB
        logger.info({ tokenPrefix: message.to.slice(0, 40) }, "Pruning expired push subscription");
        void deleteTokensByValue([message.to]).catch(() => null);
      }
      throw err;
    }
  }

  // 2. Synthetic web/user tokens — real-time SSE stream covers these
  if (message.to.startsWith("web_token_") || message.to.startsWith("user:") || message.to.startsWith("member:")) {
    logger.warn({ to: message.to }, "Push targeted a synthetic fallback token — real background push requires an active Web Push subscription");
    return { providerMessageId: "webpush-stream" };
  }

  // 3. Firebase Cloud Messaging (FCM)
  if (!firebaseApp) {
    return { providerMessageId: "unconfigured-stream" };
  }

  try {
    const id = await getMessaging(firebaseApp).send({
      token: message.to,
      notification: { title, body },
      data: {
        title,
        body,
        url: "/notifications",
      },
      webpush: {
        notification: {
          title,
          body,
          icon: "/pwa-192.png",
          badge: "/pwa-192.png",
        },
        fcmOptions: {
          link: "/notifications",
        },
      },
    });
    return { providerMessageId: id };
  } catch (error: any) {
    const errorCode = error?.code || error?.errorInfo?.code;
    if (
      errorCode === "messaging/registration-token-not-registered" ||
      errorCode === "messaging/invalid-registration-token" ||
      errorCode === "messaging/invalid-argument"
    ) {
      void deleteTokensByValue([message.to]).catch(() => null);
    }
    if (error?.message?.includes("invalid_grant") || error?.message?.includes("account not found")) {
      return { providerMessageId: "stream-fallback" };
    }
    throw error;
  }
}

export const pushChannel: Channel = {
  channel: "PUSH",
  isConfigured: isWebPushConfigured || isFirebaseConfigured,
  send: sendPush,
};

