import { env } from "../../config/env.js";
import {
  deleteDeviceToken,
  listTokensForUser,
  pruneSyntheticTokensForUser,
  upsertDeviceToken,
} from "./device-token.repository.js";
import type { RegisterPushTokenInput } from "./device.validators.js";
import { pushChannel } from "../notifications/channels/push.channel.js";
import { emitNotificationToMember, emitNotificationToUser } from "../notifications/notification.stream.js";
import { findMemberByUserId } from "../members/member.repository.js";

export async function registerPushToken(
  tenantId: string | null,
  userId: string,
  input: RegisterPushTokenInput,
  userAgent?: string,
): Promise<void> {
  if (input.token.includes('"endpoint"')) {
    await pruneSyntheticTokensForUser(userId).catch(() => null);
  }
  await upsertDeviceToken({ tenantId, userId, token: input.token, platform: input.platform, userAgent });
}

export async function unregisterPushToken(userId: string, token: string): Promise<void> {
  await deleteDeviceToken(userId, token);
}

/** Delivery targets for a member's PUSH notification — the member's linked user's registered devices. */
export async function pushTokensForUser(tenantId: string, userId: string): Promise<string[]> {
  return listTokensForUser(tenantId, userId);
}

export function getVapidPublicKey(): string | null {
  return env.VAPID_PUBLIC_KEY ?? null;
}

export async function sendTestPushToUser(
  tenantId: string | null,
  userId: string,
): Promise<{ dispatched: number; sse: boolean; message: string }> {
  const tokens = await listTokensForUser(tenantId ?? "", userId);

  const payload = {
    id: `test_${Date.now()}`,
    title: "KuriPro Push Active 🔔",
    body: "Your push notifications are verified and active on this device!",
    type: "TEST_ALERT",
    url: "/notifications",
    createdAt: new Date().toISOString(),
  };

  let dispatched = 0;
  let lastError: string | null = null;
  for (const token of tokens) {
    try {
      await pushChannel.send({
        to: token,
        subject: payload.title,
        body: payload.body,
      });
      dispatched++;
    } catch (err: any) {
      lastError = err?.message || String(err);
    }
  }

  // Also deliver to the user's and member's active browser SSE stream
  try {
    emitNotificationToUser(userId, payload);
    if (tenantId) {
      const member = await findMemberByUserId(userId, tenantId);
      if (member) {
        emitNotificationToMember(member._id.toString(), payload);
      }
    }
  } catch {
    // ignore
  }

  if (tokens.length === 0) {
    return {
      dispatched: 0,
      sse: true,
      message: "In-app alert sent, but no device is registered for background push. Please tap 'Enable push' first.",
    };
  }

  if (dispatched === 0) {
    return {
      dispatched: 0,
      sse: true,
      message: `Failed to deliver push to registered device${tokens.length > 1 ? "s" : ""}: ${lastError ?? "delivery failed"}. Try disabling and re-enabling push.`,
    };
  }

  return {
    dispatched,
    sse: true,
    message: `Push notification dispatched to ${dispatched} device${dispatched === 1 ? "" : "s"}! Check your device lock screen / notification shade.`,
  };
}
