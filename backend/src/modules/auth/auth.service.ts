import { randomBytes, randomUUID } from "node:crypto";

import mongoose from "mongoose";

import { recordActivity } from "../activity-logs/activity-log.service.js";
import { deliverOtp } from "../otp/otp.delivery.js";
import { generateOtp, verifyOtp } from "../otp/otp.service.js";
import { findRoleById } from "../roles/role.repository.js";
import { seedSystemRolesForOrganization } from "../roles/role.service.js";
import {
  findSessionById,
  findSessionByTokenId,
  findSessionByTokenIdAnyTenant,
  listActiveSessions,
  revokeAllSessions as repoRevokeAllSessions,
  revokeSession as repoRevokeSession,
  touchSession,
  upsertSession,
} from "../sessions/session.repository.js";
import type { SessionDocument } from "../sessions/session.model.js";
import { createTenant, findTenantBySlug } from "../tenants/tenant.repository.js";
import { Tenant } from "../tenants/tenant.model.js";
import { createUser, findUserByEmail, findUserById, findUserByPhoneOrEmail, saveUser } from "../users/user.repository.js";
import type { UserDocument } from "../users/user.model.js";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/app-error.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import { slugify } from "../../utils/slugify.js";
import type { AuthContext } from "../../types/auth.js";
import type { RegisterOrganizerInput, LoginInput } from "./auth.validators.js";
import {
  generateAccessToken,
  issueRefreshToken,
  revokeRefreshToken,
  revokeRefreshTokenById,
  rotateRefreshToken,
  REMEMBERED_DEVICE_TTL_SECONDS,
} from "./token.service.js";

const TRIAL_PERIOD_DAYS = 14;

export interface DeviceContext {
  deviceId?: string;
  deviceLabel?: string;
  userAgent?: string;
  ipAddress?: string;
  rememberDevice?: boolean;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  deviceId: string;
  user: {
    id: string;
    tenantId: string | null;
    role: { id: string; name: string; slug?: string };
    permissions: string[];
    name: string;
    email: string;
    mustChangePassword: boolean;
  };
}

export interface SessionSummary {
  id: string;
  deviceId: string;
  deviceLabel: string;
  isTrusted: boolean;
  ipAddress?: string;
  lastUsedAt: Date;
  createdAt: Date;
  isCurrent: boolean;
}

type IssuableUser = Pick<UserDocument, "_id" | "tenantId" | "roleId" | "name" | "email" | "mustChangePassword">;

function tokenIdOf(rawToken: string | undefined): string | undefined {
  return rawToken?.split(".")[0];
}

/** SUSPENDED and PENDING_APPROVAL accounts are blocked from every login path (password, OTP). */
function assertUserCanLogin(user: Pick<UserDocument, "status">): void {
  if (user.status === "SUSPENDED") {
    throw AppError.forbidden("Your account has been suspended");
  }
  if (user.status === "PENDING_APPROVAL") {
    throw AppError.forbidden("Your account is awaiting approval from your organizer", "PENDING_APPROVAL");
  }
}

async function generateUniqueSlug(tenantName: string): Promise<string> {
  const base = slugify(tenantName) || "tenant";
  let candidate = base;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const existing = await findTenantBySlug(candidate);
    if (!existing) return candidate;
    candidate = `${base}-${randomBytes(3).toString("hex")}`;
  }

  throw AppError.internal("Could not allocate a unique tenant slug, please try again");
}

/** Resolves a user's role and flattens it into the shape both the JWT and req.auth need. */
async function buildAuthContext(user: IssuableUser): Promise<AuthContext> {
  const tenantId = user.tenantId ? user.tenantId.toString() : null;
  const role = await findRoleById(user.roleId.toString(), tenantId);
  if (!role) {
    throw AppError.internal("This user's role could not be resolved");
  }

  return {
    userId: user._id.toString(),
    tenantId,
    roleId: role._id.toString(),
    roleName: role.name,
    roleSlug: role.slug,
    permissions: role.permissionKeys,
  };
}

export async function issueAuthResult(user: IssuableUser, deviceContext: DeviceContext = {}): Promise<AuthResult> {
  const context = await buildAuthContext(user);
  const ttlSeconds = deviceContext.rememberDevice ? REMEMBERED_DEVICE_TTL_SECONDS : env.JWT_REFRESH_TTL_SECONDS;
  const deviceId = deviceContext.deviceId ?? randomUUID();

  const [accessToken, issued] = await Promise.all([
    Promise.resolve(generateAccessToken(context)),
    issueRefreshToken({ userId: context.userId, tenantId: context.tenantId }, ttlSeconds),
  ]);

  await upsertSession({
    tenantId: context.tenantId,
    userId: context.userId,
    tokenId: issued.tokenId,
    deviceId,
    deviceLabel: deviceContext.deviceLabel ?? "Unknown device",
    userAgent: deviceContext.userAgent,
    ipAddress: deviceContext.ipAddress,
    isTrusted: Boolean(deviceContext.rememberDevice),
    expiresAt: issued.expiresAt,
  });

  return {
    accessToken,
    refreshToken: issued.token,
    deviceId,
    user: {
      id: context.userId,
      tenantId: context.tenantId,
      role: { id: context.roleId, name: context.roleName, slug: context.roleSlug },
      permissions: context.permissions,
      name: user.name,
      email: user.email,
      mustChangePassword: user.mustChangePassword,
    },
  };
}

export async function registerOrganizer(
  input: RegisterOrganizerInput,
  _deviceContext: DeviceContext = {},
): Promise<{ isPendingApproval: boolean; message: string }> {
  const slug = await generateUniqueSlug(input.tenantName);
  const passwordHash = await hashPassword(input.organizerPassword);

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const tenant = await createTenant(
        {
          name: input.tenantName,
          slug,
          registrationNumber: input.registrationNumber,
          contactEmail: input.contactEmail,
          contactPhone: input.contactPhone,
          address: input.address,
          subscription: {
            plan: "TRIAL",
            status: "TRIALING",
            currentPeriodEnd: new Date(Date.now() + TRIAL_PERIOD_DAYS * 24 * 60 * 60 * 1000),
          },
        },
        session,
      );

      const roles = await seedSystemRolesForOrganization(tenant._id, session);

      await createUser(
        {
          tenantId: tenant._id,
          roleId: roles.ORGANIZER._id,
          name: input.organizerName,
          email: input.organizerEmail,
          phone: input.organizerPhone,
          passwordHash,
          status: "PENDING_APPROVAL",
        },
        session,
      );
    });

    return {
      isPendingApproval: true,
      message: "Organization registration submitted successfully. It is currently under Super Admin review and will be activated upon approval.",
    };
  } finally {
    await session.endSession();
  }
}

export async function login(input: LoginInput, deviceContext: DeviceContext = {}): Promise<AuthResult> {
  const user = await findUserByPhoneOrEmail(input.email, { withPassword: true });
  if (!user) {
    throw AppError.unauthorized("Invalid credentials", "INVALID_CREDENTIALS");
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);
  if (!passwordMatches) {
    await recordActivity({
      tenantId: user.tenantId,
      userId: user._id,
      action: "LOGIN_FAILED",
      message: "Incorrect password",
      ipAddress: deviceContext.ipAddress,
      userAgent: deviceContext.userAgent,
    });
    throw AppError.unauthorized("Invalid credentials", "INVALID_CREDENTIALS");
  }

  // Check tenant status if applicable
  if (user.tenantId) {
    const tenant = await Tenant.findById(user.tenantId);
    if (!tenant) {
      throw AppError.forbidden("Organization not found");
    }
    if (tenant.status === "PENDING_APPROVAL") {
      throw AppError.forbidden("Your organization registration is currently pending Super Admin review", "PENDING_APPROVAL");
    }
    if (tenant.status === "SUSPENDED") {
      throw AppError.forbidden("Your organization account has been suspended by the platform administrator", "TENANT_SUSPENDED");
    }
    if (tenant.status === "REJECTED") {
      throw AppError.forbidden("Your organization registration was not approved", "REJECTED");
    }
  }

  assertUserCanLogin(user);

  if (user.status === "INVITED") {
    user.status = "ACTIVE";
  }
  user.lastLoginAt = new Date();
  await saveUser(user);

  await recordActivity({
    tenantId: user.tenantId,
    userId: user._id,
    action: "LOGIN_SUCCEEDED",
    message: "Logged in with password",
    ipAddress: deviceContext.ipAddress,
    userAgent: deviceContext.userAgent,
  });

  return issueAuthResult(user, deviceContext);
}

/** Always returns the same shape whether or not the email is registered — no user enumeration. */
export async function requestOtp(email: string): Promise<{ devOtp?: string }> {
  const user = await findUserByEmail(email);
  if (!user) {
    return {};
  }

  const code = await generateOtp(user._id, user.email, "LOGIN");
  await deliverOtp(user.email, "LOGIN", code);
  await recordActivity({
    tenantId: user.tenantId,
    userId: user._id,
    action: "OTP_REQUESTED",
    message: "Requested a login code",
  });

  return env.NODE_ENV !== "production" ? { devOtp: code } : {};
}

export async function verifyOtpLogin(
  email: string,
  code: string,
  deviceContext: DeviceContext = {},
): Promise<AuthResult> {
  const userId = await verifyOtp(email, "LOGIN", code);
  const user = await findUserById(userId.toString());
  if (!user) {
    throw AppError.unauthorized();
  }

  assertUserCanLogin(user);

  if (user.status === "INVITED") {
    user.status = "ACTIVE";
  }
  user.lastLoginAt = new Date();
  await saveUser(user);

  await recordActivity({
    tenantId: user.tenantId,
    userId: user._id,
    action: "OTP_LOGIN_SUCCEEDED",
    message: "Logged in with a one-time code",
    ipAddress: deviceContext.ipAddress,
    userAgent: deviceContext.userAgent,
  });

  return issueAuthResult(user, deviceContext);
}

/** Always returns the same shape whether or not the email is registered — no user enumeration. */
export async function forgotPassword(email: string): Promise<{ devOtp?: string }> {
  const user = await findUserByEmail(email);
  if (!user) {
    return {};
  }

  const code = await generateOtp(user._id, user.email, "PASSWORD_RESET");
  await deliverOtp(user.email, "PASSWORD_RESET", code);
  await recordActivity({
    tenantId: user.tenantId,
    userId: user._id,
    action: "PASSWORD_RESET_REQUESTED",
    message: "Requested a password reset",
  });

  return env.NODE_ENV !== "production" ? { devOtp: code } : {};
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  const userId = await verifyOtp(email, "PASSWORD_RESET", code);
  const user = await findUserById(userId.toString());
  if (!user) {
    throw AppError.unauthorized();
  }

  user.passwordHash = await hashPassword(newPassword);
  user.mustChangePassword = false;
  await saveUser(user);

  await revokeAllSessionsForUser(user._id.toString(), user.tenantId ? user.tenantId.toString() : null);
  await recordActivity({
    tenantId: user.tenantId,
    userId: user._id,
    action: "PASSWORD_RESET_COMPLETED",
    message: "Password reset via one-time code — all sessions revoked",
  });
}

/**
 * Changing a password revokes every active session (including the current one) — the safest
 * default. The caller will need to log in again with the new password on every device.
 */
export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await findUserById(userId, { withPassword: true });
  if (!user) {
    throw AppError.unauthorized();
  }

  const passwordMatches = await verifyPassword(currentPassword, user.passwordHash);
  if (!passwordMatches) {
    throw AppError.unauthorized("Current password is incorrect", "INVALID_CREDENTIALS");
  }

  user.passwordHash = await hashPassword(newPassword);
  user.mustChangePassword = false;
  await saveUser(user);

  await revokeAllSessionsForUser(userId, user.tenantId ? user.tenantId.toString() : null);
  await recordActivity({
    tenantId: user.tenantId,
    userId: user._id,
    action: "PASSWORD_CHANGED",
    message: "Password changed — all sessions revoked",
  });
}

/**
 * Re-resolves the user's current role/permissions from the database on every refresh (rather
 * than trusting anything cached from login) so a permission change takes effect within one
 * access-token lifetime (15 min), not after the refresh token's full 30–90 day life.
 *
 * Also returns the full user/permissions payload (same shape as login) — the frontend calls this
 * on app load to silently bootstrap "who am I" from the httpOnly cookie, with no separate `/me`
 * round-trip needed.
 */
export async function refreshSession(refreshToken: string): Promise<Omit<AuthResult, "deviceId">> {
  const { userId, tenantId, previousTokenId, next } = await rotateRefreshToken(refreshToken);

  const user = await findUserById(userId);
  if (!user) {
    throw AppError.unauthorized();
  }
  const context = await buildAuthContext(user);

  const session = await findSessionByTokenId(previousTokenId, tenantId);
  if (session) {
    await touchSession(session, next.tokenId, next.expiresAt);
  }

  return {
    accessToken: generateAccessToken(context),
    refreshToken: next.token,
    user: {
      id: context.userId,
      tenantId: context.tenantId,
      role: { id: context.roleId, name: context.roleName, slug: context.roleSlug },
      permissions: context.permissions,
      name: user.name,
      email: user.email,
      mustChangePassword: user.mustChangePassword,
    },
  };
}

export async function logout(refreshToken: string): Promise<void> {
  const tokenId = tokenIdOf(refreshToken);
  if (tokenId) {
    const session = await findSessionByTokenIdAnyTenant(tokenId);
    if (session) {
      await recordActivity({
        tenantId: session.tenantId,
        userId: session.userId,
        action: "LOGOUT",
        message: `Logged out (${session.deviceLabel})`,
      });
      await repoRevokeSession(session);
    }
  }

  await revokeRefreshToken(refreshToken);
}

function toSessionSummary(session: SessionDocument, currentTokenId: string | undefined): SessionSummary {
  return {
    id: session._id.toString(),
    deviceId: session.deviceId,
    deviceLabel: session.deviceLabel,
    isTrusted: session.isTrusted,
    ipAddress: session.ipAddress,
    lastUsedAt: session.lastUsedAt,
    createdAt: session.createdAt,
    isCurrent: session.tokenId === currentTokenId,
  };
}

export async function listSessions(
  userId: string,
  tenantId: string | null,
  currentRefreshToken?: string,
): Promise<SessionSummary[]> {
  const currentTokenId = tokenIdOf(currentRefreshToken);
  const sessions = await listActiveSessions(userId, tenantId);
  return sessions.map((session) => toSessionSummary(session, currentTokenId));
}

export async function revokeSessionById(sessionId: string, userId: string, tenantId: string | null): Promise<void> {
  const session = await findSessionById(sessionId, userId, tenantId);
  if (!session) {
    throw AppError.notFound("Session not found");
  }

  await revokeRefreshTokenById(session.tokenId);
  await repoRevokeSession(session);
  await recordActivity({
    tenantId,
    userId,
    action: "SESSION_REVOKED",
    message: `Revoked session (${session.deviceLabel})`,
  });
}

/** Used internally by password change/reset — revokes every session with no exception. */
async function revokeAllSessionsForUser(userId: string, tenantId: string | null): Promise<void> {
  const tokenIds = await repoRevokeAllSessions(userId, tenantId);
  await Promise.all(tokenIds.map((tokenId) => revokeRefreshTokenById(tokenId)));
}

/** User-facing "log out all other devices" — keeps the session tied to `currentRefreshToken` alive. */
export async function revokeOtherSessions(
  userId: string,
  tenantId: string | null,
  currentRefreshToken?: string,
): Promise<void> {
  const currentTokenId = tokenIdOf(currentRefreshToken);
  const tokenIds = await repoRevokeAllSessions(userId, tenantId, currentTokenId);
  await Promise.all(tokenIds.map((tokenId) => revokeRefreshTokenById(tokenId)));
  await recordActivity({
    tenantId,
    userId,
    action: "ALL_SESSIONS_REVOKED",
    message: "Revoked all other sessions",
  });
}

