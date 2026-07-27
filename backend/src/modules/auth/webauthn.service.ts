import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";

import { env } from "../../config/env.js";
import { redis } from "../../config/redis.js";
import { AppError } from "../../utils/app-error.js";
import { findUserByEmail, findUserById } from "../users/user.repository.js";
import { recordActivity } from "../activity-logs/activity-log.service.js";
import { issueAuthResult, type AuthResult, type DeviceContext } from "./auth.service.js";
import {
  createCredential,
  deleteCredential,
  findCredentialByCredentialId,
  listCredentialsByUser,
  updateCredentialCounter,
} from "./webauthn.repository.js";

const RP_ID = env.WEBAUTHN_RP_ID;
const RP_NAME = env.WEBAUTHN_RP_NAME;
const ORIGIN = env.WEBAUTHN_ORIGIN;
const CHALLENGE_TTL_SECONDS = 300;

const regChallengeKey = (userId: string): string => `webauthn:reg:${userId}`;
const authChallengeKey = (email: string): string => `webauthn:auth:${email.toLowerCase()}`;

function assertCanLogin(status: string): void {
  if (status === "SUSPENDED") throw AppError.forbidden("Your account has been suspended");
  if (status === "PENDING_APPROVAL") throw AppError.forbidden("Your account is awaiting approval", "PENDING_APPROVAL");
}

// --- Registration (authenticated: enroll a passkey for the current user) ---

export async function getRegistrationOptions(userId: string): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const user = await findUserById(userId);
  if (!user) throw AppError.unauthorized();

  const existing = await listCredentialsByUser(userId);
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: new TextEncoder().encode(userId),
    userName: user.email,
    userDisplayName: user.name,
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({
      id: c.credentialId,
      transports: c.transports as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
  });

  await redis.set(regChallengeKey(userId), options.challenge, "EX", CHALLENGE_TTL_SECONDS);
  return options;
}

export async function verifyRegistration(
  userId: string,
  tenantId: string | null,
  response: RegistrationResponseJSON,
  deviceLabel?: string,
): Promise<{ verified: boolean }> {
  const expectedChallenge = await redis.get(regChallengeKey(userId));
  if (!expectedChallenge) throw AppError.badRequest("Registration challenge expired — please try again");

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw AppError.badRequest("Passkey registration could not be verified");
  }

  const { credential } = verification.registrationInfo;
  await createCredential({
    tenantId,
    userId,
    credentialId: credential.id,
    publicKey: Buffer.from(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports ?? [],
    deviceLabel: deviceLabel?.trim() || "Passkey",
  });
  await redis.del(regChallengeKey(userId));

  await recordActivity({
    tenantId,
    userId,
    action: "PASSKEY_REGISTERED",
    message: `Registered a passkey (${deviceLabel?.trim() || "Passkey"})`,
  });

  return { verified: true };
}

// --- Authentication (public: sign in with a passkey) ---

export async function getAuthenticationOptions(email: string): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const user = await findUserByEmail(email);
  // Don't leak whether the account exists: always return options. With no credentials the browser
  // simply finds nothing to sign with and the ceremony fails the same way a wrong passkey would.
  const credentials = user ? await listCredentialsByUser(user._id.toString()) : [];

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: credentials.map((c) => ({
      id: c.credentialId,
      transports: c.transports as AuthenticatorTransportFuture[],
    })),
    userVerification: "preferred",
  });

  await redis.set(authChallengeKey(email), options.challenge, "EX", CHALLENGE_TTL_SECONDS);
  return options;
}

export async function verifyAuthentication(
  email: string,
  response: AuthenticationResponseJSON,
  deviceContext: DeviceContext = {},
): Promise<AuthResult> {
  const expectedChallenge = await redis.get(authChallengeKey(email));
  if (!expectedChallenge) throw AppError.badRequest("Sign-in challenge expired — please try again");

  const credential = await findCredentialByCredentialId(response.id);
  if (!credential) throw AppError.unauthorized("This passkey isn't registered", "INVALID_CREDENTIALS");

  const user = await findUserById(credential.userId.toString());
  // The passkey must belong to the account being claimed — otherwise a valid passkey for account A
  // could be used to sign into account B.
  if (!user || user.email.toLowerCase() !== email.toLowerCase()) {
    throw AppError.unauthorized("This passkey doesn't match that account", "INVALID_CREDENTIALS");
  }
  assertCanLogin(user.status);

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    credential: {
      id: credential.credentialId,
      publicKey: new Uint8Array(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports as AuthenticatorTransportFuture[],
    },
  });

  if (!verification.verified) throw AppError.unauthorized("Passkey verification failed", "INVALID_CREDENTIALS");

  await updateCredentialCounter(credential.credentialId, verification.authenticationInfo.newCounter);
  await redis.del(authChallengeKey(email));

  if (user.status === "INVITED") {
    user.status = "ACTIVE";
    await user.save();
  }

  await recordActivity({
    tenantId: user.tenantId,
    userId: user._id,
    action: "PASSKEY_LOGIN_SUCCEEDED",
    message: "Logged in with a passkey",
    ipAddress: deviceContext.ipAddress,
    userAgent: deviceContext.userAgent,
  });

  return issueAuthResult(user, deviceContext);
}

// --- Management ---

export interface PasskeySummary {
  id: string;
  deviceLabel: string;
  createdAt: Date;
  lastUsedAt?: Date;
}

export async function listPasskeys(userId: string): Promise<PasskeySummary[]> {
  const credentials = await listCredentialsByUser(userId);
  return credentials.map((c) => ({
    id: c._id.toString(),
    deviceLabel: c.deviceLabel,
    createdAt: c.createdAt,
    lastUsedAt: c.lastUsedAt,
  }));
}

export async function removePasskey(userId: string, id: string): Promise<void> {
  const deleted = await deleteCredential(userId, id);
  if (!deleted) throw AppError.notFound("Passkey not found");
}
