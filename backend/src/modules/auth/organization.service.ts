import { createHmac } from "node:crypto";

import jwt from "jsonwebtoken";
import type { Types } from "mongoose";

import { env } from "../../config/env.js";
import { AppError } from "../../utils/app-error.js";
import { Member } from "../members/member.model.js";
import { findRoleById, findRoleBySlug } from "../roles/role.repository.js";
import { Tenant } from "../tenants/tenant.model.js";

/**
 * One login, many organisations. A person's account is created in a "home" organisation; each other
 * organisation they join is a Member record linked to the same account. The session says which
 * organisation they are acting in — the role there is the home role in the home organisation and the
 * organisation's MEMBER role everywhere else.
 */

export interface UserOrganization {
  tenantId: string;
  name: string;
  slug: string;
  logoUrl?: string;
  roleName: string;
  roleSlug?: string;
  /** The organisation the account was created in. */
  isHome: boolean;
}

interface OrganizationUser {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId | null;
  roleId: Types.ObjectId;
}

/** Active organisations the user can enter, home first. Super admins have none. */
export async function listUserOrganizations(user: OrganizationUser): Promise<UserOrganization[]> {
  if (!user.tenantId) return [];
  const homeId = user.tenantId.toString();

  // Intentional cross-organisation query: the same account's memberships in every organisation.
  const memberships = await Member.find({ userId: user._id, tenantId: { $exists: true }, status: "ACTIVE" }).select("tenantId");
  const otherIds = [...new Set(memberships.map((m) => m.tenantId.toString()))].filter((id) => id !== homeId);

  const tenants = await Tenant.find({ _id: { $in: [homeId, ...otherIds] }, status: "ACTIVE" });

  const organizations: UserOrganization[] = [];
  for (const tenant of tenants) {
    const tenantId = tenant._id.toString();
    const isHome = tenantId === homeId;
    const role = isHome ? await findRoleById(user.roleId.toString(), tenantId) : await findRoleBySlug(tenantId, "MEMBER");
    if (!role) continue;
    organizations.push({
      tenantId,
      name: tenant.name,
      slug: tenant.slug,
      logoUrl: tenant.logoUrl,
      roleName: role.name,
      roleSlug: role.slug,
      isHome,
    });
  }

  return organizations.sort((a, b) => Number(b.isHome) - Number(a.isHome) || a.name.localeCompare(b.name));
}

export interface ActiveOrganization {
  tenantId: string | null;
  roleId: string;
}

/**
 * The organisation and role a session acts as. With no request it is the home organisation; otherwise
 * the user must hold an active membership there.
 */
export async function resolveActiveOrganization(
  user: OrganizationUser,
  requestedTenantId?: string | null,
): Promise<ActiveOrganization> {
  const homeId = user.tenantId ? user.tenantId.toString() : null;
  if (!requestedTenantId || requestedTenantId === homeId) {
    return { tenantId: homeId, roleId: user.roleId.toString() };
  }

  const membership = await Member.findOne({ userId: user._id, tenantId: requestedTenantId, status: "ACTIVE" });
  if (!membership) {
    throw AppError.forbidden("You are not a member of that organization");
  }
  const role = await findRoleBySlug(requestedTenantId, "MEMBER");
  if (!role) {
    throw AppError.internal("Member role not configured for this organisation");
  }
  return { tenantId: requestedTenantId, roleId: role._id.toString() };
}

// --- "Choose an organisation" ticket ---
// After a correct password, a person who belongs to several organisations gets this short-lived token
// instead of a session. It proves the password step passed, carries no permissions, and is only accepted
// by the select-organisation endpoint, so it cannot be used for anything else.

const SELECTION_TTL_SECONDS = 5 * 60;
const SELECTION_AUDIENCE = "organization-selection";

function selectionSecret(): string {
  return createHmac("sha256", env.JWT_ACCESS_SECRET).update("organization-selection-ticket").digest("hex");
}

export function issueOrganizationSelectionToken(userId: string): string {
  return jwt.sign({ sub: userId }, selectionSecret(), { audience: SELECTION_AUDIENCE, expiresIn: SELECTION_TTL_SECONDS });
}

export function verifyOrganizationSelectionToken(token: string): string {
  try {
    const payload = jwt.verify(token, selectionSecret(), { audience: SELECTION_AUDIENCE }) as { sub: string };
    return payload.sub;
  } catch {
    throw AppError.unauthorized("Your sign-in expired — please sign in again", "SELECTION_EXPIRED");
  }
}
