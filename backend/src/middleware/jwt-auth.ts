import type { NextFunction, Request, Response } from "express";
import { createHmac } from "node:crypto";
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

// --- Notification stream tickets ---
// The browser EventSource cannot set an Authorization header. Rather than put the real access token in
// the URL, the client asks for a ticket (with its normal header) and passes that in `?ticket=`. A ticket
// lasts 30 seconds, is signed with a key derived from — but different to — the access secret, carries no
// permissions, and is accepted only by requireAuthSSE, so a leaked URL cannot be used on any other endpoint.

const STREAM_TICKET_TTL_SECONDS = 30;
const STREAM_TICKET_AUDIENCE = "notification-stream";

function streamTicketSecret(): string {
  return createHmac("sha256", env.JWT_ACCESS_SECRET).update("notification-stream-ticket").digest("hex");
}

export function issueStreamTicket(auth: { userId: string; tenantId: string | null }): { ticket: string; expiresIn: number } {
  const ticket = jwt.sign({ sub: auth.userId, tenantId: auth.tenantId }, streamTicketSecret(), {
    audience: STREAM_TICKET_AUDIENCE,
    expiresIn: STREAM_TICKET_TTL_SECONDS,
  });
  return { ticket, expiresIn: STREAM_TICKET_TTL_SECONDS };
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
 * Auth for the notification stream only. Accepts a normal `Authorization: Bearer` access token, or a
 * short-lived `?ticket=` from `issueStreamTicket`. The real access token is never read from the URL.
 */
export function requireAuthSSE(req: Request, _res: Response, next: NextFunction): void {
  try {
    if (req.headers.authorization?.startsWith("Bearer ")) {
      requireAuth(req, _res, next);
      return;
    }
    const ticket = req.query?.ticket;
    if (typeof ticket !== "string" || !ticket) {
      throw AppError.unauthorized("Missing or malformed stream ticket");
    }
    const payload = jwt.verify(ticket, streamTicketSecret(), { audience: STREAM_TICKET_AUDIENCE }) as {
      sub: string;
      tenantId: string | null;
    };
    // A ticket carries identity only — no role or permissions — so it cannot authorise anything else.
    req.auth = { userId: payload.sub, tenantId: payload.tenantId, roleId: "", roleName: "", permissions: [] };
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      next(AppError.unauthorized("Stream ticket expired", "TOKEN_EXPIRED"));
      return;
    }
    next(AppError.unauthorized("Invalid stream ticket"));
  }
}
