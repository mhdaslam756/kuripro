import type { ClientSession } from "mongoose";

import type { ObjectIdLike } from "../../utils/mongoose-helpers.js";
import { Role, type RoleDoc, type RoleDocument, type SystemRoleSlug } from "./role.model.js";

export type CreateRoleInput = Omit<RoleDoc, "createdAt" | "updatedAt" | "tenantId" | "isSystemRole" | "slug"> & {
  tenantId: ObjectIdLike | null;
  isSystemRole?: boolean;
  slug?: SystemRoleSlug;
};

export async function createRole(data: CreateRoleInput, session?: ClientSession): Promise<RoleDocument> {
  const [role] = await Role.create([data], { session });
  if (!role) throw new Error("Failed to create role");
  return role;
}

export async function findRoleById(id: string, tenantId: ObjectIdLike | null): Promise<RoleDocument | null> {
  return Role.findOne({ tenantId, _id: id });
}

export async function findRoleBySlug(
  tenantId: ObjectIdLike | null,
  slug: SystemRoleSlug,
): Promise<RoleDocument | null> {
  return Role.findOne({ tenantId, slug });
}

export async function listRoles(tenantId: ObjectIdLike | null): Promise<RoleDocument[]> {
  return Role.find({ tenantId }).sort({ isSystemRole: -1, name: 1 });
}

export async function saveRole(role: RoleDocument): Promise<RoleDocument> {
  return role.save();
}

export async function deleteRole(role: RoleDocument): Promise<void> {
  // Model-level call with an explicit tenantId filter — a document-instance `.deleteOne()` would
  // invoke this schema's query middleware with a bare Document as `this`, which doesn't have
  // `.getFilter()`, breaking the tenant-scope guard plugin.
  await Role.deleteOne({ _id: role._id, tenantId: role.tenantId });
}
