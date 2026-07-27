import { openDB, type DBSchema, type IDBPDatabase } from "idb";

/**
 * A collection captured while offline, awaiting sync. Carries a stable `clientReceiptId` so the
 * backend `/collections/sync` endpoint dedupes on re-sync — a collection is never double-counted
 * even if a sync is retried (by the app or by a Background Sync in the service worker).
 */
export interface OutboxCollection {
  clientReceiptId: string;
  paymentId: string;
  amount?: number;
  method: string;
  reference?: string;
  notes?: string;
  memberName: string;
  chitGroupName: string;
  queuedAt: string;
  /** Where the collection was taken, if the device shared its location. */
  lat?: number;
  lng?: number;
}

interface KuriDB extends DBSchema {
  outbox: { key: string; value: OutboxCollection };
}

const DB_NAME = "kuripro";
const DB_VERSION = 1;
const OUTBOX = "outbox";

let dbPromise: Promise<IDBPDatabase<KuriDB>> | undefined;

function db(): Promise<IDBPDatabase<KuriDB>> {
  dbPromise ??= openDB<KuriDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(OUTBOX)) {
        database.createObjectStore(OUTBOX, { keyPath: "clientReceiptId" });
      }
    },
  });
  return dbPromise;
}

export async function outboxAdd(item: OutboxCollection): Promise<void> {
  await (await db()).put(OUTBOX, item);
}

export async function outboxAll(): Promise<OutboxCollection[]> {
  return (await db()).getAll(OUTBOX);
}

export async function outboxCount(): Promise<number> {
  return (await db()).count(OUTBOX);
}

export async function outboxDelete(clientReceiptIds: string[]): Promise<void> {
  if (clientReceiptIds.length === 0) return;
  const database = await db();
  const tx = database.transaction(OUTBOX, "readwrite");
  await Promise.all([...clientReceiptIds.map((id) => tx.store.delete(id)), tx.done]);
}

export async function outboxClear(): Promise<void> {
  await (await db()).clear(OUTBOX);
}
