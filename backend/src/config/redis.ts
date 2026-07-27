import { Redis, type RedisOptions } from "ioredis";

import { env } from "./env.js";
import { logger } from "./logger.js";

/**
 * Primary shared connection for application use — cache, refresh tokens, sessions.
 *
 * BullMQ is deliberately NOT given this connection. Queues, workers and queue-events each get their
 * own dedicated connection via `createBullConnection()`, because a BullMQ worker issues *blocking*
 * commands (BRPOPLPUSH, etc.) that must not share a socket with regular request/response traffic —
 * doing so causes reconnect churn and `read ECONNRESET` as the two usage patterns fight over one
 * connection.
 */
export const redis = new Redis(env.REDIS_URL);

// Log the first successful connection once, and surface errors. We intentionally don't log every
// `connect` event: a single instance re-emits it on every reconnect, which floods the logs. Genuine
// reconnect attempts are visible at debug level; errors always surface.
redis.once("ready", () => logger.info("Redis connected"));
redis.on("reconnecting", (delayMs: number) => logger.debug({ delayMs }, "Redis reconnecting"));
redis.on("error", (error) => logger.error({ err: error }, "Redis connection error"));

/**
 * A dedicated connection for a single BullMQ Queue / Worker / QueueEvents. BullMQ requires
 * `maxRetriesPerRequest: null`; each construct should own its connection rather than sharing one.
 * These are intentionally quiet (no per-connect logging) to avoid multiplying startup log lines.
 */
export function createBullConnection(): Redis {
  const options: RedisOptions = { maxRetriesPerRequest: null };
  return new Redis(env.REDIS_URL, options);
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}
