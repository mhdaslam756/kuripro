import type { ClientSession } from "mongoose";

import { Counter } from "./counter.model.js";

/** Atomically increments and returns the next value in a per-tenant named sequence. */
export async function getNextSequence(tenantId: string, name: string, session?: ClientSession): Promise<number> {
  const counter = await Counter.findOneAndUpdate(
    { tenantId, name },
    { $inc: { value: 1 } },
    { upsert: true, new: true, session },
  );
  return counter.value;
}
