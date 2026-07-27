import { z } from "zod";

import { WEEKDAYS } from "./tenant.model.js";

const addressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().min(1),
  country: z.string().min(1).default("India"),
});

export const updateCompanyProfileSchema = z.object({
  name: z.string().min(2).optional(),
  registrationNumber: z.string().min(3).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().min(7).optional(),
  address: addressSchema.optional(),
});
export type UpdateCompanyProfileInput = z.infer<typeof updateCompanyProfileSchema>;

export const updateSettingsSchema = z.object({
  defaultForemanCommissionPercent: z.number().min(0).max(100).optional(),
  defaultMaxBidDiscountPercent: z.number().min(0).max(100).optional(),
  currency: z.string().min(1).optional(),
  financialYearStartMonth: z.number().int().min(1).max(12).optional(),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:MM 24-hour format");

const businessHoursEntrySchema = z
  .object({
    day: z.enum(WEEKDAYS),
    isOpen: z.boolean(),
    opensAt: timeStringSchema.optional(),
    closesAt: timeStringSchema.optional(),
  })
  .refine((entry) => !entry.isOpen || (entry.opensAt && entry.closesAt), {
    message: "opensAt and closesAt are required when isOpen is true",
  });

export const updateBusinessHoursSchema = z.object({
  businessHours: z.array(businessHoursEntrySchema).length(7, "Provide all 7 days"),
});
export type UpdateBusinessHoursInput = z.infer<typeof updateBusinessHoursSchema>;
