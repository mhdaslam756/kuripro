import { randomBytes, randomUUID, timingSafeEqual, createHash } from "node:crypto";

import jwt from "jsonwebtoken";

import { env } from "../../config/env.js";
import { redis } from "../../config/redis.js";
import type { AccessTokenPayload, AuthContext } from "../../types/auth.js";
import { AppError } from "../../utils/app-error.js";

const REFRESH_TOKEN_REDIS_PREFIX = "refresh_token:";

/** "Remember this device" sessions get a much longer-lived refresh token than a default login. */
export const REMEMBERED_DEVICE_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days

export interface RefreshIdentity {
  userId: string;
  tenantId: string | null;
}

/**
 * Only bare identity, never role/permissions — those are re-resolved from the database on every
 * refresh (see auth.service.ts's `refreshSession`) so a permission change takes effect within one
 * access-token lifetime (15 min) instead of lingering for the refresh token's full 30–90 day life.
 */
interface StoredRefreshToken extends RefreshIdentity {
  secretHash: string;
  ttlSeconds: number;
}

export interface IssuedRefreshToken {
  token: string;
  tokenId: string;
  expiresAt: Date;
}

function refreshTokenRedisKey(tokenId: string): string {
  return `${REFRESH_TOKEN_REDIS_PREFIX}${tokenId}`;
}

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function generateAccessToken(context: AuthContext): string {
  const payload: AccessTokenPayload = {
    sub: context.userId,
    tenantId: context.tenantId,
    roleId: context.roleId,
    roleName: context.roleName,
    roleSlug: context.roleSlug,
    permissions: context.permissions,
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL_SECONDS });
}

/**
 * Refresh tokens are opaque (not JWTs): `${tokenId}.${secret}`. Only a sha256 hash of the
 * secret is stored in Redis, keyed by tokenId, so a leaked Redis dump doesn't hand out usable
 * tokens. Revocation is a single key delete rather than a JWT blocklist. `ttlSeconds` is carried
 * forward on every rotation (see `rotateRefreshToken`) so a "remembered" session stays
 * long-lived across refreshes instead of reverting to the default TTL after its first rotation.
 */
export async function issueRefreshToken(
  identity: RefreshIdentity,
  ttlSeconds: number = env.JWT_REFRESH_TTL_SECONDS,
): Promise<IssuedRefreshToken> {
  const tokenId = randomUUID();
  const secret = randomBytes(32).toString("hex");

  const record: StoredRefreshToken = {
    userId: identity.userId,
    tenantId: identity.tenantId,
    secretHash: hashSecret(secret),
    ttlSeconds,
  };

  await redis.set(refreshTokenRedisKey(tokenId), JSON.stringify(record), "EX", ttlSeconds);

  return { token: `${tokenId}.${secret}`, tokenId, expiresAt: new Date(Date.now() + ttlSeconds * 1000) };
}

export async function revokeRefreshTokenById(tokenId: string): Promise<void> {
  await redis.del(refreshTokenRedisKey(tokenId));
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const [tokenId] = token.split(".");
  if (!tokenId) return;
  await revokeRefreshTokenById(tokenId);
}

/**
 * Verifies the refresh token and immediately rotates it (deletes the old Redis entry and issues
 * a new one), returning the bare identity it was issued for. Rotation on every use limits the
 * blast radius of a stolen refresh token to a single request.
 */
export async function rotateRefreshToken(
  token: string,
): Promise<RefreshIdentity & { previousTokenId: string; next: IssuedRefreshToken }> {
  const [tokenId, secret] = token.split(".");
  if (!tokenId || !secret) {
    throw AppError.unauthorized("Malformed refresh token");
  }

  const raw = await redis.get(refreshTokenRedisKey(tokenId));
  if (!raw) {
    throw AppError.unauthorized("Refresh token expired or already used");
  }

  const stored = JSON.parse(raw) as StoredRefreshToken;
  const providedHash = hashSecret(secret);
  const storedHashBuffer = Buffer.from(stored.secretHash, "hex");
  const providedHashBuffer = Buffer.from(providedHash, "hex");

  const isValid =
    storedHashBuffer.length === providedHashBuffer.length &&
    timingSafeEqual(storedHashBuffer, providedHashBuffer);

  // Always invalidate the presented token, valid or not, so a replayed stale token can't be reused.
  await revokeRefreshTokenById(tokenId);

  if (!isValid) {
    throw AppError.unauthorized("Invalid refresh token");
  }

  const next = await issueRefreshToken({ userId: stored.userId, tenantId: stored.tenantId }, stored.ttlSeconds);
  return { userId: stored.userId, tenantId: stored.tenantId, previousTokenId: tokenId, next };
}
