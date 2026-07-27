import { recordActivity } from "../activity-logs/activity-log.service.js";
import { findRoleById } from "../roles/role.repository.js";
import { getOrganizationRoleBySlug } from "../roles/role.service.js";
import type { RoleDocument } from "../roles/role.model.js";
import { AppError } from "../../utils/app-error.js";
import { generateTemporaryPassword, hashPassword } from "../../utils/password.js";
import { buildPaginatedResult, toSkipLimit } from "../../utils/pagination.js";
import type { UserDocument } from "./user.model.js";
import { createUser, findUserByIdInTenant, listUsers, saveUser, type PopulatedRoleRef } from "./user.repository.js";
import type { PublicUserRole } from "./user.serializer.js";
import type { CreateTenantUserInput, ListUsersQuery } from "./users.validators.js";

export interface CreatedTenantUser {
  user: UserDocument;
  role: PublicUserRole;
  temporaryPassword: string;
}

function toPublicRole(role: Pick<RoleDocument, "_id" | "name" | "slug"> | PopulatedRoleRef): PublicUserRole {
  return { id: role._id.toString(), name: role.name, slug: role.slug };
}

/**
 * Creates a MEMBER or STAFF user within a tenant with a system-generated temporary password.
 * The organizer/staff creating the account is responsible for relaying the temporary password
 * to the new user out-of-band (phone call, in person, etc.) — it is returned here exactly once
 * and never stored in plaintext or logged.
 *
 * Approval is permission-based, not role-based: an account created by someone who doesn't hold
 * `users.approve` themselves starts `PENDING_APPROVAL` until someone who does (typically an
 * organizer) approves it (see `approveUser`). A creator who already holds `users.approve` is
 * implicitly trusted, so their own creations go straight to `INVITED`.
 */
export async function createTenantUser(
  tenantId: string,
  defaultRoleSlug: "MEMBER" | "STAFF",
  creatorPermissions: string[],
  input: CreateTenantUserInput,
): Promise<CreatedTenantUser> {
  const role = input.roleId
    ? await requireRoleInTenant(tenantId, input.roleId)
    : await getOrganizationRoleBySlug(tenantId, defaultRoleSlug);

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const requiresApproval = !creatorPermissions.includes("users.approve");

  const user = await createUser({
    tenantId,
    roleId: role._id,
    name: input.name,
    email: input.email,
    phone: input.phone,
    passwordHash,
    status: requiresApproval ? "PENDING_APPROVAL" : "INVITED",
    mustChangePassword: true,
  });

  return { user, role: toPublicRole(role), temporaryPassword };
}

async function requireRoleInTenant(tenantId: string, roleId: string): Promise<RoleDocument> {
  const role = await findRoleById(roleId, tenantId);
  if (!role) {
    throw AppError.badRequest("Role not found in this organization");
  }
  return role;
}

export async function approveUser(
  tenantId: string,
  userId: string,
  approvedBy: string,
): Promise<{ user: UserDocument; role: PublicUserRole }> {
  const user = await findUserByIdInTenant(userId, tenantId);
  if (!user) {
    throw AppError.notFound("User not found");
  }
  if (user.status !== "PENDING_APPROVAL") {
    throw AppError.conflict("This account is not awaiting approval");
  }

  user.status = "INVITED";
  await saveUser(user);

  const role = await requireRoleInTenant(tenantId, user.roleId.toString());

  await recordActivity({
    tenantId,
    userId: approvedBy,
    action: "USER_APPROVED",
    message: `Approved account for ${user.name} (${user.email})`,
  });

  return { user, role: toPublicRole(role) };
}

// Return type inferred — the populated `roleId` shape from listUsers() doesn't collapse cleanly
// into a manually-written UserDocument annotation, and the inferred type is exactly as useful.
export async function listTenantUsers(tenantId: string, query: ListUsersQuery) {
  const { skip, limit } = toSkipLimit(query);
  const { items, total } = await listUsers({ tenantId, roleId: query.roleId }, { skip, limit });

  const mapped = items.map((user) => ({ user, role: toPublicRole(user.roleId) }));
  return buildPaginatedResult(mapped, total, query);
}
