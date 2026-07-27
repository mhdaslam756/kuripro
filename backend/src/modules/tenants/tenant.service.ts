import { cloudinary, isCloudinaryConfigured } from "../../config/cloudinary.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../../utils/app-error.js";
import { findTenantById, saveTenant } from "./tenant.repository.js";
import type { BusinessHoursEntry, TenantDocument, TenantSubscription } from "./tenant.model.js";
import type { UpdateCompanyProfileInput, UpdateSettingsInput } from "./tenant.validators.js";

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

export async function updateSettings(tenantId: string, updates: UpdateSettingsInput): Promise<TenantDocument> {
  const tenant = await getOrganization(tenantId);
  Object.assign(tenant.settings, updates);
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
