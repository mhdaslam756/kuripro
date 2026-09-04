import type { CookieOptions, Request, Response } from "express";

import { env } from "../../config/env.js";
import {
  approveOrganization,
  changeSuperAdminPassword,
  createSuperAdminCredentials,
  getPlatformStatistics,
  listAllOrganizations,
  rejectOrganization,
  setOrganizationStatus,
  superAdminLogin,
} from "./super-admin.service.js";

const REFRESH_COOKIE_NAME = "kuripro_rt";

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api",
  maxAge: env.JWT_REFRESH_TTL_SECONDS * 1000,
};

export async function changeSuperAdminPasswordHandler(req: Request, res: Response): Promise<void> {
  const userId = req.auth?.userId;
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const result = await changeSuperAdminPassword(userId, currentPassword || "", newPassword || "");
  res.status(200).json(result);
}

export async function superAdminLoginHandler(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };
  const deviceContext = {
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  };

  const result = await superAdminLogin(email, password, deviceContext);
  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions);
  res.status(200).json({ accessToken: result.accessToken, deviceId: result.deviceId, user: result.user });
}

export async function createSuperAdminCredentialsHandler(req: Request, res: Response): Promise<void> {
  const deviceContext = {
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  };
  const headerSetupKey = req.headers["x-setup-key"] as string | undefined;

  // Extract from query (for GET) or body (for POST), with fallback to .env
  const query = req.query as Record<string, string | undefined>;
  const body = (req.body || {}) as Record<string, any>;

  const email = (query["email"] || body["email"] || env.SUPER_ADMIN_EMAIL || "admin@kuripro.com").trim().toLowerCase();
  const password = query["password"] || body["password"] || env.SUPER_ADMIN_PASSWORD || "SuperAdmin123!";
  const name = (query["name"] || body["name"] || env.SUPER_ADMIN_NAME || "Super Admin").trim();
  const phone = (query["phone"] || body["phone"] || env.SUPER_ADMIN_PHONE || "+919999999999").trim();
  const setupKey = query["setupKey"] || body["setupKey"];
  const autoLogin = query["autoLogin"] === "true" || body["autoLogin"] === true;

  const result = await createSuperAdminCredentials(
    {
      email,
      password,
      name,
      phone,
      setupKey,
      autoLogin,
    },
    deviceContext,
    req.auth,
    headerSetupKey,
  );

  const loginUrl = "/super-admin/login";

  if (result.auth) {
    res.cookie(REFRESH_COOKIE_NAME, result.auth.refreshToken, refreshCookieOptions);
    res.status(result.action === "CREATED" ? 201 : 200).json({
      message: result.message,
      action: result.action,
      user: result.user,
      loginUrl,
      accessToken: result.auth.accessToken,
      deviceId: result.auth.deviceId,
    });
    return;
  }

  res.status(result.action === "CREATED" ? 201 : 200).json({
    message: result.message,
    action: result.action,
    user: result.user,
    loginUrl,
  });
}

export async function listOrganizationsHandler(req: Request, res: Response): Promise<void> {
  const { status, search, page, limit } = req.query;
  const result = await listAllOrganizations({
    status: status as string,
    search: search as string,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 20,
  });
  res.status(200).json(result);
}

export async function approveOrganizationHandler(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  const tenant = await approveOrganization(id);
  res.status(200).json(tenant);
}

export async function rejectOrganizationHandler(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  const { reason } = req.body as { reason?: string };
  const tenant = await rejectOrganization(id, reason);
  res.status(200).json(tenant);
}

export async function setOrganizationStatusHandler(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  const { status } = req.body as { status: "ACTIVE" | "SUSPENDED" };
  const tenant = await setOrganizationStatus(id, status);
  res.status(200).json(tenant);
}

export async function getPlatformStatisticsHandler(_req: Request, res: Response): Promise<void> {
  const stats = await getPlatformStatistics();
  res.status(200).json(stats);
}
