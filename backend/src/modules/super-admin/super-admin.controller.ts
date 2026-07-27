import type { CookieOptions, Request, Response } from "express";

import { env } from "../../config/env.js";
import {
  approveOrganization,
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
  path: "/api/v1",
  maxAge: env.JWT_REFRESH_TTL_SECONDS * 1000,
};

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
