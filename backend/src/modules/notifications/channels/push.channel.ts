import webpush from "web-push";
import { getMessaging } from "firebase-admin/messaging";

import { env } from "../../../config/env.js";
import { firebaseApp, isFirebaseConfigured } from "../../../config/firebase.js";
import { AppError } from "../../../utils/app-error.js";
import type { Channel, ChannelMessage, ChannelSendResult } from "./channel.js";
import { deleteTokensByValue } from "../../devices/device-token.repository.js";

const isWebPushConfigured = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

if (isWebPushConfigured) {
  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY!,
    env.VAPID_PRIVATE_KEY!,
  );
}

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
      return { providerMessageId: "webpush-unconfigured-stream" };
    }
    try {
      const subscription = JSON.parse(message.to);
      const res = await webpush.sendNotification(
        subscription,
        JSON.stringify({
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
        }),
      );
      return { providerMessageId: `webpush-${res.statusCode}` };
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        // Subscription expired or unsubscribed — prune token
        void deleteTokensByValue([message.to]).catch(() => null);
      }
      return { providerMessageId: "webpush-stream" };
    }
  }

  // 2. Synthetic web/user tokens — real-time SSE stream covers these
  if (message.to.startsWith("web_token_") || message.to.startsWith("user:") || message.to.startsWith("member:")) {
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

