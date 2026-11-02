import { z } from "zod";

import {
  COMMISSION_CALCULATION_BASES,
  COMMISSION_OWNERSHIP_MODES,
  DISPLACEMENT_COMMISSION_MODES,
  REMAINING_COMMISSION_POLICIES,
  INSTALLMENT_SETTLEMENT_MODES,
  REPLACEMENT_FEE_MODES,
  WEEKDAYS,
} from "./tenant.model.js";

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

export const displacementCommissionSettingsSchema = z
  .object({
    commissionAllocationEnabled: z.boolean(),
    displacementCommissionMode: z.enum(DISPLACEMENT_COMMISSION_MODES),
    previousMemberPercentage: z.number().min(0).max(100).default(0),
    replacementMemberPercentage: z.number().min(0).max(100).default(0),
    previousMemberFixedAmountRupees: z.number().min(0).max(10_000_000).default(0),
    replacementMemberFixedAmountRupees: z.number().min(0).max(10_000_000).default(0),
    remainingCommissionPolicy: z.enum(REMAINING_COMMISSION_POLICIES).default("ORGANIZATION"),
    effectiveFrom: z.coerce.date().optional(),
  })
  .superRefine((v, ctx) => {
    if (!v.commissionAllocationEnabled || v.displacementCommissionMode !== "CUSTOM_PERCENTAGE") return;
    // Compare in hundredths of a percent so 33.33 + 66.67 is exactly 100.
    if (Math.round(v.previousMemberPercentage * 100) + Math.round(v.replacementMemberPercentage * 100) !== 10000) {
      ctx.addIssue({ code: "custom", path: ["replacementMemberPercentage"], message: "The two percentages must add up to exactly 100%" });
    }
  });

/** Rupees in, paise stored (see the service). */
export const memberReplacementSettingsSchema = z
  .object({
    installmentSettlementMode: z.enum(INSTALLMENT_SETTLEMENT_MODES),
    commissionOwnershipMode: z.enum(COMMISSION_OWNERSHIP_MODES),
    fixedCommissionAmountRupees: z.number().min(0).max(10_000_000).default(0),
    replacementFeeMode: z.enum(REPLACEMENT_FEE_MODES),
    replacementFeeAmountRupees: z.number().min(0).max(10_000_000).default(0),
    replacementFeePercentage: z.number().min(0).max(100).default(0),
    commissionCalculationBase: z.enum(COMMISSION_CALCULATION_BASES).default("TOTAL_COMMISSION"),
    displacementCommission: displacementCommissionSettingsSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.commissionOwnershipMode === "FIXED_AMOUNT" && value.fixedCommissionAmountRupees <= 0) {
      ctx.addIssue({ code: "custom", path: ["fixedCommissionAmountRupees"], message: "Enter the fixed commission amount" });
    }
    if (value.replacementFeeMode === "FIXED" && value.replacementFeeAmountRupees <= 0) {
      ctx.addIssue({ code: "custom", path: ["replacementFeeAmountRupees"], message: "Enter the replacement fee amount" });
    }
    if (value.replacementFeeMode === "PERCENTAGE" && value.replacementFeePercentage <= 0) {
      ctx.addIssue({ code: "custom", path: ["replacementFeePercentage"], message: "Enter the replacement fee percentage" });
    }
  });
export type MemberReplacementSettingsInput = z.infer<typeof memberReplacementSettingsSchema>;

export const updateSettingsSchema = z.object({
  defaultForemanCommissionPercent: z.number().min(0).max(100).optional(),
  defaultMaxBidDiscountPercent: z.number().min(0).max(100).optional(),
  currency: z.string().min(1).optional(),
  financialYearStartMonth: z.number().int().min(1).max(12).optional(),
  memberReplacement: memberReplacementSettingsSchema.optional(),
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
