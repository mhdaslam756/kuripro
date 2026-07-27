import type { ClientSession } from "mongoose";

import {
  Tenant,
  type BusinessHoursEntry,
  type TenantDoc,
  type TenantDocument,
  type TenantSettings,
} from "./tenant.model.js";

export type CreateTenantInput = Omit<
  TenantDoc,
  "createdAt" | "updatedAt" | "settings" | "status" | "businessHours"
> & {
  settings?: TenantSettings;
  status?: TenantDoc["status"];
  businessHours?: BusinessHoursEntry[];
};

export async function createTenant(data: CreateTenantInput, session?: ClientSession): Promise<TenantDocument> {
  const [tenant] = await Tenant.create([data], { session });
  if (!tenant) throw new Error("Failed to create tenant");
  return tenant;
}

export async function findTenantBySlug(slug: string): Promise<TenantDocument | null> {
  return Tenant.findOne({ slug });
}

export async function findTenantById(id: string): Promise<TenantDocument | null> {
  return Tenant.findById(id);
}

export async function saveTenant(tenant: TenantDocument): Promise<TenantDocument> {
  return tenant.save();
}
