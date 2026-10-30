import { z } from "zod";

import { PAYMENT_METHODS } from "../payments/payment.model.js";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const replacementPreviewQuerySchema = z.object({
  effectiveCycleNumber: z.coerce.number().int().min(1).optional(),
  newMemberId: objectIdSchema.optional(),
});

export type ReplacementPreviewQuery = z.infer<typeof replacementPreviewQuerySchema>;

export const replaceMemberSchema = z.object({
  newMemberId: objectIdSchema,
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
});

export type ReplaceMemberInput = z.infer<typeof replaceMemberSchema>;

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
