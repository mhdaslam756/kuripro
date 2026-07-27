import { redis } from "../config/redis.js";
import { logger } from "../config/logger.js";

const CACHE_KEY_PREFIX = "cache:";

/** Namespaces a cache key under the shared `cache:` prefix, distinct from refresh-token/BullMQ keys in the same Redis instance. */
export function buildCacheKey(...parts: string[]): string {
  return `${CACHE_KEY_PREFIX}${parts.join(":")}`;
}

/**
 * Cache-aside helper: returns the cached value at `key` if present, otherwise calls `fetcher`,
 * caches its result for `ttlSeconds`, and returns it. Callers own cache invalidation via
 * `invalidateCache`/`invalidateCachePattern` — this helper has no opinion on when data goes stale.
 */
export async function getOrSetCache<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
  const cached = await redis.get(key);
  if (cached !== null) {
    try {
      return JSON.parse(cached) as T;
    } catch (error) {
      logger.warn({ key, err: error }, "Failed to parse cached value — refetching and overwriting");
    }
  }

  const value = await fetcher();
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  return value;
}

export async function invalidateCache(key: string): Promise<void> {
  await redis.del(key);
}

/** Invalidates every key matching a glob pattern, e.g. `buildCacheKey("tenant", tenantId, "*")`. */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  const stream = redis.scanStream({ match: pattern, count: 100 });
  const keysToDelete: string[] = [];

  for await (const keys of stream as AsyncIterable<string[]>) {
    keysToDelete.push(...keys);
  }

  if (keysToDelete.length > 0) {
    await redis.del(keysToDelete);
  }
}
