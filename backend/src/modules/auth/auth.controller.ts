import type { CookieOptions, Request, Response } from "express";

import { env } from "../../config/env.js";
import { AppError } from "../../utils/app-error.js";
import * as authService from "./auth.service.js";
import type { DeviceContext } from "./auth.service.js";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterMemberInput,
  RegisterOrganizerInput,
  ResendVerificationEmailInput,
  ResetPasswordInput,
  RequestOtpInput,
  VerifyEmailInput,
  VerifyOtpInput,
} from "./auth.validators.js";

const REFRESH_COOKIE_NAME = "kuripro_rt";

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api",
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

export async function registerMemberSelf(req: Request, res: Response): Promise<void> {
  const input = req.body as RegisterMemberInput;
  const result = await authService.registerMemberSelf(input, extractDeviceContext(req, input));
  res.status(201).json(result);
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const input = req.body as VerifyEmailInput;
  const result = await authService.verifyEmail(input.email, input.code, extractDeviceContext(req, input));
  if (result.refreshToken) {
    setRefreshCookie(res, result.refreshToken);
  }
  res.status(200).json(result);
}

export async function resendVerificationEmail(req: Request, res: Response): Promise<void> {
  const input = req.body as ResendVerificationEmailInput;
  const result = await authService.resendVerificationEmail(input.email);
  res.status(200).json({ message: "A new verification code has been sent to your email.", ...result });
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
  res.status(200).json({ message: "Password has been successfully reset. Please log in with your new password." });
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
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
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


