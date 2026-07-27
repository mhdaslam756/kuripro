import { api } from "@/lib/api-client";
import { clearSyncedFromQueue, getQueue } from "./offline-queue";

interface SyncResult {
  receipts: { clientReceiptId: string }[];
}

/** Flushes the offline collections outbox to the backend and clears what synced. Returns the count synced. */
export async function flushOutbox(): Promise<number> {
  const queued = await getQueue();
  if (queued.length === 0) return 0;
  const result = await api.post<SyncResult>("/collections/sync", { items: queued });
  await clearSyncedFromQueue(result.receipts.map((r) => r.clientReceiptId));
  return result.receipts.length;
}
