import type { CookieOptions, Request, Response } from "express";

import { env } from "../../config/env.js";
import { AppError } from "../../utils/app-error.js";
import * as authService from "./auth.service.js";
import type { DeviceContext } from "./auth.service.js";
import * as webauthnService from "./webauthn.service.js";
import type {
  WebauthnLoginOptionsInput,
  WebauthnLoginVerifyInput,
  WebauthnRegisterVerifyInput,
} from "./webauthn.validators.js";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterOrganizerInput,
  ResetPasswordInput,
  RequestOtpInput,
  VerifyOtpInput,
} from "./auth.validators.js";

const REFRESH_COOKIE_NAME = "kuripro_rt";

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api/v1",
  maxAge: env.JWT_REFRESH_TTL_SECONDS * 1000,
};

function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
}

function readRefreshCookieValue(req: Request): string | undefined {
  return (req.cookies as Record<string, string | undefined> | undefined)?.[REFRESH_COOKIE_NAME];
}

function readRefreshCookie(req: Request): string {
  const token = readRefreshCookieValue(req);
  if (!token) {
    throw AppError.unauthorized("Missing refresh token");
  }
  return token;
}

/** Merges client-supplied device fields (body) with server-observed connection info. */
function extractDeviceContext(req: Request, body: Partial<DeviceContext> = {}): DeviceContext {
  return {
    deviceId: body.deviceId,
    deviceLabel: body.deviceLabel,
    rememberDevice: body.rememberDevice,
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  };
}

export async function registerOrganizer(req: Request, res: Response): Promise<void> {
  const input = req.body as RegisterOrganizerInput;
  const result = await authService.registerOrganizer(input, extractDeviceContext(req, input));
  if (result.refreshToken) {
    setRefreshCookie(res, result.refreshToken);
  }
  res.status(201).json(result);
}

export async function login(req: Request, res: Response): Promise<void> {
  const input = req.body as LoginInput;
  const result = await authService.login(input, extractDeviceContext(req, input));
  setRefreshCookie(res, result.refreshToken);
  res.status(200).json({ accessToken: result.accessToken, deviceId: result.deviceId, user: result.user });
}

export async function requestOtp(req: Request, res: Response): Promise<void> {
  const input = req.body as RequestOtpInput;
  const result = await authService.requestOtp(input.email);
  res.status(200).json({ message: "If an account exists for this email, a code has been sent.", ...result });
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const input = req.body as VerifyOtpInput;
  const result = await authService.verifyOtpLogin(input.email, input.code, extractDeviceContext(req, input));
  setRefreshCookie(res, result.refreshToken);
  res.status(200).json({ accessToken: result.accessToken, deviceId: result.deviceId, user: result.user });
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const input = req.body as ForgotPasswordInput;
  const result = await authService.forgotPassword(input.email);
  res.status(200).json({ message: "If an account exists for this email, a reset code has been sent.", ...result });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const input = req.body as ResetPasswordInput;
  await authService.resetPassword(input.email, input.code, input.newPassword);
  res.status(204).send();
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const token = readRefreshCookie(req);
  const result = await authService.refreshSession(token);
  setRefreshCookie(res, result.refreshToken);
  res.status(200).json({ accessToken: result.accessToken, user: result.user });
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const input = req.body as ChangePasswordInput;
  if (!req.auth) {
    throw AppError.unauthorized();
  }
  await authService.changePassword(req.auth.userId, input.currentPassword, input.newPassword);
  res.status(204).send();
}

export async function logout(req: Request, res: Response): Promise<void> {
  const token = readRefreshCookieValue(req);
  if (token) {
    await authService.logout(token);
  }
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/v1/auth" });
  res.status(204).send();
}

export async function listSessions(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    throw AppError.unauthorized();
  }
  const sessions = await authService.listSessions(req.auth.userId, req.auth.tenantId, readRefreshCookieValue(req));
  res.status(200).json({ sessions });
}

export async function revokeSession(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    throw AppError.unauthorized();
  }
  await authService.revokeSessionById(req.params["id"] as string, req.auth.userId, req.auth.tenantId);
  res.status(204).send();
}

export async function revokeOtherSessions(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    throw AppError.unauthorized();
  }
  await authService.revokeOtherSessions(req.auth.userId, req.auth.tenantId, readRefreshCookieValue(req));
  res.status(204).send();
}

// --- WebAuthn / passkeys (biometric login) ---

export async function webauthnRegisterOptions(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw AppError.unauthorized();
  const options = await webauthnService.getRegistrationOptions(req.auth.userId);
  res.status(200).json({ options });
}

export async function webauthnRegisterVerify(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw AppError.unauthorized();
  const input = req.body as WebauthnRegisterVerifyInput;
  const result = await webauthnService.verifyRegistration(
    req.auth.userId,
    req.auth.tenantId,
    input.response as unknown as RegistrationResponseJSON,
    input.deviceLabel,
  );
  res.status(201).json(result);
}

export async function webauthnLoginOptions(req: Request, res: Response): Promise<void> {
  const input = req.body as WebauthnLoginOptionsInput;
  const options = await webauthnService.getAuthenticationOptions(input.email);
  res.status(200).json({ options });
}

export async function webauthnLoginVerify(req: Request, res: Response): Promise<void> {
  const input = req.body as WebauthnLoginVerifyInput;
  const result = await webauthnService.verifyAuthentication(
    input.email,
    input.response as unknown as AuthenticationResponseJSON,
    extractDeviceContext(req, input),
  );
  setRefreshCookie(res, result.refreshToken);
  res.status(200).json({ accessToken: result.accessToken, deviceId: result.deviceId, user: result.user });
}

export async function listPasskeys(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw AppError.unauthorized();
  const passkeys = await webauthnService.listPasskeys(req.auth.userId);
  res.status(200).json({ passkeys });
}

export async function deletePasskey(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw AppError.unauthorized();
  await webauthnService.removePasskey(req.auth.userId, req.params["id"] as string);
  res.status(204).send();
}
