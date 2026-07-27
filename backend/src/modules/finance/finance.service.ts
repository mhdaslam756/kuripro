import { AppError } from "../../utils/app-error.js";
import { rupeesToPaise } from "../../utils/money.js";
import type { PaginatedResult } from "../../utils/pagination.js";
import {
  createFinanceEntry,
  deleteFinanceEntry,
  findFinanceEntryById,
  listFinanceEntries,
} from "./finance-entry.repository.js";
import type { FinanceEntryDocument } from "./finance-entry.model.js";
import type { CreateFinanceEntryInput, ListFinanceEntriesQuery } from "./finance.validators.js";

export async function recordFinanceEntry(
  tenantId: string,
  createdBy: string,
  input: CreateFinanceEntryInput,
): Promise<FinanceEntryDocument> {
  return createFinanceEntry({
    tenantId,
    createdBy,
    type: input.type,
    category: input.category.trim(),
    amount: rupeesToPaise(input.amountRupees),
    channel: input.channel,
    date: input.date,
    description: input.description,
    chitGroupId: input.chitGroupId,
  });
}

export async function listEntries(
  tenantId: string,
  query: ListFinanceEntriesQuery,
): Promise<PaginatedResult<FinanceEntryDocument>> {
  return listFinanceEntries(
    { tenantId, type: query.type, channel: query.channel, from: query.from, to: query.to },
    query,
  );
}

export async function removeFinanceEntry(tenantId: string, id: string): Promise<void> {
  const entry = await findFinanceEntryById(id, tenantId);
  if (!entry) throw AppError.notFound("Finance entry not found");
  await deleteFinanceEntry(id, tenantId);
}
