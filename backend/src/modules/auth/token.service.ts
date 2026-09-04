import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

import jwt from "jsonwebtoken";

import { env } from "../../config/env.js";
import type { AccessTokenPayload, AuthContext } from "../../types/auth.js";
import { AppError } from "../../utils/app-error.js";
import { Session } from "../sessions/session.model.js";
import { findSessionByAnyTokenId, touchSession } from "../sessions/session.repository.js";

/** "Remember this device" sessions get a much longer-lived refresh token than a default login. */
export const REMEMBERED_DEVICE_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days

export interface RefreshIdentity {
  userId: string;
  tenantId: string | null;
}

export interface IssuedRefreshToken {
  token: string;
  tokenId: string;
  secretHash: string;
  expiresAt: Date;
}

export function hashSecret(secret: string): string {
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
  _identity: RefreshIdentity,
  ttlSeconds: number = env.JWT_REFRESH_TTL_SECONDS,
): Promise<IssuedRefreshToken> {
  const tokenId = randomUUID();
  const secret = randomBytes(32).toString("hex");
  const expiresAtMs = Date.now() + ttlSeconds * 1000;
  const secretHash = hashSecret(secret);

  return {
    token: `${tokenId}.${secret}`,
    tokenId,
    secretHash,
    expiresAt: new Date(expiresAtMs),
  };
}

export async function revokeRefreshTokenById(tokenId: string): Promise<void> {
  await Session.updateOne({ tokenId, tenantId: { $exists: true } }, { $set: { revokedAt: new Date() } });
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

  const lookup = await findSessionByAnyTokenId(tokenId);
  if (!lookup) {
    throw AppError.unauthorized("Refresh token expired or already used");
  }

  const { session, isGracePeriod } = lookup;
  if (session.revokedAt || session.expiresAt.getTime() < Date.now()) {
    throw AppError.unauthorized("Refresh token expired or already used");
  }

  const providedHash = hashSecret(secret);
  const expectedHash = isGracePeriod ? session.previousSecretHash : session.secretHash;

  if (!expectedHash) {
    throw AppError.unauthorized("Invalid refresh token");
  }

  const storedHashBuffer = Buffer.from(expectedHash, "hex");
  const providedHashBuffer = Buffer.from(providedHash, "hex");

  const isValid =
    storedHashBuffer.length === providedHashBuffer.length &&
    timingSafeEqual(storedHashBuffer, providedHashBuffer);

  if (!isValid) {
    throw AppError.unauthorized("Invalid refresh token");
  }

  const ttlSeconds = session.isTrusted ? REMEMBERED_DEVICE_TTL_SECONDS : env.JWT_REFRESH_TTL_SECONDS;
  const newTokenId = randomUUID();
  const newSecret = randomBytes(32).toString("hex");
  const newExpiresAt = new Date(Date.now() + ttlSeconds * 1000);
  const newSecretHash = hashSecret(newSecret);

  await touchSession(session, newTokenId, newSecretHash, newExpiresAt);

  const next: IssuedRefreshToken = {
    token: `${newTokenId}.${newSecret}`,
    tokenId: newTokenId,
    secretHash: newSecretHash,
    expiresAt: newExpiresAt,
  };

  return {
    userId: session.userId.toString(),
    tenantId: session.tenantId ? session.tenantId.toString() : null,
    previousTokenId: tokenId,
    next,
  };
}
