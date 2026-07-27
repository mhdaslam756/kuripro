import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, describe, inject } from "vitest";

/** Whether the in-memory MongoDB came up (see global-setup.ts). DB-backed suites skip when false. */
export function dbAvailable(): boolean {
  return Boolean(inject("mongoUri"));
}

/** `describe` that runs only when the in-memory DB is available, otherwise skips (keeps the run green). */
export const describeDb: typeof describe = ((name: string, fn: () => void) =>
  (dbAvailable() ? describe : describe.skip)(name, fn)) as typeof describe;

/**
 * Wires a test file to the shared in-memory MongoDB: connect once, wipe every collection between
 * tests for isolation, disconnect at the end. No-op (safe) if the DB isn't available.
 */
export function useTestDb(): void {
  beforeAll(async () => {
    const uri = inject("mongoUri");
    if (!uri) return;
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }
  });

  afterEach(async () => {
    const db = mongoose.connection.db;
    if (!db) return;
    const collections = await db.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
}
