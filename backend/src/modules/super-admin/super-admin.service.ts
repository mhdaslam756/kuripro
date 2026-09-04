import { hashPassword, verifyPassword } from "../../utils/password.js";
import { AppError } from "../../utils/app-error.js";
import { Tenant } from "../tenants/tenant.model.js";
import { User } from "../users/user.model.js";
import { Role } from "../roles/role.model.js";
import { Member } from "../members/member.model.js";
import { ChitGroup } from "../chit-groups/chit-group.model.js";
import { issueAuthResult, type AuthResult, type DeviceContext } from "../auth/auth.service.js";
import { env } from "../../config/env.js";
import type { CreateSuperAdminCredentialsInput } from "./super-admin.validators.js";

/** Ensure system role for Super Admin exists. */
export async function ensureSuperAdminRole() {
  let role = await Role.findOne({ tenantId: null, slug: "SUPER_ADMIN" });
  if (!role) {
    role = await Role.create({
      tenantId: null,
      name: "Super Administrator",
      slug: "SUPER_ADMIN",
      isSystemRole: true,
      permissionKeys: ["*"],
    });
  }
  return role;
}

/** Idempotently ensures Super Admin role & optional .env Super Admin account exist on boot. */
export async function seedSuperAdmin() {
  const role = await ensureSuperAdminRole();

  if (env.SUPER_ADMIN_EMAIL && env.SUPER_ADMIN_PASSWORD) {
    const email = env.SUPER_ADMIN_EMAIL.trim().toLowerCase();
    const existing = await User.findOne({ tenantId: null, email });
    if (!existing) {
      const passwordHash = await hashPassword(env.SUPER_ADMIN_PASSWORD);
      await User.create({
        tenantId: null,
        roleId: role._id,
        name: env.SUPER_ADMIN_NAME || "Super Admin",
        email,
        phone: env.SUPER_ADMIN_PHONE || "+919999999999",
        passwordHash,
        status: "ACTIVE",
        mustChangePassword: true,
      });
    }
  }
}

/** Create or update Super Admin credentials via API */
export async function createSuperAdminCredentials(
  input: CreateSuperAdminCredentialsInput,
  deviceContext: DeviceContext = {},
  requesterUser?: { roleSlug?: string; userId?: string },
  headerSetupKey?: string,
) {
  const email = input.email.trim().toLowerCase();
  const role = await ensureSuperAdminRole();

  // Security gate:
  // If at least one Super Admin account already exists in the system:
  // Allow creation/reset if:
  // 1. Requester is already authenticated as a SUPER_ADMIN, OR
  // 2. Setup key provided matches env.SUPER_ADMIN_SETUP_KEY or env.JWT_ACCESS_SECRET, OR
  // 3. Running in non-production mode (development/test)
  const superAdminCount = await User.countDocuments({ tenantId: null });
  const providedKey = input.setupKey || headerSetupKey;
  const isSuperAdminUser = requesterUser?.roleSlug === "SUPER_ADMIN";
  const expectedKey = env.SUPER_ADMIN_SETUP_KEY || env.JWT_ACCESS_SECRET;

  if (superAdminCount > 0 && !isSuperAdminUser && env.NODE_ENV === "production") {
    if (!providedKey || providedKey !== expectedKey) {
      throw AppError.forbidden(
        "Super Admin already exists. Provide valid setupKey or authenticate as Super Admin to manage credentials.",
        "SETUP_KEY_REQUIRED",
      );
    }
  }

  const passwordHash = await hashPassword(input.password);
  let user = await User.findOne({ tenantId: null, email }).select("+passwordHash");
  let action: "CREATED" | "UPDATED" = "CREATED";

  if (user) {
    action = "UPDATED";
    user.name = input.name || user.name || "Super Admin";
    user.phone = input.phone || user.phone || "+919999999999";
    user.passwordHash = passwordHash;
    user.status = "ACTIVE";
    user.mustChangePassword = false;
    user.roleId = role._id;
    await user.save();
  } else {
    user = await User.create({
      tenantId: null,
      roleId: role._id,
      name: input.name || "Super Admin",
      email,
      phone: input.phone || "+919999999999",
      passwordHash,
      status: "ACTIVE",
      mustChangePassword: false,
    });
  }

  let authResult: AuthResult | undefined;
  if (input.autoLogin) {
    user.lastLoginAt = new Date();
    await user.save();
    authResult = await issueAuthResult(user, deviceContext);
  }

  return {
    message: action === "CREATED" ? "Super Admin credentials created successfully" : "Super Admin credentials updated successfully",
    action,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      role: "SUPER_ADMIN",
    },
    auth: authResult,
  };
}



export async function changeSuperAdminPassword(
  userId: string,
  currentPass: string,
  newPass: string,
) {
  if (!newPass || newPass.length < 8) {
    throw AppError.badRequest("New password must be at least 8 characters long", "INVALID_PASSWORD");
  }

  const user = await User.findOne({ _id: userId, tenantId: null }).select("+passwordHash");
  if (!user) {
    throw AppError.notFound("Super Admin user not found", "USER_NOT_FOUND");
  }

  const isValid = await verifyPassword(currentPass, user.passwordHash);
  if (!isValid) {
    throw AppError.unauthorized("Current password is incorrect", "INVALID_CREDENTIALS");
  }

  user.passwordHash = await hashPassword(newPass);
  user.mustChangePassword = false;
  await user.save();

  return {
    message: "Password changed successfully",
    email: user.email,
    mustChangePassword: false,
  };
}

export async function superAdminLogin(
  email: string,
  pass: string,
  deviceContext: DeviceContext = {},
): Promise<AuthResult> {
  await ensureSuperAdminRole();

  const user = await User.findOne({ tenantId: null, email: email.trim().toLowerCase() }).select("+passwordHash");
  if (!user) {
    throw AppError.unauthorized("Invalid super admin credentials", "INVALID_CREDENTIALS");
  }

  const isValid = await verifyPassword(pass, user.passwordHash);
  if (!isValid) {
    throw AppError.unauthorized("Invalid super admin credentials", "INVALID_CREDENTIALS");
  }

  if (user.status === "SUSPENDED") {
    throw AppError.forbidden("Super Admin account suspended");
  }

  user.lastLoginAt = new Date();
  await user.save();

  return issueAuthResult(user, deviceContext);
}

export async function listAllOrganizations(filter: { status?: string; search?: string; page?: number; limit?: number }) {
  const page = Math.max(1, filter.page ?? 1);
  const limit = Math.max(1, Math.min(100, filter.limit ?? 20));
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};
  if (filter.status && filter.status !== "__all__") {
    query.status = filter.status;
  }
  if (filter.search) {
    query.$or = [
      { name: { $regex: filter.search, $options: "i" } },
      { slug: { $regex: filter.search, $options: "i" } },
      { contactEmail: { $regex: filter.search, $options: "i" } },
      { contactPhone: { $regex: filter.search, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    Tenant.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Tenant.countDocuments(query),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function approveOrganization(tenantId: string) {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    throw AppError.notFound("Organization not found");
  }

  tenant.status = "ACTIVE";
  await tenant.save();

  // Activate organizer user for this tenant
  await User.updateMany({ tenantId: tenant._id, status: "PENDING_APPROVAL" }, { $set: { status: "ACTIVE" } });

  return tenant;
}

export async function rejectOrganization(tenantId: string, _reason?: string) {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    throw AppError.notFound("Organization not found");
  }

  tenant.status = "REJECTED";
  await tenant.save();

  // Mark tenant users as suspended/rejected
  await User.updateMany({ tenantId: tenant._id }, { $set: { status: "SUSPENDED" } });

  return tenant;
}

export async function setOrganizationStatus(tenantId: string, status: "ACTIVE" | "SUSPENDED") {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    throw AppError.notFound("Organization not found");
  }

  tenant.status = status;
  await tenant.save();

  return tenant;
}

export async function getPlatformStatistics() {
  const [totalOrgs, pendingOrgs, activeOrgs, suspendedOrgs, totalMembers, totalKuris] = await Promise.all([
    Tenant.countDocuments(),
    Tenant.countDocuments({ status: "PENDING_APPROVAL" }),
    Tenant.countDocuments({ status: "ACTIVE" }),
    Tenant.countDocuments({ status: "SUSPENDED" }),
    Member.countDocuments({ tenantId: { $exists: true } }),
    ChitGroup.countDocuments({ tenantId: { $exists: true } }),
  ]);

  return {
    totalOrganizations: totalOrgs,
    pendingOrganizations: pendingOrgs,
    activeOrganizations: activeOrgs,
    suspendedOrganizations: suspendedOrgs,
    totalMembers,
    totalKuris,
  };
}
