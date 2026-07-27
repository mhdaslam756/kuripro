import "dotenv/config";

import { createServer } from "node:http";

import { createApp } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { disconnectRedis, redis } from "./config/redis.js";
import { startHealthCheckWorker } from "./jobs/health-check.job.js";
import { startNotificationWorker } from "./modules/notifications/notification.queue.js";
import { seedPermissionCatalog } from "./modules/permissions/permission.repository.js";
import { seedSuperAdmin } from "./modules/super-admin/super-admin.service.js";
import { initSocketServer } from "./sockets/index.js";

async function main(): Promise<void> {
  await connectDatabase();
  // Fail fast if Redis (refresh tokens, job queues) is unreachable at boot.
  await redis.ping();
  // Idempotent — safe on every boot, keeps the Permission catalog in sync with the code.
  await seedPermissionCatalog();
  await seedSuperAdmin();

  const app = createApp();
  const httpServer = createServer(app);
  initSocketServer(httpServer);
  const healthCheckWorker = startHealthCheckWorker();
  const notificationWorker = startNotificationWorker();

  httpServer.listen(env.PORT, () => {
    logger.info(`KuriPro backend listening on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  async function shutdown(signal: string): Promise<void> {
    logger.info(`Received ${signal}, shutting down gracefully`);
    httpServer.close();
    // Close the BullMQ workers before tearing down Redis — they need a live connection to deregister cleanly.
    await Promise.all([healthCheckWorker.close(), notificationWorker.close()]);
    await Promise.all([disconnectDatabase(), disconnectRedis()]);
    process.exit(0);
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((error: unknown) => {
  logger.error({ err: error }, "Failed to start server");
  process.exit(1);
});
