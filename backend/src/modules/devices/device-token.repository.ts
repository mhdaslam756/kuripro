import type { ObjectIdLike } from "../../utils/mongoose-helpers.js";
import { DeviceToken, type DevicePlatform } from "./device-token.model.js";

export interface UpsertDeviceTokenInput {
  tenantId: ObjectIdLike | null;
  userId: ObjectIdLike;
  token: string;
  platform: DevicePlatform;
  userAgent?: string;
}

/**
 * Registers (or re-homes) a push token. Because a token is device-global, the upsert keys on the
 * token alone — `{ tenantId: { $exists: true } }` is the plugin's sanctioned cross-tenant escape
 * hatch — so re-registering the same device under a new account reassigns it instead of colliding
 * on the unique index.
 */
export async function upsertDeviceToken(input: UpsertDeviceTokenInput): Promise<void> {
  await DeviceToken.updateOne(
    { token: input.token, tenantId: { $exists: true } },
    {
      $set: {
        tenantId: input.tenantId ?? null,
        userId: input.userId,
        platform: input.platform,
        userAgent: input.userAgent,
        lastSeenAt: new Date(),
      },
    },
    { upsert: true },
  );
}

export async function deleteDeviceToken(userId: string, token: string): Promise<void> {
  await DeviceToken.deleteOne({ tenantId: { $exists: true }, userId, token });
}

/** All push tokens for a user — the delivery targets for a member's PUSH notification. */
export async function listTokensForUser(_tenantId: string, userId: string): Promise<string[]> {
  const docs = await DeviceToken.find({ tenantId: { $exists: true }, userId }).select("token").lean();
  return docs.map((d) => d.token);
}

/** Prunes tokens FCM reported as unregistered/invalid so History stops targeting dead devices. */
export async function deleteTokensByValue(tokens: string[]): Promise<void> {
  if (tokens.length === 0) return;
  await DeviceToken.deleteMany({ tenantId: { $exists: true }, token: { $in: tokens } });
}

/** Prunes temporary synthetic tokens for a user when upgrading to real Web Push. */
export async function pruneSyntheticTokensForUser(userId: string): Promise<void> {
  await DeviceToken.deleteMany({ tenantId: { $exists: true }, userId, token: { $regex: "^web_token_" } });
}
