import { QueueEvents, type Worker } from "bullmq";

import { createBullConnection } from "../config/redis.js";
import { getQueue } from "./queue.js";
import { createWorker } from "./worker.js";

export const HEALTH_CHECK_QUEUE_NAME = "health-check";

interface HealthCheckJobData {
  pingedAt: string;
}

interface HealthCheckJobResult {
  pongedAt: string;
}

let queueEvents: QueueEvents | undefined;

function getQueueEvents(): QueueEvents {
  queueEvents ??= new QueueEvents(HEALTH_CHECK_QUEUE_NAME, { connection: createBullConnection() });
  return queueEvents;
}

/** Starts the worker that processes health-check pings — call once at server boot. */
export function startHealthCheckWorker(): Worker<HealthCheckJobData, HealthCheckJobResult> {
  return createWorker<HealthCheckJobData, HealthCheckJobResult>(HEALTH_CHECK_QUEUE_NAME, async () => {
    return { pongedAt: new Date().toISOString() };
  });
}

/**
 * Enqueues a ping job and waits (bounded by `timeoutMs`) for a worker to actually process it —
 * proves the full Redis + BullMQ + worker pipeline is alive, not just that enqueueing succeeded.
 */
export async function pingQueue(timeoutMs = 5000): Promise<HealthCheckJobResult> {
  const queue = getQueue<HealthCheckJobData, HealthCheckJobResult>(HEALTH_CHECK_QUEUE_NAME);
  const job = await queue.add("ping", { pingedAt: new Date().toISOString() });
  return job.waitUntilFinished(getQueueEvents(), timeoutMs);
}
