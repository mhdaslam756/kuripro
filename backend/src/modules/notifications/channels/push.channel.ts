import { getMessaging } from "firebase-admin/messaging";

import { firebaseApp, isFirebaseConfigured } from "../../../config/firebase.js";
import { AppError } from "../../../utils/app-error.js";
import type { Channel, ChannelMessage, ChannelSendResult } from "./channel.js";

import { deleteTokensByValue } from "../../devices/device-token.repository.js";

/**
 * Firebase Cloud Messaging push. Delivers to the recipient's FCM registration token.
 * Sends both notification payload and webpush data for PWA/native clients, and automatically
 * prunes stale/unregistered tokens if FCM reports them as invalid.
 */
async function sendViaFcm(message: ChannelMessage): Promise<ChannelSendResult> {
  if (!message.to) throw AppError.badRequest("No push token registered for this recipient");

  // Web clients without FCM config register synthetic web tokens; deliver via real-time stream
  if (message.to.startsWith("web_token_") || message.to.startsWith("user:") || message.to.startsWith("member:")) {
    return { providerMessageId: "webpush-stream" };
  }

  if (!firebaseApp) {
    return { providerMessageId: "unconfigured-stream" };
  }

  const title = message.subject ?? "KuriPro";
  const body = message.body;

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
      // Auto-prune dead token so future reminders don't fail repeatedly
      void deleteTokensByValue([message.to]).catch(() => null);
    }
    // If Firebase credentials are invalid or revoked, degrade gracefully to stream delivery
    if (error?.message?.includes("invalid_grant") || error?.message?.includes("account not found")) {
      return { providerMessageId: "stream-fallback" };
    }
    throw error;
  }
}

export const pushChannel: Channel = {
  channel: "PUSH",
  isConfigured: isFirebaseConfigured,
  send: sendViaFcm,
};
