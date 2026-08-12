import { hashPassword, verifyPassword } from "../../utils/password.js";
import { AppError } from "../../utils/app-error.js";
import { Tenant } from "../tenants/tenant.model.js";
import { User } from "../users/user.model.js";
import { Role } from "../roles/role.model.js";
import { Member } from "../members/member.model.js";
import { ChitGroup } from "../chit-groups/chit-group.model.js";
import { issueAuthResult, type AuthResult, type DeviceContext } from "../auth/auth.service.js";


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

/** Idempotently ensures Super Admin role exists on boot. */
export async function seedSuperAdmin() {
  await ensureSuperAdminRole();
}

/** Check if any Super Admin exists in the platform. */
export async function getSuperAdminSetupStatus(): Promise<{ needsSetup: boolean }> {
  const count = await User.countDocuments({ tenantId: null });
  return { needsSetup: count === 0 };
}

export interface SetupSuperAdminInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

/** Creates initial Super Admin credentials when database has no Super Admin users. */
export async function setupSuperAdmin(input: SetupSuperAdminInput) {
  const count = await User.countDocuments({ tenantId: null });
  if (count > 0) {
    throw AppError.conflict("Super Admin already exists. Setup is locked.", "SUPER_ADMIN_EXISTS");
  }

  const role = await ensureSuperAdminRole();
  const passwordHash = await hashPassword(input.password);

  const superAdmin = await User.create({
    tenantId: null,
    roleId: role._id,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    passwordHash,
    status: "ACTIVE",
    mustChangePassword: false,
  });

  return {
    id: superAdmin._id.toString(),
    name: superAdmin.name,
    email: superAdmin.email,
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
