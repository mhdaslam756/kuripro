import { z } from "zod";

import { PAYMENT_METHODS } from "../payments/payment.model.js";
import { memberReplacementSettingsSchema } from "../tenants/tenant.validators.js";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const replacementPreviewQuerySchema = z.object({
  effectiveCycleNumber: z.coerce.number().int().min(1).optional(),
  newMemberId: objectIdSchema.optional(),
  /** Preview handing a full ticket to two half-share members (A/B). */
  split: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  secondMemberId: objectIdSchema.optional(),
});

export type ReplacementPreviewQuery = z.infer<typeof replacementPreviewQuerySchema>;

export const replaceMemberSchema = z
  .object({
  newMemberId: objectIdSchema,
  /** Full ticket only: hand it to two members as half shares — newMemberId takes A, this one takes B. */
  splitIntoHalves: z.boolean().default(false),
  secondNewMemberId: objectIdSchema.optional(),
  /** Method for money taken or paid at confirmation: the replacement fee and an immediate settlement. */
  paymentMethod: z.enum(PAYMENT_METHODS).default("CASH"),
  /** Record the replacement fee as received now; otherwise it stays pending. */
  collectReplacementFee: z.boolean().default(false),
  effectiveCycleNumber: z.number().int().min(1),
  reason: z.string().trim().max(500).optional(),
  settlement: z
    .object({
      /** Rupees, not paise. Omitted → defaults to the previous member's prepaid amount. */
      refundAmountRupees: z.number().min(0).optional(),
      deductionAmountRupees: z.number().min(0).default(0),
      deductionReason: z.string().trim().max(300).optional(),
      notes: z.string().trim().max(500).optional(),
    })
    .default({ deductionAmountRupees: 0 }),
  })
  .superRefine((data, ctx) => {
    if (!data.splitIntoHalves) return;
    if (!data.secondNewMemberId) {
      ctx.addIssue({ code: "custom", path: ["secondNewMemberId"], message: "Choose the second member for the split" });
    } else if (data.secondNewMemberId === data.newMemberId) {
      ctx.addIssue({ code: "custom", path: ["secondNewMemberId"], message: "The two halves need two different members" });
    }
  });

export type ReplaceMemberInput = z.infer<typeof replaceMemberSchema>;

/** Per-group replacement terms: either follow the organisation default or carry this group's own. */
export const groupReplacementSettingsSchema = z
  .object({
    useOrganizationDefault: z.boolean(),
    /** Required once the group is running: changing the terms of a live chit must be deliberate. */
    confirmActiveChange: z.boolean().optional(),
    memberReplacement: memberReplacementSettingsSchema.optional(),
  })
  .refine((v) => v.useOrganizationDefault || v.memberReplacement, { message: "Provide this group's replacement settings", path: ["memberReplacement"] });

export type GroupReplacementSettingsInput = z.infer<typeof groupReplacementSettingsSchema>;

export const updateReplacementSettlementSchema = z
  .object({
    refundAmountRupees: z.number().min(0).optional(),
    deductionAmountRupees: z.number().min(0).optional(),
    deductionReason: z.string().trim().max(300).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Provide at least one field to update" });

export type UpdateReplacementSettlementInput = z.infer<typeof updateReplacementSettlementSchema>;

export const completeReplacementSettlementSchema = z.object({
  /** Rupees actually paid out / collected. Defaults to |net amount|. */
  settledAmountRupees: z.number().min(0).optional(),
  method: z.enum(PAYMENT_METHODS).default("CASH"),
  notes: z.string().trim().max(500).optional(),
});

export type CompleteReplacementSettlementInput = z.infer<typeof completeReplacementSettlementSchema>;
