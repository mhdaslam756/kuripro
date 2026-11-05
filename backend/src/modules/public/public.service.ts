import mongoose from "mongoose";

import { AppError } from "../../utils/app-error.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import { recordActivity } from "../activity-logs/activity-log.service.js";
import { issueAuthResult, type AuthResult, type DeviceContext } from "../auth/auth.service.js";
import { listUserOrganizations } from "../auth/organization.service.js";
import { getNextSequence } from "../counters/counter.repository.js";
import { createMember, findMemberByPhone, findMemberByUserId } from "../members/member.repository.js";
import { Member } from "../members/member.model.js";
import type { MemberDocument } from "../members/member.model.js";
import { deliverOtp } from "../otp/otp.delivery.js";
import { generateOtp } from "../otp/otp.service.js";
import { getOrganizationRoleBySlug } from "../roles/role.service.js";
import { findTenantBySlug } from "../tenants/tenant.repository.js";
import { createUser, findUserByPhoneOrEmail } from "../users/user.repository.js";
import type {
  PublicJoinInput,
  PublicMemberLoginInput,
  PublicMemberRegisterInput,
  PublicPhoneCheckInput,
} from "./public.validators.js";

export interface PublicOrgInfo {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  contactPhone: string;
  contactEmail: string;
  address: {
    city: string;
    state: string;
  };
}

export async function getPublicOrg(slug: string): Promise<PublicOrgInfo> {
  const tenant = await findTenantBySlug(slug.toLowerCase());
  if (!tenant || tenant.status !== "ACTIVE") {
    throw AppError.notFound("Organization not found or inactive");
  }

  return {
    id: tenant._id.toString(),
    name: tenant.name,
    slug: tenant.slug,
    logoUrl: tenant.logoUrl,
    contactPhone: tenant.contactPhone,
    contactEmail: tenant.contactEmail,
    address: {
      city: tenant.address.city,
      state: tenant.address.state,
    },
  };
}

export type PublicMemberRegisterResult =
  | { requireEmailVerification: false; auth: AuthResult; member: MemberDocument }
  | { requireEmailVerification: true; email: string; message: string; member: MemberDocument };

export async function registerPublicMember(
  slug: string,
  input: PublicMemberRegisterInput,
  deviceContext: DeviceContext = {},
): Promise<PublicMemberRegisterResult> {
  const tenant = await findTenantBySlug(slug.toLowerCase());
  if (!tenant || tenant.status !== "ACTIVE") {
    throw AppError.notFound("Organization not found or inactive");
  }

  const tenantId = tenant._id.toString();

  // Check if member or user already exists with this phone or email
  const existingMember = await findMemberByPhone(tenantId, input.phone);
  if (existingMember) {
    throw AppError.conflict("A member with this phone number is already registered in this organization");
  }

  const existingUser = await findUserByPhoneOrEmail(input.phone);
  if (existingUser) {
    throw AppError.conflict("An account with this phone number or email already exists", "ACCOUNT_EXISTS");
  }

  if (input.email) {
    const existingEmailUser = await findUserByPhoneOrEmail(input.email);
    if (existingEmailUser) {
      throw AppError.conflict("An account with this email address already exists", "ACCOUNT_EXISTS");
    }
  }

  const role = await getOrganizationRoleBySlug(tenantId, "MEMBER");
  const passwordHash = await hashPassword(input.password);

  let createdMember: MemberDocument | null = null;
  let createdUser: any = null;

  const performRegistration = async (session?: mongoose.ClientSession) => {
    const sequence = await getNextSequence(tenantId, "memberCode", session);
    const memberCode = `MBR-${String(sequence).padStart(6, "0")}`;

    // 1. Create User account for member login
    createdUser = await createUser(
      {
        tenantId,
        roleId: role._id,
        name: input.name,
        email: input.email || `${input.phone}@${tenant.slug}.member`,
        phone: input.phone,
        passwordHash,
        status: "ACTIVE",
        isEmailVerified: input.email ? false : true,
        mustChangePassword: false,
      },
      session,
    );

    // 2. Create Member record
    createdMember = await createMember(
      {
        tenantId,
        memberCode,
        name: input.name,
        phone: input.phone,
        email: input.email || undefined,
        address: {
          line1: input.address.line1,
          line2: input.address.line2,
          city: input.address.city,
          state: input.address.state,
          pincode: input.address.pincode,
          country: input.address.country || "India",
        },
        occupation: {
          type: input.occupation.type,
          employerOrBusinessName: input.occupation.employerOrBusinessName,
          monthlyIncome: input.occupation.monthlyIncome ? Math.round(input.occupation.monthlyIncome * 100) : undefined,
          workAddress: input.occupation.workAddress,
        },
        qrToken: `QR-${tenantId.slice(-4)}-${memberCode}`,
        status: "ACTIVE",
        userId: createdUser._id,
        createdBy: createdUser._id,
      },
      session,
    );
  };

  const session = await mongoose.startSession();
  try {
    try {
      await session.withTransaction(async () => {
        await performRegistration(session);
      });
    } catch (err: any) {
      if (err?.message?.includes("Transaction numbers are only allowed")) {
        await performRegistration();
      } else {
        throw err;
      }
    }
  } finally {
    await session.endSession();
  }

  if (!createdMember || !createdUser) {
    throw AppError.internal("Failed to register member. Please try again.");
  }

  if (input.email) {
    const code = await generateOtp(createdUser._id, createdUser.email, "EMAIL_VERIFICATION");
    await deliverOtp(createdUser.email, "EMAIL_VERIFICATION", code);
    return {
      requireEmailVerification: true,
      email: input.email,
      message: "Registration submitted. Please enter the verification code sent to your email.",
      member: createdMember,
    };
  }

  const auth = await issueAuthResult(createdUser, deviceContext);
  return { requireEmailVerification: false, auth, member: createdMember };
}

export async function publicMemberLogin(
  slug: string,
  input: PublicMemberLoginInput,
  deviceContext: DeviceContext = {},
): Promise<AuthResult> {
  const tenant = await findTenantBySlug(slug.toLowerCase());
  if (!tenant || tenant.status !== "ACTIVE") {
    throw AppError.notFound("Organization not found or inactive");
  }

  const tenantId = tenant._id.toString();

  const user = await findUserByPhoneOrEmail(input.identifier, { withPassword: true });
  if (!user) {
    throw AppError.unauthorized("Invalid phone/email or password");
  }

  const isValidPassword = await verifyPassword(input.password, user.passwordHash);
  if (!isValidPassword) {
    throw AppError.unauthorized("Invalid phone/email or password");
  }

  if (user.status === "SUSPENDED") {
    throw AppError.forbidden("Your member account has been suspended");
  }

  // One login can belong to several organisations; the portal you came through picks which one you enter.
  const organizations = await listUserOrganizations(user);
  if (!organizations.some((o) => o.tenantId === tenantId)) {
    throw AppError.forbidden(
      "This account is not a member of this organization yet — join it from the sign-up page",
      "NOT_A_MEMBER",
    );
  }

  return issueAuthResult(user, deviceContext, tenantId);
}

// --- One login, many organisations ---

export interface PublicPhoneCheck {
  /** A KuriPro login already exists for this number. */
  accountExists: boolean;
  /** The number (or that login) already belongs to this organisation, so signing in is the next step. */
  alreadyMember: boolean;

  /** Where the login's email lives, with most of it hidden, so the person can recognise their account. */
  maskedEmail?: string;
}

function maskEmail(email: string): string | undefined {
  const [local, domain] = email.split("@");
  // Phone-only members get a placeholder address ending in ".member" — nothing to show.
  if (!local || !domain || domain.endsWith(".member")) return undefined;
  return `${local.slice(0, 1)}${"*".repeat(Math.max(2, Math.min(local.length - 1, 5)))}@${domain}`;
}

/** First step of registration: ask for the mobile number, then decide whether the full form is needed. */
export async function checkPublicPhone(slug: string, input: PublicPhoneCheckInput): Promise<PublicPhoneCheck> {
  const tenant = await findTenantBySlug(slug.toLowerCase());
  if (!tenant || tenant.status !== "ACTIVE") {
    throw AppError.notFound("Organization not found or inactive");
  }
  const tenantId = tenant._id.toString();

  const user = await findUserByPhoneOrEmail(input.phone);
  const accountExists = Boolean(user && user.tenantId);

  const memberHere = await findMemberByPhone(tenantId, input.phone);
  let alreadyMember = Boolean(memberHere?.userId);
  if (user && !alreadyMember) {
    const organizations = await listUserOrganizations(user);
    alreadyMember = organizations.some((o) => o.tenantId === tenantId);
  }

  return { accountExists, alreadyMember, maskedEmail: accountExists && user ? maskEmail(user.email) : undefined };
}

/**
 * Step two of joining: the person types the password of their existing KuriPro account. Nothing is
 * created — this only confirms they are the original member, so the page can then offer the Join button.
 */
export async function verifyExistingAccount(
  slug: string,
  input: { phone: string; password: string },
): Promise<{ verified: true; name: string }> {
  const tenant = await requireActiveTenant(slug);
  const tenantId = tenant._id.toString();

  const user = await findUserByPhoneOrEmail(input.phone, { withPassword: true });
  if (!user || !input.password || !(await verifyPassword(input.password, user.passwordHash))) {
    throw AppError.unauthorized("Incorrect password. Please enter the password of your KuriPro account.");
  }
  if (!user.tenantId) {
    throw AppError.forbidden("Platform administrator accounts cannot join an organization");
  }
  const organizations = await listUserOrganizations(user);
  if (organizations.some((o) => o.tenantId === tenantId)) {
    throw AppError.conflict("You are already a member of this organization — please sign in", "ALREADY_MEMBER");
  }
  return { verified: true, name: user.name };
}

type JoinProfile = Pick<PublicJoinInput, "address" | "occupationType">;
type JoinUser = NonNullable<Awaited<ReturnType<typeof findUserByPhoneOrEmail>>>;

/**
 * Adds the membership for an account whose ownership has already been proven (by password, or by being
 * signed in). Name, contact and address come from their existing member profile; income, work address,
 * documents and photo are deliberately not copied.
 */
async function addMembershipForUser(
  tenant: { _id: { toString(): string }; name: string },
  user: JoinUser,
  profile: JoinProfile,
  deviceContext: DeviceContext,
): Promise<string> {
  const tenantId = tenant._id.toString();

  if (!user.tenantId) {
    throw AppError.forbidden("Platform administrator accounts cannot join an organization");
  }
  if (user.status === "SUSPENDED") {
    throw AppError.forbidden("Your account has been suspended");
  }
  if (user.isEmailVerified === false) {
    throw AppError.forbidden("Please verify your email address before joining", "EMAIL_NOT_VERIFIED");
  }

  const organizations = await listUserOrganizations(user);
  const alreadyMember =
    organizations.some((o) => o.tenantId === tenantId) || Boolean(await findMemberByUserId(user._id.toString(), tenantId));
  if (alreadyMember) {
    throw AppError.conflict("You are already a member of this organization — please sign in", "ALREADY_MEMBER");
  }

  // Staff may already have added them here without a login: link that record rather than creating a second.
  const existingHere = await findMemberByPhone(tenantId, user.phone);
  if (existingHere) {
    if (existingHere.userId) {
      throw AppError.conflict("This number is already linked to another account in this organization", "ALREADY_MEMBER");
    }
    existingHere.userId = user._id;
    await existingHere.save();
    await recordActivity({
      tenantId,
      userId: user._id,
      memberId: existingHere._id,
      action: "MEMBER_JOINED_ORGANIZATION",
      message: `${existingHere.name} linked their account to ${tenant.name}`,
      ipAddress: deviceContext.ipAddress,
      userAgent: deviceContext.userAgent,
    });
    return tenantId;
  }

  // Reuse their most recent member profile so they are not asked for the same details again.
  const template = await Member.findOne({ userId: user._id, tenantId: { $exists: true } }).sort({ createdAt: -1 });
  const address = template?.address ?? profile.address;
  const occupationType = template?.occupation?.type ?? profile.occupationType;
  if (!address || !occupationType) {
    throw AppError.unprocessable("Add your address and occupation to join this organization", "PROFILE_REQUIRED");
  }

  const sequence = await getNextSequence(tenantId, "memberCode");
  const memberCode = `MBR-${String(sequence).padStart(6, "0")}`;
  const hasRealEmail = !user.email.endsWith(".member");
  const member = await createMember({
    tenantId,
    memberCode,
    name: template?.name ?? user.name,
    phone: user.phone,
    email: hasRealEmail ? user.email : undefined,
    address: {
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      country: address.country || "India",
    },
    occupation: { type: occupationType },
    qrToken: `QR-${tenantId.slice(-4)}-${memberCode}`,
    status: "ACTIVE",
    userId: user._id,
    createdBy: user._id,
  });

  await recordActivity({
    tenantId,
    userId: user._id,
    memberId: member._id,
    action: "MEMBER_JOINED_ORGANIZATION",
    message: `${member.name} joined ${tenant.name} with an existing account`,
    ipAddress: deviceContext.ipAddress,
    userAgent: deviceContext.userAgent,
  });

  return tenantId;
}

async function requireActiveTenant(slug: string) {
  const tenant = await findTenantBySlug(slug.toLowerCase());
  if (!tenant || tenant.status !== "ACTIVE") {
    throw AppError.notFound("Organization not found or inactive");
  }
  return tenant;
}

/**
 * Joins this organisation with an account the person already holds, proven by its password (they are
 * not signed in). Asking for the password stops anyone joining an account to an organisation — and so
 * pulling that person's name and address into it — just by typing their number.
 */
export async function joinOrganizationWithAccount(
  slug: string,
  input: PublicJoinInput,
  deviceContext: DeviceContext = {},
): Promise<AuthResult> {
  const tenant = await requireActiveTenant(slug);

  const user = await findUserByPhoneOrEmail(input.phone, { withPassword: true });
  if (!user || !input.password || !(await verifyPassword(input.password, user.passwordHash))) {
    throw AppError.unauthorized("Invalid phone number or password");
  }

  const tenantId = await addMembershipForUser(tenant, user, input, deviceContext);
  return issueAuthResult(user, deviceContext, tenantId);
}
