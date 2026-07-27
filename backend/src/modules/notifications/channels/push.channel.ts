import { getMessaging } from "firebase-admin/messaging";

import { firebaseApp, isFirebaseConfigured } from "../../../config/firebase.js";
import { AppError } from "../../../utils/app-error.js";
import type { Channel, ChannelMessage, ChannelSendResult } from "./channel.js";

/**
 * Firebase Cloud Messaging push. Firebase itself is configured in this project, but a push needs a
 * per-device FCM token as the recipient — those aren't collected yet (no mobile client registers
 * them), so in practice `message.to` is empty and this reports the gap clearly rather than failing
 * opaquely. Once tokens are captured, this sends for real with no further change.
 */
async function sendViaFcm(message: ChannelMessage): Promise<ChannelSendResult> {
  if (!firebaseApp) throw AppError.internal("Firebase is not initialised");
  if (!message.to) throw AppError.badRequest("No push token registered for this recipient");

  const id = await getMessaging(firebaseApp).send({
    token: message.to,
    notification: { title: message.subject ?? "KuriPro", body: message.body },
  });
  return { providerMessageId: id };
}

export const pushChannel: Channel = {
  channel: "PUSH",
  isConfigured: isFirebaseConfigured,
  send: sendViaFcm,
};
