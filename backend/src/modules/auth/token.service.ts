import { randomBytes, randomUUID, timingSafeEqual, createHash } from "node:crypto";

import jwt from "jsonwebtoken";

import { env } from "../../config/env.js";
import type { AccessTokenPayload, AuthContext } from "../../types/auth.js";
import { AppError } from "../../utils/app-error.js";

/** "Remember this device" sessions get a much longer-lived refresh token than a default login. */
export const REMEMBERED_DEVICE_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days

export interface RefreshIdentity {
  userId: string;
  tenantId: string | null;
}

interface StoredRefreshToken extends RefreshIdentity {
  secretHash: string;
  ttlSeconds: number;
  expiresAt: number;
}

export interface IssuedRefreshToken {
  token: string;
  tokenId: string;
  expiresAt: Date;
}

const refreshTokenStore = new Map<string, StoredRefreshToken>();

setInterval(() => {
  const now = Date.now();
  for (const [tokenId, record] of refreshTokenStore.entries()) {
    if (record.expiresAt < now) {
      refreshTokenStore.delete(tokenId);
    }
  }
}, 600_000).unref();

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

export async function issueRefreshToken(
  identity: RefreshIdentity,
  ttlSeconds: number = env.JWT_REFRESH_TTL_SECONDS,
): Promise<IssuedRefreshToken> {
  const tokenId = randomUUID();
  const secret = randomBytes(32).toString("hex");
  const expiresAtMs = Date.now() + ttlSeconds * 1000;

  const record: StoredRefreshToken = {
    userId: identity.userId,
    tenantId: identity.tenantId,
    secretHash: hashSecret(secret),
    ttlSeconds,
    expiresAt: expiresAtMs,
  };

  refreshTokenStore.set(tokenId, record);

  return { token: `${tokenId}.${secret}`, tokenId, expiresAt: new Date(expiresAtMs) };
}

export async function revokeRefreshTokenById(tokenId: string): Promise<void> {
  refreshTokenStore.delete(tokenId);
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const [tokenId] = token.split(".");
  if (!tokenId) return;
  await revokeRefreshTokenById(tokenId);
}

export async function rotateRefreshToken(
  token: string,
): Promise<RefreshIdentity & { previousTokenId: string; next: IssuedRefreshToken }> {
  const [tokenId, secret] = token.split(".");
  if (!tokenId || !secret) {
    throw AppError.unauthorized("Malformed refresh token");
  }

  const stored = refreshTokenStore.get(tokenId);
  if (!stored || stored.expiresAt < Date.now()) {
    if (stored) refreshTokenStore.delete(tokenId);
    throw AppError.unauthorized("Refresh token expired or already used");
  }

  const providedHash = hashSecret(secret);
  const storedHashBuffer = Buffer.from(stored.secretHash, "hex");
  const providedHashBuffer = Buffer.from(providedHash, "hex");

  const isValid =
    storedHashBuffer.length === providedHashBuffer.length &&
    timingSafeEqual(storedHashBuffer, providedHashBuffer);

  await revokeRefreshTokenById(tokenId);

  if (!isValid) {
    throw AppError.unauthorized("Invalid refresh token");
  }

  const next = await issueRefreshToken(
    { userId: stored.userId, tenantId: stored.tenantId },
    stored.ttlSeconds,
  );

  return { userId: stored.userId, tenantId: stored.tenantId, previousTokenId: tokenId, next };
}
