/**
 * Stable identity for the 4 built-in roles, independent of a role's (editable) display name.
 * Regular authorization is permission-based now (see AuthContext.permissions) — `roleSlug` only
 * exists for the rare business rule that must recognize one of these specific built-ins.
 */
export const SYSTEM_ROLE_SLUGS = ["SUPER_ADMIN", "ORGANIZER", "STAFF", "MEMBER"] as const;
export type SystemRoleSlug = (typeof SYSTEM_ROLE_SLUGS)[number];

/** Claims embedded in the short-lived JWT access token. */
export interface AccessTokenPayload {
  sub: string;
  tenantId: string | null;
  roleId: string;
  roleName: string;
  roleSlug?: SystemRoleSlug;
  permissions: string[];
}

/** The authenticated identity attached to `req.auth` by the jwt-auth middleware. */
export interface AuthContext {
  userId: string;
  tenantId: string | null;
  roleId: string;
  roleName: string;
  roleSlug?: SystemRoleSlug;
  permissions: string[];
}
