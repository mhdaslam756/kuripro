import {
  deleteDeviceToken,
  listTokensForUser,
  upsertDeviceToken,
} from "./device-token.repository.js";
import type { RegisterPushTokenInput } from "./device.validators.js";

export async function registerPushToken(
  tenantId: string | null,
  userId: string,
  input: RegisterPushTokenInput,
  userAgent?: string,
): Promise<void> {
  await upsertDeviceToken({ tenantId, userId, token: input.token, platform: input.platform, userAgent });
}

export async function unregisterPushToken(userId: string, token: string): Promise<void> {
  await deleteDeviceToken(userId, token);
}

/** Delivery targets for a member's PUSH notification — the member's linked user's registered devices. */
export async function pushTokensForUser(tenantId: string, userId: string): Promise<string[]> {
  return listTokensForUser(tenantId, userId);
}
