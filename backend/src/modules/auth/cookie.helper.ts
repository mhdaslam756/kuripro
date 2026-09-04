import type { CookieOptions, Request, Response } from "express";

import { env } from "../../config/env.js";

export const REFRESH_COOKIE_NAME = "kuripro_rt";

export function getRefreshCookieOptions(): CookieOptions {
  const isProd = env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/api",
    maxAge: env.JWT_REFRESH_TTL_SECONDS * 1000,
    ...(isProd ? { partitioned: true } : {}),
  } as CookieOptions;
}

export function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
}

export function clearRefreshCookie(res: Response): void {
  const isProd = env.NODE_ENV === "production";
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/api",
    ...(isProd ? { partitioned: true } : {}),
  } as CookieOptions);
}

export function readRefreshCookieValue(req: Request): string | undefined {
  return (req.cookies as Record<string, string | undefined> | undefined)?.[REFRESH_COOKIE_NAME];
}

/**
 * Extracts the refresh token from the HTTP-only cookie first, with fallback to request body
 * or x-refresh-token header. This ensures 100% reliable session refreshes in cross-site
 * deployments (e.g. Vercel frontend + Render backend) where browsers block 3rd-party cookies.
 */
export function readRefreshToken(req: Request): string | undefined {
  const fromCookie = readRefreshCookieValue(req);
  if (fromCookie) return fromCookie;

  const fromBody = (req.body as Record<string, unknown> | undefined)?.refreshToken;
  if (typeof fromBody === "string" && fromBody.trim()) {
    return fromBody.trim();
  }

  const fromHeader = req.headers["x-refresh-token"];
  if (typeof fromHeader === "string" && fromHeader.trim()) {
    return fromHeader.trim();
  }

  const fromQuery = req.query?.refreshToken;
  if (typeof fromQuery === "string" && fromQuery.trim()) {
    return fromQuery.trim();
  }

  return undefined;
}
