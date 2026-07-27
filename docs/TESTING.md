# Testing

The suite runs on **Vitest** in both workspaces. It is **hermetic** — no test ever touches the live
MongoDB Atlas or Upstash Redis in `backend/.env`.

```bash
npm test              # everything (backend then frontend)
npm run test:backend  # backend only
npm run test:frontend # frontend only

# watch mode (per workspace)
npm --workspace backend run test:watch
npm --workspace frontend run test:watch
```

Current status: **94 tests** — backend 68 (10 files), frontend 26 (7 files) — all green.

## Categories

| Category | Where | What it covers |
|---|---|---|
| **Unit** | `backend/tests/unit`, `frontend/tests/unit` | Pure logic: settlement invariants, money/paise conversions, installment status, notification templating, permission-catalog integrity; frontend template-vars, formatters, `useOnlineStatus` |
| **Integration** | `backend/tests/integration` | Real Mongoose against an in-memory DB: the tenant-scope guard, and the money aggregations that feed the dashboard |
| **API** | `backend/tests/api` | Full-stack HTTP (supertest → controller → service → repo → DB): authed reads, list shapes, guards |
| **Authentication** | `backend/tests/api/auth.test.ts` | register → login → refresh → logout → change-password lifecycle, password policy, passkey option non-enumeration |
| **Security** | `backend/tests/security` | Helmet headers, rate-limit enforcement, no-token/forged-JWT rejection, tenant isolation, NoSQL-operator-injection rejection, no secret leakage |
| **Performance** | `backend/tests/performance` | Throughput budgets (50k settlements / template renders) + `/health` p95 latency |
| **PWA** | `frontend/tests/pwa` | Background-Sync tag, install-prompt state machine, `isStandalone`, push honest-gap |
| **Offline** | `frontend/tests/offline` | IndexedDB outbox add/upsert/delete/clear + the collections offline queue (idempotent, GPS-stamped) |

## How the backend harness works

- **In-memory MongoDB** — `tests/global-setup.ts` starts one `MongoMemoryReplSet` for the whole run
  (a replica set, because auth registration uses multi-document transactions) and hands its URI to
  every file via Vitest `provide`/`inject`. If the mongod binary can't be provisioned, the URI is
  provided empty and DB-backed suites **auto-skip** — the rest stays green.
- **Mocked Redis** — `tests/setup.ts` replaces `ioredis` with `ioredis-mock`, so refresh-token and
  challenge storage work in-memory and no real socket is ever opened.
- **Safe env** — `vitest.config.ts` sets test-only `env` (Mongo URI placeholder, dummy JWT secret,
  raised rate limits). Because `dotenv` never overrides already-set variables, the live `.env` values
  are never used.
- **Isolation** — `useTestDb()` connects once, **wipes every collection between tests**, and disconnects
  at the end. `describeDb(...)` runs a suite only when the DB is available.
- **Rate limits** — the limiters are module-singletons shared across app instances; test env raises the
  ceilings so functional tests don't trip them, while the security suite spins up its **own** low-limit
  app to prove enforcement (429).

Helpers live in `backend/tests/helpers/`:
- `db.ts` — `useTestDb()`, `describeDb`, `dbAvailable()`
- `api.ts` — `makeAgent()`, `registerOrg()`, `validRegisterPayload()`, `bearer()`

## How the frontend harness works

- **jsdom** environment with `@testing-library/react` (+ `jest-dom` matchers, auto-cleanup).
- **`fake-indexeddb/auto`** provides a real IndexedDB implementation so the offline outbox is tested for
  real, not mocked.
- The `virtual:pwa-register` module (only present under the vite-plugin-pwa build) is **aliased to a
  stub** in `vitest.config.ts` so PWA modules import cleanly.

## Adding a test

- **Pure function** → `tests/unit/…`. No DB/Redis needed.
- **Needs the database** → wrap the suite in `describeDb(...)` and call `useTestDb()`; insert via models
  or drive the real API with `registerOrg()`.
- **HTTP behavior** → use `makeAgent()` (a fresh app per agent, so the rate limiter is isolated).

## CI notes

The first backend run downloads the in-memory mongod (~130 MB) into the mongodb-memory-server cache;
subsequent runs reuse it. In a sandbox without that binary, DB-backed suites skip automatically and the
unit/security-headers/performance/frontend suites still run and pass.
