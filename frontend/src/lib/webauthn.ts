import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";

import { api, getDeviceId } from "./api-client";
import type { AuthUser } from "./auth-context";

export interface Passkey {
  id: string;
  deviceLabel: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface PasskeyAuthResult {
  accessToken: string;
  deviceId: string;
  user: AuthUser;
}

export function isWebAuthnSupported(): boolean {
  return browserSupportsWebAuthn();
}

export function platformAuthenticatorAvailable(): Promise<boolean> {
  return platformAuthenticatorIsAvailable();
}

/** Enrolls a new passkey for the signed-in user (Device & Security page). */
export async function registerPasskey(deviceLabel?: string): Promise<void> {
  const { options } = await api.post<{ options: PublicKeyCredentialCreationOptionsJSON }>(
    "/auth/webauthn/register/options",
    {},
  );
  const response = await startRegistration({ optionsJSON: options });
  await api.post("/auth/webauthn/register/verify", { response, deviceLabel });
}

/** Runs the passkey sign-in ceremony and returns the auth result for the auth context to apply. */
export async function authenticateWithPasskey(email: string): Promise<PasskeyAuthResult> {
  const { options } = await api.post<{ options: PublicKeyCredentialRequestOptionsJSON }>(
    "/auth/webauthn/login/options",
    { email },
  );
  const response = await startAuthentication({ optionsJSON: options });
  return api.post<PasskeyAuthResult>("/auth/webauthn/login/verify", {
    email,
    response,
    deviceId: getDeviceId(),
    deviceLabel: navigator.userAgent.slice(0, 100),
  });
}

export function listPasskeys(): Promise<Passkey[]> {
  return api.get<{ passkeys: Passkey[] }>("/auth/webauthn/credentials").then((r) => r.passkeys);
}

export function deletePasskey(id: string): Promise<void> {
  return api.delete(`/auth/webauthn/credentials/${id}`);
}
