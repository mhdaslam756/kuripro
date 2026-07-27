import { z } from "zod";

import { paginationQuerySchema } from "../../utils/pagination.js";
import { PAYMENT_METHODS } from "../payments/payment.model.js";
import { PAYOUT_STATUSES } from "./payout.model.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const listPayoutsQuerySchema = paginationQuerySchema.extend({
  chitGroupId: objectId.optional(),
  memberId: objectId.optional(),
  status: z.enum(PAYOUT_STATUSES).optional(),
});

export type ListPayoutsQuery = z.infer<typeof listPayoutsQuerySchema>;

export const recordDisbursementSchema = z.object({
  /** Paise. Omit to disburse the full remaining balance in one tranche. */
  amount: z.number().int().positive().optional(),
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
  /** Proof-of-payment upload (from the shared /uploads endpoint). */
  proofUrl: z.string().url().optional(),
  proofPublicId: z.string().max(200).optional(),
  disbursedAt: z.coerce.date().optional(),
});

export type RecordDisbursementInput = z.infer<typeof recordDisbursementSchema>;
