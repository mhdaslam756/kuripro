import { z } from "zod";

import { paginationQuerySchema } from "../../utils/pagination.js";
import { FINANCE_CHANNELS, FINANCE_ENTRY_TYPES } from "./finance-entry.model.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const createFinanceEntrySchema = z.object({
  type: z.enum(FINANCE_ENTRY_TYPES),
  category: z.string().min(1).max(80),
  /** Rupees — converted to paise at the service boundary. */
  amountRupees: z.number().positive(),
  channel: z.enum(FINANCE_CHANNELS).default("CASH"),
  date: z.coerce.date(),
  description: z.string().max(500).optional(),
  chitGroupId: objectId.optional(),
});

export type CreateFinanceEntryInput = z.infer<typeof createFinanceEntrySchema>;

export const listFinanceEntriesQuerySchema = paginationQuerySchema.extend({
  type: z.enum(FINANCE_ENTRY_TYPES).optional(),
  channel: z.enum(FINANCE_CHANNELS).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type ListFinanceEntriesQuery = z.infer<typeof listFinanceEntriesQuerySchema>;
