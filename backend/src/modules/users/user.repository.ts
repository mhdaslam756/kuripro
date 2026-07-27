import type { ClientSession, Types } from "mongoose";

import type { SystemRoleSlug } from "../roles/role.model.js";
import type { ObjectIdLike } from "../../utils/mongoose-helpers.js";
import { User, type UserDoc, type UserDocument } from "./user.model.js";

export interface PopulatedRoleRef {
  _id: Types.ObjectId;
  name: string;
  slug?: SystemRoleSlug;
}

export type CreateUserInput = Omit<
  UserDoc,
  "createdAt" | "updatedAt" | "mustChangePassword" | "status" | "tenantId" | "roleId"
> & {
  tenantId: ObjectIdLike | null;
  roleId: ObjectIdLike;
  mustChangePassword?: boolean;
  status?: UserDoc["status"];
};

export interface FindUserOptions {
  /** Includes the `select: false` passwordHash field — only for auth flows that need to verify it. */
  withPassword?: boolean;
}

export interface ListUsersFilter {
  tenantId: string;
  roleId?: string;
}

export async function createUser(data: CreateUserInput, session?: ClientSession): Promise<UserDocument> {
  const [user] = await User.create([data], { session });
  if (!user) throw new Error("Failed to create user");
  return user;
}

export async function findUserByEmail(email: string, options: FindUserOptions = {}): Promise<UserDocument | null> {
  const query = User.findOne({ email });
  return options.withPassword ? query.select("+passwordHash") : query;
}

export async function findUserByPhoneOrEmail(
  identifier: string,
  options: FindUserOptions = {},
): Promise<UserDocument | null> {
  const clean = identifier.trim();
  const query = User.findOne({
    $or: [{ email: clean.toLowerCase() }, { phone: clean }],
  });
  return options.withPassword ? query.select("+passwordHash") : query;
}

export async function findSuperAdminByEmail(email: string, options: FindUserOptions = {}): Promise<UserDocument | null> {
  const query = User.findOne({ email: email.trim().toLowerCase(), tenantId: null });
  return options.withPassword ? query.select("+passwordHash") : query;
}

export async function findUserById(id: string, options: FindUserOptions = {}): Promise<UserDocument | null> {
  const query = User.findById(id);
  return options.withPassword ? query.select("+passwordHash") : query;
}

export async function findUserByIdInTenant(id: string, tenantId: string): Promise<UserDocument | null> {
  return User.findOne({ _id: id, tenantId });
}

export async function saveUser(user: UserDocument): Promise<UserDocument> {
  return user.save();
}

export async function countUsersByRole(roleId: string, tenantId: string): Promise<number> {
  return User.countDocuments({ roleId, tenantId });
}

export async function listUsers(
  filter: ListUsersFilter,
  pagination: { skip: number; limit: number },
): Promise<{ items: (Omit<UserDocument, "roleId"> & { roleId: PopulatedRoleRef })[]; total: number }> {
  const mongoFilter = { tenantId: filter.tenantId, ...(filter.roleId ? { roleId: filter.roleId } : {}) };

  const [items, total] = await Promise.all([
    User.find(mongoFilter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate<{ roleId: PopulatedRoleRef }>("roleId", "name slug"),
    User.countDocuments(mongoFilter),
  ]);

  return { items, total };
}
