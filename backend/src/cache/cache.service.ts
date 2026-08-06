const CACHE_KEY_PREFIX = "cache:";

export function buildCacheKey(...parts: string[]): string {
  return `${CACHE_KEY_PREFIX}${parts.join(":")}`;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

export async function getOrSetCache<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const entry = memoryCache.get(key);

  if (entry && entry.expiresAt > now) {
    return entry.value as T;
  }

  const value = await fetcher();
  memoryCache.set(key, { value, expiresAt: now + ttlSeconds * 1000 });
  return value;
}

export async function invalidateCache(key: string): Promise<void> {
  memoryCache.delete(key);
}

export async function invalidateCachePattern(pattern: string): Promise<void> {
  const regexPattern = "^" + pattern.replace(/\*/g, ".*") + "$";
  const regex = new RegExp(regexPattern);
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) {
      memoryCache.delete(key);
    }
  }
}
