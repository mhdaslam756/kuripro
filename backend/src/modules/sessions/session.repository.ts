import type { ObjectIdLike } from "../../utils/mongoose-helpers.js";
import { Session, type SessionDocument } from "./session.model.js";

export interface UpsertSessionInput {
  tenantId: ObjectIdLike | null;
  userId: ObjectIdLike;
  tokenId: string;
  secretHash: string;
  deviceId: string;
  deviceLabel: string;
  userAgent?: string;
  ipAddress?: string;
  isTrusted: boolean;
  expiresAt: Date;
}

/**
 * A device reusing the same `deviceId` refreshes its existing session row (new tokenId, bumped
 * expiry) instead of accumulating a new row every login — the session list should reflect
 * distinct devices, not distinct logins.
 */
export async function upsertSession(data: UpsertSessionInput): Promise<SessionDocument> {
  const now = new Date();

  const session = await Session.findOneAndUpdate(
    { tenantId: data.tenantId, userId: data.userId, deviceId: data.deviceId, revokedAt: { $exists: false } },
    {
      $set: {
        tokenId: data.tokenId,
        secretHash: data.secretHash,
        deviceLabel: data.deviceLabel,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        isTrusted: data.isTrusted,
        lastUsedAt: now,
        expiresAt: data.expiresAt,
      },
    },
    { returnDocument: "after", upsert: true },
  );

  return session;
}

export async function findSessionByTokenId(
  tokenId: string,
  tenantId: ObjectIdLike | null,
): Promise<SessionDocument | null> {
  return Session.findOne({ tenantId, tokenId });
}

/**
 * Looks up an active session by current tokenId OR by previousTokenId if within the rotation grace period window.
 */
export async function findSessionByAnyTokenId(
  tokenId: string,
): Promise<{ session: SessionDocument; isGracePeriod: boolean } | null> {
  const currentSession = await Session.findOne({
    tokenId,
    tenantId: { $exists: true },
    revokedAt: { $exists: false },
  });
  if (currentSession) {
    return { session: currentSession, isGracePeriod: false };
  }

  const graceSession = await Session.findOne({
    previousTokenId: tokenId,
    tenantId: { $exists: true },
    revokedAt: { $exists: false },
    previousTokenExpiresAt: { $gt: new Date() },
  });
  if (graceSession) {
    return { session: graceSession, isGracePeriod: true };
  }

  return null;
}

/**
 * Looks up a session by its globally-unique tokenId without knowing the tenant in advance (e.g.
 * at logout, before the raw cookie token has been decoded into a tenant context). `tokenId` has
 * a unique index, so this is a narrow, single-record lookup.
 */
export async function findSessionByTokenIdAnyTenant(tokenId: string): Promise<SessionDocument | null> {
  return Session.findOne({ tokenId, tenantId: { $exists: true } });
}

export async function touchSession(
  session: SessionDocument,
  tokenId: string,
  secretHash: string,
  expiresAt: Date,
): Promise<void> {
  session.previousTokenId = session.tokenId;
  session.previousSecretHash = session.secretHash;
  session.previousTokenExpiresAt = new Date(Date.now() + 30_000); // 30-second rotation grace period
  session.tokenId = tokenId;
  session.secretHash = secretHash;
  session.lastUsedAt = new Date();
  session.expiresAt = expiresAt;
  await session.save();
}

export async function listActiveSessions(
  userId: ObjectIdLike,
  tenantId: ObjectIdLike | null,
): Promise<SessionDocument[]> {
  return Session.find({ tenantId, userId, revokedAt: { $exists: false } }).sort({ lastUsedAt: -1 });
}

export async function findSessionById(
  id: string,
  userId: ObjectIdLike,
  tenantId: ObjectIdLike | null,
): Promise<SessionDocument | null> {
  return Session.findOne({ tenantId, _id: id, userId });
}

export async function revokeSession(session: SessionDocument): Promise<void> {
  session.revokedAt = new Date();
  await session.save();
}

export async function revokeAllSessions(
  userId: ObjectIdLike,
  tenantId: ObjectIdLike | null,
  exceptTokenId?: string,
): Promise<string[]> {
  const filter = {
    tenantId,
    userId,
    revokedAt: { $exists: false },
    ...(exceptTokenId ? { tokenId: { $ne: exceptTokenId } } : {}),
  };

  const sessions = await Session.find(filter, { tokenId: 1 }).lean();
  await Session.updateMany(filter, { $set: { revokedAt: new Date() } });

  return sessions.map((s) => s.tokenId);
}
