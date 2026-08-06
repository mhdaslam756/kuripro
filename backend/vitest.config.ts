import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup.ts"],
    // Test-only env so the app's config loads safe values and never the live .env (dotenv does not
    // override already-set vars). Redis is mocked in setup.ts; Mongo comes from the in-memory server.
    env: {
      NODE_ENV: "test",
      LOG_LEVEL: "silent",
      MONGODB_URI: "mongodb://127.0.0.1:27017/kuripro-test",
      JWT_ACCESS_SECRET: "test-only-secret-that-is-at-least-32-characters-long",
      JWT_ACCESS_TTL_SECONDS: "900",
      CORS_ORIGIN: "http://localhost:5173",
      // The rate limiters are module-singletons shared across every app instance in the run; raise the
      // ceilings so functional tests don't trip them. The security suite spins up its own low-limit app.
      RATE_LIMIT_MAX: "1000000",
      AUTH_RATE_LIMIT_MAX: "1000000",
      OTP_RATE_LIMIT_MAX: "1000000",
    },
    testTimeout: 30_000,
    hookTimeout: 120_000,
    // One shared in-memory mongod for the whole run; run files serially so they don't clash on it.
    fileParallelism: false,
    pool: "forks",
    reporters: ["default"],
  },
});
