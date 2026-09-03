import mongoose from "mongoose";

import { AppError } from "../../utils/app-error.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import { issueAuthResult, type AuthResult, type DeviceContext } from "../auth/auth.service.js";
import { getNextSequence } from "../counters/counter.repository.js";
import { createMember, findMemberByPhone } from "../members/member.repository.js";
import type { MemberDocument } from "../members/member.model.js";
import { deliverOtp } from "../otp/otp.delivery.js";
import { generateOtp } from "../otp/otp.service.js";
import { getOrganizationRoleBySlug } from "../roles/role.service.js";
import { findTenantBySlug } from "../tenants/tenant.repository.js";
import { createUser, findUserByPhoneOrEmail } from "../users/user.repository.js";
import type { PublicMemberLoginInput, PublicMemberRegisterInput } from "./public.validators.js";

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
    throw AppError.conflict("An account with this phone number or email already exists");
  }

  if (input.email) {
    const existingEmailUser = await findUserByPhoneOrEmail(input.email);
    if (existingEmailUser) {
      throw AppError.conflict("An account with this email address already exists");
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
  if (!user || user.tenantId?.toString() !== tenantId) {
    throw AppError.unauthorized("Invalid phone/email or password");
  }

  const isValidPassword = await verifyPassword(input.password, user.passwordHash);
  if (!isValidPassword) {
    throw AppError.unauthorized("Invalid phone/email or password");
  }

  if (user.status === "SUSPENDED") {
    throw AppError.forbidden("Your member account has been suspended");
  }

  return issueAuthResult(user, deviceContext);
}
