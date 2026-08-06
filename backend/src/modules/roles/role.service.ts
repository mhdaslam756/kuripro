import type { ClientSession } from "mongoose";

import { countUsersByRole } from "../users/user.repository.js";
import { listPermissions } from "../permissions/permission.repository.js";
import { PERMISSION_KEYS } from "../permissions/permission.catalog.js";
import type { PermissionDocument } from "../permissions/permission.model.js";
import { AppError } from "../../utils/app-error.js";
import type { ObjectIdLike } from "../../utils/mongoose-helpers.js";
import { DEFAULT_ROLE_LABELS, DEFAULT_ROLE_PERMISSIONS } from "./role.defaults.js";
import {
  createRole,
  deleteRole as repoDeleteRole,
  findRoleById,
  findRoleBySlug,
  listRoles,
  saveRole,
} from "./role.repository.js";
import type { RoleDocument, SystemRoleSlug } from "./role.model.js";

export type OrganizationSystemRoles = Record<Exclude<SystemRoleSlug, "SUPER_ADMIN">, RoleDocument>;

/**
 * Creates an organization's own copy of the 3 tenant-facing system roles. Must run sequentially
 * (not `Promise.all`) when passed a transaction session — a MongoDB ClientSession only allows one
 * in-flight operation at a time.
 */
export async function seedSystemRolesForOrganization(
  tenantId: ObjectIdLike,
  session?: ClientSession,
): Promise<OrganizationSystemRoles> {
  const organizer = await createRole(
    { tenantId, name: DEFAULT_ROLE_LABELS.ORGANIZER, slug: "ORGANIZER", isSystemRole: true, permissionKeys: DEFAULT_ROLE_PERMISSIONS.ORGANIZER },
    session,
  );
  const staff = await createRole(
    { tenantId, name: DEFAULT_ROLE_LABELS.STAFF, slug: "STAFF", isSystemRole: true, permissionKeys: DEFAULT_ROLE_PERMISSIONS.STAFF },
    session,
  );
  const member = await createRole(
    { tenantId, name: DEFAULT_ROLE_LABELS.MEMBER, slug: "MEMBER", isSystemRole: true, permissionKeys: DEFAULT_ROLE_PERMISSIONS.MEMBER },
    session,
  );

  return { ORGANIZER: organizer, STAFF: staff, MEMBER: member };
}

export async function getOrganizationRoleBySlug(
  tenantId: ObjectIdLike,
  slug: Exclude<SystemRoleSlug, "SUPER_ADMIN">,
): Promise<RoleDocument> {
  const role = await findRoleBySlug(tenantId, slug);
  if (!role) {
    throw AppError.internal(`Organization is missing its system ${slug} role`);
  }

  if (slug === "MEMBER") {
    const defaults = DEFAULT_ROLE_PERMISSIONS.MEMBER;
    const missing = defaults.filter((k) => !role.permissionKeys.includes(k));
    if (missing.length > 0) {
      role.permissionKeys = Array.from(new Set([...role.permissionKeys, ...missing]));
      await saveRole(role);
    }
  }

  return role;
}

export async function listPermissionCatalog(): Promise<PermissionDocument[]> {
  return listPermissions();
}

export async function listOrganizationRoles(tenantId: string): Promise<RoleDocument[]> {
  return listRoles(tenantId);
}

function assertValidPermissionKeys(permissionKeys: string[]): void {
  const unknown = permissionKeys.filter((key) => !PERMISSION_KEYS.includes(key));
  if (unknown.length > 0) {
    throw AppError.badRequest(`Unknown permission key(s): ${unknown.join(", ")}`);
  }
}

export async function createCustomRole(
  tenantId: string,
  name: string,
  permissionKeys: string[],
): Promise<RoleDocument> {
  assertValidPermissionKeys(permissionKeys);
  return createRole({ tenantId, name, isSystemRole: false, permissionKeys });
}

export async function updateRolePermissions(
  tenantId: string,
  roleId: string,
  updates: { name?: string; permissionKeys?: string[] },
): Promise<RoleDocument> {
  const role = await findRoleById(roleId, tenantId);
  if (!role) {
    throw AppError.notFound("Role not found");
  }
  if (role.isSystemRole && updates.name) {
    throw AppError.conflict("Built-in role names can't be changed");
  }
  if (updates.permissionKeys) {
    assertValidPermissionKeys(updates.permissionKeys);
  }

  if (updates.name) role.name = updates.name;
  if (updates.permissionKeys) role.permissionKeys = updates.permissionKeys;

  return saveRole(role);
}

export async function deleteCustomRole(tenantId: string, roleId: string): Promise<void> {
  const role = await findRoleById(roleId, tenantId);
  if (!role) {
    throw AppError.notFound("Role not found");
  }
  if (role.isSystemRole) {
    throw AppError.conflict("Built-in roles can't be deleted");
  }

  const usersWithRole = await countUsersByRole(roleId, tenantId);
  if (usersWithRole > 0) {
    throw AppError.conflict(
      `${usersWithRole} user(s) still have this role — reassign them before deleting it`,
    );
  }

  await repoDeleteRole(role);
}
