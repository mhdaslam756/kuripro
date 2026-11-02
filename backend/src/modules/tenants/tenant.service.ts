import { cloudinary, isCloudinaryConfigured } from "../../config/cloudinary.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../../utils/app-error.js";
import { rupeesToPaise } from "../../utils/money.js";
import { findTenantById, saveTenant } from "./tenant.repository.js";
import type { BusinessHoursEntry, MemberReplacementSettings, TenantDocument, TenantSubscription } from "./tenant.model.js";
import type { MemberReplacementSettingsInput, UpdateCompanyProfileInput, UpdateSettingsInput } from "./tenant.validators.js";

export async function getOrganization(tenantId: string): Promise<TenantDocument> {
  const tenant = await findTenantById(tenantId);
  if (!tenant) {
    throw AppError.notFound("Organization not found");
  }
  return tenant;
}

export async function updateCompanyProfile(
  tenantId: string,
  updates: UpdateCompanyProfileInput,
): Promise<TenantDocument> {
  const tenant = await getOrganization(tenantId);

  if (updates.name) tenant.name = updates.name;
  if (updates.registrationNumber) tenant.registrationNumber = updates.registrationNumber;
  if (updates.contactEmail) tenant.contactEmail = updates.contactEmail;
  if (updates.contactPhone) tenant.contactPhone = updates.contactPhone;
  if (updates.address) tenant.address = updates.address;

  return saveTenant(tenant);
}

/** Rupees-in request → paise-stored settings. Shared by the organisation default and per-group overrides. */
export function toMemberReplacementSettings(input: MemberReplacementSettingsInput): MemberReplacementSettings {
  const { fixedCommissionAmountRupees, replacementFeeAmountRupees, displacementCommission, ...modes } = input;
  return {
    ...modes,
    fixedCommissionAmount: modes.commissionOwnershipMode === "FIXED_AMOUNT" ? rupeesToPaise(fixedCommissionAmountRupees) : 0,
    replacementFeeAmount: modes.replacementFeeMode === "FIXED" ? rupeesToPaise(replacementFeeAmountRupees) : 0,
    replacementFeePercentage: modes.replacementFeeMode === "PERCENTAGE" ? modes.replacementFeePercentage : 0,
    ...(displacementCommission
      ? {
          displacementCommission: (() => {
            const { previousMemberFixedAmountRupees, replacementMemberFixedAmountRupees, ...rest } = displacementCommission;
            return {
              ...rest,
              previousMemberFixedAmount: rupeesToPaise(previousMemberFixedAmountRupees),
              replacementMemberFixedAmount: rupeesToPaise(replacementMemberFixedAmountRupees),
            };
          })(),
        }
      : {}),
  };
}

export async function updateSettings(tenantId: string, updates: UpdateSettingsInput): Promise<TenantDocument> {
  const tenant = await getOrganization(tenantId);
  const { memberReplacement, ...rest } = updates;
  Object.assign(tenant.settings, rest);
  if (memberReplacement) tenant.settings.memberReplacement = toMemberReplacementSettings(memberReplacement);
  return saveTenant(tenant);
}

export async function updateBusinessHours(
  tenantId: string,
  businessHours: BusinessHoursEntry[],
): Promise<TenantDocument> {
  const tenant = await getOrganization(tenantId);
  tenant.businessHours = businessHours;
  return saveTenant(tenant);
}

export async function updateLogo(
  tenantId: string,
  logoUrl: string,
  logoPublicId: string,
): Promise<TenantDocument> {
  const tenant = await getOrganization(tenantId);

  if (tenant.logoPublicId && isCloudinaryConfigured) {
    try {
      await cloudinary.uploader.destroy(tenant.logoPublicId);
    } catch (error) {
      // Best-effort cleanup — an orphaned old logo asset isn't worth failing the update over.
      logger.warn({ err: error, tenantId }, "Failed to delete previous logo from Cloudinary");
    }
  }

  tenant.logoUrl = logoUrl;
  tenant.logoPublicId = logoPublicId;
  return saveTenant(tenant);
}

export async function getSubscription(tenantId: string): Promise<TenantSubscription> {
  const tenant = await getOrganization(tenantId);
  return tenant.subscription;
}
