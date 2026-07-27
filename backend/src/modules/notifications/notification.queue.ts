import { getQueue } from "../../jobs/queue.js";
import { createWorker } from "../../jobs/worker.js";
import { dispatchNotification } from "./notification.dispatch.js";

export const NOTIFICATION_QUEUE_NAME = "notifications";

export interface NotificationJobData {
  tenantId: string;
  notificationId: string;
}

/** Enqueues a notification for asynchronous delivery by the worker (retried by BullMQ on failure). */
export async function enqueueNotification(tenantId: string, notificationId: string): Promise<void> {
  await getQueue<NotificationJobData>(NOTIFICATION_QUEUE_NAME).add(
    "send",
    { tenantId, notificationId },
    { attempts: 3, backoff: { type: "exponential", delay: 2000 }, removeOnComplete: 1000, removeOnFail: 5000 },
  );
}

/** Starts the worker that delivers queued notifications — call once at server boot. */
export function startNotificationWorker() {
  return createWorker<NotificationJobData>(NOTIFICATION_QUEUE_NAME, async (job) => {
    await dispatchNotification(job.data.tenantId, job.data.notificationId);
  });
}
