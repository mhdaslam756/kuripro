import { Worker, type Processor } from "bullmq";

import { createBullConnection } from "../config/redis.js";
import { logger } from "../config/logger.js";

/**
 * Creates a BullMQ Worker for `name` with completion/failure logging. The worker gets its own
 * dedicated Redis connection — workers issue blocking commands and must never share the app socket.
 */
export function createWorker<DataType = unknown, ResultType = unknown>(
  name: string,
  processor: Processor<DataType, ResultType>,
): Worker<DataType, ResultType> {
  const worker = new Worker<DataType, ResultType>(name, processor, { connection: createBullConnection() });

  worker.on("completed", (job) => {
    logger.debug({ queue: name, jobId: job.id }, "Job completed");
  });

  worker.on("failed", (job, error) => {
    logger.error({ queue: name, jobId: job?.id, err: error }, "Job failed");
  });

  return worker;
}
