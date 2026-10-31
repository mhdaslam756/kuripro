import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import type { AccessTokenPayload } from "../types/auth.js";
import { AppError } from "../utils/app-error.js";

function extractBearerToken(req: Request): string {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }
  throw AppError.unauthorized("Missing or malformed Authorization header");
}

/**
 * SSE-only fallback: the browser EventSource API cannot set custom headers, so the JWT must
 * be supplied via `?token=`. This is intentionally restricted to `requireAuthSSE` — never use
 * it for regular REST endpoints because tokens in URLs leak through logs and Referer headers.
 */
function extractBearerTokenWithQueryFallback(req: Request): string {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }
  const queryToken = req.query?.token;
  if (typeof queryToken === "string" && queryToken) {
    return queryToken;
  }
  throw AppError.unauthorized("Missing or malformed Authorization header");
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = extractBearerToken(req);
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;

    req.auth = {
      userId: payload.sub,
      tenantId: payload.tenantId,
      roleId: payload.roleId,
      roleName: payload.roleName,
      roleSlug: payload.roleSlug,
      permissions: payload.permissions,
    };
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      next(AppError.unauthorized("Access token expired", "TOKEN_EXPIRED"));
      return;
    }
    next(AppError.unauthorized("Invalid access token"));
  }
}

/**
 * SSE-specific auth middleware. Identical to `requireAuth` but also accepts `?token=<JWT>` as
 * a fallback because the browser `EventSource` API cannot set custom request headers.
 * Use ONLY for Server-Sent Event stream endpoints — never for regular REST endpoints.
 */
export function requireAuthSSE(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = extractBearerTokenWithQueryFallback(req);
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;

    req.auth = {
      userId: payload.sub,
      tenantId: payload.tenantId,
      roleId: payload.roleId,
      roleName: payload.roleName,
      roleSlug: payload.roleSlug,
      permissions: payload.permissions,
    };
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      next(AppError.unauthorized("Access token expired", "TOKEN_EXPIRED"));
      return;
    }
    next(AppError.unauthorized("Invalid access token"));
  }
}
