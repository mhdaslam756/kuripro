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
  for (const token of tokens) {
    try {
      await pushChannel.send({
        to: token,
        subject: payload.title,
        body: payload.body,
      });
      dispatched++;
    } catch {
      // Individual device failure logged or handled by push channel
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

  return {
    dispatched,
    sse: true,
    message: "Server push notification dispatched successfully.",
  };
}
