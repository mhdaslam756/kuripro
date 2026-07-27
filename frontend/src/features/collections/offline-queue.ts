import { outboxAdd, outboxAll, outboxCount, outboxDelete, type OutboxCollection } from "@/lib/idb";
import type { PaymentMethod } from "./types";

/**
 * The offline collections queue, backed by IndexedDB (see `@/lib/idb`). Records a collection with no
 * network and reconciles via `/collections/sync` when back online — either from the app (Sync now /
 * auto-sync on reconnect) or from the service worker's Background Sync. Each entry's `clientReceiptId`
 * makes re-syncs idempotent.
 */
export type QueuedCollection = OutboxCollection;

export interface EnqueueInput {
  paymentId: string;
  amount?: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  memberName: string;
  chitGroupName: string;
  lat?: number;
  lng?: number;
}

export async function enqueueCollection(entry: EnqueueInput): Promise<QueuedCollection> {
  const item: QueuedCollection = { ...entry, clientReceiptId: crypto.randomUUID(), queuedAt: new Date().toISOString() };
  await outboxAdd(item);
  return item;
}

export function getQueue(): Promise<QueuedCollection[]> {
  return outboxAll();
}

export function countQueue(): Promise<number> {
  return outboxCount();
}

export function clearSyncedFromQueue(syncedClientReceiptIds: string[]): Promise<void> {
  return outboxDelete(syncedClientReceiptIds);
}
