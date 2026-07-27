import { Queue, type Job } from "bullmq";

import { createBullConnection } from "../config/redis.js";

const queueRegistry = new Map<string, Queue>();

/**
 * Returns a lazily-created BullMQ Queue for `name`, cached for the process. Each queue owns a
 * dedicated Redis connection (see `createBullConnection`) rather than sharing the app connection.
 */
export function getQueue<DataType = unknown, ResultType = unknown>(
  name: string,
): Queue<DataType, ResultType> {
  const existing = queueRegistry.get(name);
  if (existing) return existing as Queue<DataType, ResultType>;

  const queue = new Queue<DataType, ResultType>(name, { connection: createBullConnection() });
  queueRegistry.set(name, queue as Queue);
  return queue;
}

export type { Job };
