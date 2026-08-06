import { z } from "zod";

import { paginationQuerySchema } from "../../utils/pagination.js";
import { PAYMENT_METHODS } from "../payments/payment.model.js";
import { COLLECTION_STATUSES } from "./collection.model.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

// --- Raising dues (Auto Due) ---

export const raiseDuesSchema = z.object({
  chitGroupId: objectId,
  chitCycleId: objectId,
});

export type RaiseDuesInput = z.infer<typeof raiseDuesSchema>;

export const flagOverdueSchema = z.object({
  chitGroupId: objectId,
});

export type FlagOverdueInput = z.infer<typeof flagOverdueSchema>;

// --- Recording a collection ---

/**
 * Target the installment either directly by paymentId, or by (membership + cycle) which raises the
 * installment on the fly — the path that enables advance payment of a not-yet-due cycle.
 */
const collectionTargetSchema = z.union([
  z.object({ paymentId: objectId }),
  z.object({ chitMembershipId: objectId, chitCycleId: objectId }),
]);

const collectionBodySchema = z.object({
  /** Paise. Omit to collect the full remaining balance (one-tap collection). */
  amount: z.number().int().positive().optional(),
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
  collectedAt: z.coerce.date().optional(),
});

export const recordCollectionSchema = z.intersection(collectionTargetSchema, collectionBodySchema);

export type RecordCollectionInput = z.infer<typeof recordCollectionSchema>;

// --- Bulk collection ---

export const bulkCollectionSchema = z.object({
  items: z.array(z.intersection(collectionTargetSchema, collectionBodySchema)).min(1).max(200),
});

export type BulkCollectionInput = z.infer<typeof bulkCollectionSchema>;

// --- Offline sync ---

const offlineItemSchema = z.intersection(
  collectionTargetSchema,
  collectionBodySchema.extend({ clientReceiptId: z.string().min(1).max(120) }),
);

export const syncOfflineSchema = z.object({
  items: z.array(offlineItemSchema).min(1).max(200),
});

export type SyncOfflineInput = z.infer<typeof syncOfflineSchema>;

const flexibleObjectId = z
  .string()
  .optional()
  .transform((val) => (!val || val === "ALL" || val.trim() === "" ? undefined : val))
  .refine((val) => !val || /^[0-9a-fA-F]{24}$/.test(val), "Invalid id");

export const listDuesQuerySchema = paginationQuerySchema.extend({
  chitGroupId: flexibleObjectId,
  chitCycleId: flexibleObjectId,
  chitMembershipId: flexibleObjectId,
  status: z.enum(["PENDING", "PARTIAL", "PAID", "OVERDUE", "WAIVED"]).optional(),
});

export type ListDuesQuery = z.infer<typeof listDuesQuerySchema>;

export const listCollectionsQuerySchema = paginationQuerySchema.extend({
  chitGroupId: objectId.optional(),
  memberId: objectId.optional(),
  method: z.enum(PAYMENT_METHODS).optional(),
  status: z.enum(COLLECTION_STATUSES).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export type ListCollectionsQuery = z.infer<typeof listCollectionsQuerySchema>;

export const verifyReceiptQuerySchema = z.object({
  token: z.string().min(1),
});

export type VerifyReceiptQuery = z.infer<typeof verifyReceiptQuerySchema>;
