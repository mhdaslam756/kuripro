import type { NextFunction, Request, RequestHandler, Response } from "express";

import { AppError } from "../utils/app-error.js";

/** Passes if the authenticated user's role holds at least one of the listed permission keys. */
export function requirePermission(...requiredKeys: string[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      next(AppError.unauthorized());
      return;
    }
    const hasAny = requiredKeys.some((key) => req.auth?.permissions.includes(key));
    if (!hasAny) {
      next(AppError.forbidden(`This action requires one of the following permissions: ${requiredKeys.join(", ")}`));
      return;
    }
    next();
  };
}

/**
 * Ensures the authenticated request belongs to a tenant (rejects SUPER_ADMIN's tenant-less
 * context) and returns the tenantId, so route handlers get a non-null string instead of
 * repeating the null-check.
 */
export function requireTenantContext(req: Request): string {
  if (!req.auth) {
    throw AppError.unauthorized();
  }
  if (!req.auth.tenantId) {
    throw AppError.forbidden("This action requires a tenant context");
  }
  return req.auth.tenantId;
}

export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth) {
    next(AppError.unauthorized());
    return;
  }
  if (req.auth.tenantId !== null || req.auth.roleSlug !== "SUPER_ADMIN") {
    next(AppError.forbidden("This action requires Super Admin access"));
    return;
  }
  next();
}
