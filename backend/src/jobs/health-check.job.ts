import { getQueue } from "./queue.js";
import { createWorker } from "./worker.js";

export const HEALTH_CHECK_QUEUE_NAME = "health-check";

interface HealthCheckJobData {
  pingedAt: string;
}

interface HealthCheckJobResult {
  pongedAt: string;
}

export function startHealthCheckWorker() {
  return createWorker<HealthCheckJobData, HealthCheckJobResult>(HEALTH_CHECK_QUEUE_NAME, async () => {
    return { pongedAt: new Date().toISOString() };
  });
}

export async function pingQueue(_timeoutMs = 5000): Promise<HealthCheckJobResult> {
  const queue = getQueue<HealthCheckJobData, HealthCheckJobResult>(HEALTH_CHECK_QUEUE_NAME);
  const job = await queue.add("ping", { pingedAt: new Date().toISOString() });
  return job.waitUntilFinished();
}
