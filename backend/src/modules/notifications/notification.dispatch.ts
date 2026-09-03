import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { findMemberById } from "../members/member.repository.js";
import { getChannel } from "./channels/registry.js";
import { findNotificationById, saveNotification } from "./notification.repository.js";
import { emitNotificationToMember, emitNotificationToUser } from "./notification.stream.js";

/**
 * Delivers one queued notification. If the channel's provider isn't configured it degrades to the
 * dev console (logs the message and marks it SENT) in non-production, or FAILS with a clear reason in
 * production — the same honest-gap behaviour as OTP delivery. Idempotent: a SENT notification is a no-op.
 */
export async function dispatchNotification(tenantId: string, notificationId: string): Promise<void> {
  const notification = await findNotificationById(notificationId, tenantId);
  if (!notification || notification.status === "SENT") return;

  notification.status = "SENDING";
  await saveNotification(notification);

  // Attempt real-time user delivery
  try {
    let targetUserId: string | undefined;
    if (notification.recipientContact.startsWith("user:")) {
      targetUserId = notification.recipientContact.replace("user:", "");
    } else if (notification.memberId) {
      const member = await findMemberById(notification.memberId.toString(), tenantId);
      if (member?.userId) {
        targetUserId = member.userId.toString();
      }
    }
    const livePayload = {
      id: notification._id.toString(),
      title: notification.subject ?? "KuriPro 🔔",
      body: notification.body,
      type: notification.type,
      channel: notification.channel,
      url: "/notifications",
      createdAt: notification.createdAt ? notification.createdAt.toISOString() : new Date().toISOString(),
    };

    if (targetUserId) {
      emitNotificationToUser(targetUserId, livePayload);
    }
    if (notification.memberId) {
      emitNotificationToMember(notification.memberId.toString(), livePayload);
    }
  } catch (err) {
    logger.warn({ err }, "Could not emit live notification to user stream");
  }

  const adapter = getChannel(notification.channel);
  try {
    if (!adapter.isConfigured) {
      if (env.NODE_ENV === "production") {
        throw new Error(`${notification.channel} channel is not configured on this server`);
      }
      logger.info(
        { channel: notification.channel, to: notification.recipientContact },
        `DEV MODE — ${notification.channel} to ${notification.recipientContact}: ${notification.body.slice(0, 120)}`,
      );
      notification.status = "SENT";
      notification.sentAt = new Date();
      notification.providerMessageId = "dev-console";
    } else {
      const result = await adapter.send({
        to: notification.recipientContact,
        subject: notification.subject,
        body: notification.body,
      });
      notification.status = "SENT";
      notification.sentAt = new Date();
      notification.providerMessageId = result.providerMessageId;
    }
  } catch (error) {
    notification.status = "FAILED";
    notification.error = error instanceof Error ? error.message : "Delivery failed";
  }

  await saveNotification(notification);
}
