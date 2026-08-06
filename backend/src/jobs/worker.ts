import { logger } from "../config/logger.js";
import { registerWorkerProcessor } from "./queue.js";

export function createWorker<DataType = unknown, ResultType = unknown>(
  name: string,
  processor: (job: { id: string; data: DataType }) => Promise<ResultType>,
) {
  registerWorkerProcessor<DataType, ResultType>(name, async (job) => {
    try {
      const res = await processor(job);
      logger.debug({ queue: name, jobId: job.id }, "Job completed");
      return res;
    } catch (error) {
      logger.error({ queue: name, jobId: job.id, err: error }, "Job failed");
      throw error;
    }
  });

  return { close: async () => {} };
}
