import { vi } from "vitest";

/**
 * Replace ioredis with an in-memory mock for the entire test run, so nothing ever connects to the
 * live (Upstash) Redis. Covers the shared app connection and every BullMQ connection — queues are not
 * exercised in tests, but this guarantees no real socket is opened. `new Redis(url)` returns the mock.
 */
vi.mock("ioredis", async () => {
  const RedisMock = (await import("ioredis-mock")).default;
  return { Redis: RedisMock, default: RedisMock };
});
