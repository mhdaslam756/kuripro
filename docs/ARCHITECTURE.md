# Architecture

## Monorepo

npm workspaces with two packages:

```
KuriPro/
├── backend/        Node + Express + TypeScript API (ESM)
│   └── src/
│       ├── app.ts              Express app (helmet, cors, rate-limit, routes, error handler)
│       ├── server.ts           Boot: connect Mongo/Redis, start workers, listen, graceful shutdown
│       ├── config/             env (Zod-validated), db, redis, logger
│       ├── middleware/         jwt-auth, rbac, validate, tenant-scope.plugin, error handler
│       ├── modules/<domain>/   one folder per domain (model, repository, service, controller, routes, validators)
│       ├── jobs/               BullMQ queue + worker factories
│       └── utils/              money, pagination, app-error, mongoose-helpers, …
├── frontend/       React 19 + Vite + TypeScript PWA
│   └── src/
│       ├── features/<domain>/  page + hooks + components + types per feature
│       ├── components/         ui/ (design system), layout/, device/, pwa/
│       ├── lib/                api-client, auth-context, idb, pwa, push, webauthn, format, …
│       └── sw.ts               hand-written service worker (precache + Background Sync + push)
└── docs/
```

## Backend layering

Every domain module follows the same strict layering, so responsibilities never blur:

```
HTTP  →  routes  →  (auth → rbac → validate middleware)  →  controller  →  service  →  repository  →  Mongoose model
```

- **routes** — declare paths, attach `requireAuth`, `requirePermission("…")`, and `validate({ body, query, params })`.
- **controller** — thin. Pulls `tenantId`/`userId` from `req.auth`, calls a service, shapes the HTTP response.
- **service** — business logic and orchestration. **Services never import Mongoose models directly** —
  they go through repositories. (The one deliberate exception is a *read-model* repository, see below.)
- **repository** — the only layer that touches models. Every query passes `tenantId` explicitly.
- **model** — Mongoose schema + the `tenantScopedPlugin` guard.

### Read-model repositories

Reports and the Dashboard intentionally span many collections. Rather than scatter cross-cutting
aggregation across every module, each has a single read-only repository
(`reports/report.repository.ts`, `dashboard/dashboard.repository.ts`) that aggregates directly from
models and never writes. This keeps the "one module owns its writes" rule intact while giving analytics
a clean home.

## Multi-tenancy & data isolation

`tenantScopedPlugin` (`middleware/tenant-scope.plugin.ts`) is attached to every tenant-owned schema. It
intercepts `find`, `findOne`, `update*`, `delete*`, and `countDocuments` and **throws if the filter has
no `tenantId`** — a forgotten scope fails loudly instead of leaking one organization's money/members to
another. Genuine cross-tenant/admin queries opt in explicitly with `{ tenantId: { $exists: true } }`.

See [SECURITY.md](./SECURITY.md) for the full isolation model, and the `tests/integration/tenant-scope.test.ts`
suite which proves the guard against a real database.

## Money

All amounts are **integer paise** — stored, transported, and computed as integers — so there is never a
floating-point rupee. `utils/money.ts` centralizes conversions (`rupeesToPaise`, `percentageOfPaise`,
`sumPaise`, `formatPaiseAsINR`). The auction **settlement engine** (`modules/auctions/settlement.ts`) is
the money-critical core and holds an exact invariant:

```
prize + commission + (dividendPerMember × members) === pot
```

The foreman absorbs the sub-paise-per-member rounding remainder so nothing is created or lost. This is
covered exhaustively in `tests/unit/settlement.test.ts`.

## Authentication & sessions

- **Access tokens** — short-lived JWTs (15 min) carrying `userId`, `tenantId`, `roleId`, and the
  flattened `permissions[]`.
- **Refresh tokens** — opaque, stored in Redis, **rotated on every refresh**; a matching `Session`
  document records the device. The refresh token lives in an `httpOnly`, `sameSite=strict` cookie scoped
  to `/api/v1/auth`.
- **Permissions are re-resolved from the DB on every refresh**, so a permission change takes effect within
  one access-token lifetime rather than the refresh token's full life.
- **Passkeys (WebAuthn)** — passwordless biometric login; credentials are stored server-side and verified
  with challenge/response (challenges held in Redis). See [SECURITY.md](./SECURITY.md#webauthn-passkeys).

## Authorization (RBAC)

Authorization is **permission-based**, not role-name-based. A central catalog
(`modules/permissions/permission.catalog.ts`) defines every permission key; `role.defaults.ts` maps the
built-in roles (ORGANIZER / STAFF / MEMBER) to their keys. Middleware `requirePermission("collection.record")`
checks the permission carried in the JWT. Roles are editable per tenant; the four system role *slugs*
(`SUPER_ADMIN`, `ORGANIZER`, `STAFF`, `MEMBER`) remain stable for the rare rule that must recognize one.

## Request lifecycle

1. `helmet` sets security headers; `cors` allows the configured origin with credentials.
2. A global rate limiter (per 15-min window) runs before routing.
3. `requireAuth` verifies the JWT and populates `req.auth`.
4. `requirePermission` checks the needed permission.
5. `validate` parses `body`/`query`/`params` with Zod (rejecting anything unexpected — including NoSQL
   operator-injection attempts).
6. Controller → service → repository → Mongo.
7. A central error handler maps `AppError`s to `{ error: { code, message, details? } }` and never leaks
   internals or stack traces to clients.

## Asynchronous jobs (BullMQ)

`jobs/queue.ts` and `jobs/worker.ts` are thin factories over BullMQ. Each queue/worker gets a **dedicated
Redis connection** (`createBullConnection`) — never the shared app connection — because workers issue
blocking commands. Workers are started at boot in `server.ts` and closed on graceful shutdown. Current
queues: health-check and **notifications** (async delivery with retry/backoff).

## Notifications

A channel-abstracted delivery system (WhatsApp/SMS via Twilio, Email via Resend, Push via FCM). Each
channel implements a common `Channel` interface; a registry reports which are configured. Unconfigured
channels degrade to a **dev-console** log in development and fail clearly in production (the "honest-gap"
pattern used throughout for optional providers). Sends are queued and delivered by the notification
worker; PUSH fans out to a member's registered device tokens.

## Frontend

- **Data** — TanStack Query hooks per feature call a small typed `api` client (`lib/api-client.ts`) that
  attaches the in-memory access token and transparently refreshes on a 401.
- **Auth** — `auth-context` bootstraps the session on load via a silent `/auth/refresh` (no separate
  `/me` call), and exposes `login`, `loginWithPasskey`, `hasPermission`, etc.
- **Design system** — Tailwind with a ledger-cream + brass token palette; theme-aware (light/dark) SVG
  charts built without a charting dependency.
- **PWA** — installable, offline-capable, with a hand-written service worker. See [PWA.md](./PWA.md).

## Environment configuration

`config/env.ts` validates all environment variables with Zod at boot and **fails fast** on anything
missing or malformed. Optional providers (Cloudinary, Firebase, Twilio, Resend) are truly optional — the
app runs without them and reports the gap. Rate-limit ceilings, JWT TTLs, and WebAuthn RP settings are all
configurable. See `backend/.env.example` for the full shape.
