import type { Request, Response } from "express";

import { requireTenantContext } from "../../middleware/rbac.js";
import { AppError } from "../../utils/app-error.js";
import { uploadBuffer } from "../../uploads/upload.service.js";
import * as tenantService from "./tenant.service.js";
import type { UpdateBusinessHoursInput, UpdateCompanyProfileInput, UpdateSettingsInput } from "./tenant.validators.js";

export async function getProfile(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const organization = await tenantService.getOrganization(tenantId);
  res.status(200).json({ organization });
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const input = req.body as UpdateCompanyProfileInput;

  const organization = await tenantService.updateCompanyProfile(tenantId, input);
  res.status(200).json({ organization });
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const input = req.body as UpdateSettingsInput;

  const organization = await tenantService.updateSettings(tenantId, input);
  res.status(200).json({ organization });
}

export async function updateBusinessHours(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const input = req.body as UpdateBusinessHoursInput;

  const organization = await tenantService.updateBusinessHours(tenantId, input.businessHours);
  res.status(200).json({ organization });
}

export async function uploadLogo(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  if (!req.file) {
    throw AppError.badRequest("No file provided — send it as multipart/form-data under the 'file' field");
  }

  const result = await uploadBuffer(req.file.buffer, { folder: `kuripro/${tenantId}/logo` });
  const organization = await tenantService.updateLogo(tenantId, result.url, result.publicId);
  res.status(200).json({ organization });
}

export async function getSubscription(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const subscription = await tenantService.getSubscription(tenantId);
  res.status(200).json({ subscription });
}
