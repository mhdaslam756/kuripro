import type { Request, Response } from "express";

import { setRefreshCookie } from "../auth/cookie.helper.js";
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
import type { CreateSuperAdminCredentialsInput } from "./super-admin.validators.js";

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
  setRefreshCookie(res, result.refreshToken);
  res.status(200).json({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    deviceId: result.deviceId,
    user: result.user,
  });
}

export async function createSuperAdminCredentialsHandler(req: Request, res: Response): Promise<void> {
  // The setup key comes from a header only — never a URL or body — so it can't land in access logs.
  const setupKey = req.headers["x-setup-key"];
  const result = await createSuperAdminCredentials(
    req.body as CreateSuperAdminCredentialsInput,
    typeof setupKey === "string" ? setupKey : undefined,
  );
  res.status(result.action === "CREATED" ? 201 : 200).json({
    message: result.message,
    action: result.action,
    user: result.user,
    loginUrl: "/super-admin/login",
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
