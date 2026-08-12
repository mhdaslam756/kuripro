# KuriPro Backend Architecture

This is the reference for how the backend is organized and the conventions every module follows. If you're adding a new module, copy an existing one (`chit-groups` is the most complete example) rather than inventing a new shape.

## Folder structure

```
backend/src/
├── config/          env, db, redis, logger, cloudinary, firebase — process-wide setup
├── cache/           generic Redis cache-aside helper
├── jobs/            BullMQ queue/worker factories + job definitions
├── uploads/         generic file-upload middleware/service (Cloudinary)
├── routes/          route aggregator (index.ts)
├── middleware/       cross-cutting Express middleware
├── modules/
│   └── <name>/
│       ├── <name>.model.ts        Mongoose schema + TS interface
│       ├── <name>.repository.ts   all data access for this model
│       ├── <name>.service.ts      business logic, orchestration, transactions
│       ├── <name>.controller.ts   HTTP request/response only
│       ├── <name>.routes.ts       Express Router wiring
│       └── <name>.validators.ts   Zod schemas
├── sockets/          Socket.io setup
├── types/            shared TS types, Express Request augmentation
├── utils/            framework-agnostic helpers (money, pagination, errors, ...)
├── app.ts            Express app assembly (no server binding)
└── server.ts         process entry point — binds the port, owns graceful shutdown
```

## Layering

**Controller → Service → Repository → Model.** Each layer only talks to the one directly below it.

- **Controller**: reads `req`, calls exactly one service function, writes `res`. No business rules, no direct Mongoose access, ever.
- **Service**: business rules, validation that depends on other data, orchestration across repositories, and transaction ownership (`mongoose.startSession()` / `session.withTransaction()` lives here, not in repositories).
- **Repository**: the *only* place that imports a Mongoose model and builds a query. Every function takes plain values in (strings, not pre-cast `ObjectId`s) and returns hydrated documents or plain DTOs. If a query needs a `ClientSession` to participate in a transaction, it's the last parameter, optional.
- **Model**: schema definition, validation, indexes, instance/static methods. Never imported outside its own module's repository.

This is why `chit-group.service.ts` has zero `import { ChitGroup }` — it only imports from `chit-group.repository.ts`. If a service needs a new query shape, add a function to the repository; don't reach past it.

## Naming conventions

- **Files**: `kebab-case.role.ts` — `chit-group.controller.ts`, not `ChitGroupController.ts` or `controllers/chitGroup.ts`.
- **Functions**: verbs that say what happens — `createChitGroup`, `findUserByEmail`, `listChitGroups`. Repository functions are named after the query, not CRUD-generic (`findUserByEmail`, not `find`).
- **Types**: `PascalCase`. A model's document type is always `<Name>Document` (the hydrated Mongoose doc), its plain-field interface is `<Name>Doc`. A repository's create-input type is `Create<Name>Input`/`Create<Name>Data`.
- **Routers**: exported as `<name>Router` (`chitGroupRouter`), one per module, mounted once in `routes/index.ts`.
- **Booleans**: `is`/`has`/`must` prefix (`isDeleted`, `hasWon`, `mustChangePassword`) — never a bare adjective.

## REST standards

- Resource paths are plural nouns: `/chit-groups`, `/users` — never verbs in the path (`/createChitGroup` is wrong).
- Nesting reflects real ownership, max two levels deep: `/chit-groups/:id/members`, not `/chit-groups/:id/members/:memberId/tickets/:ticketId`.
- HTTP verbs carry the action — `POST` create, `GET` read, no bespoke `POST /chit-groups/:id/get`.
- Status codes: `200` read/update, `201` create, `204` no-content (logout, change-password), `400` validation, `401` unauthenticated, `403` unauthorized, `404` missing, `409` conflict (duplicate, wrong state), `500` unexpected.
- Every error response has the same shape: `{ error: { code, message, details? } }` — enforced centrally in `middleware/error-handler.ts`, never assembled ad hoc in a controller.
- List endpoints always return `{ items, page, limit, total, totalPages }` (see `utils/pagination.ts`) — never a bare array, so adding pagination later is never a breaking change.
- Query filters are always optional and additive — a filterable list endpoint must still return sensible results with zero query params.

## API routing

Every module's router is mounted once in `routes/index.ts` under `/api`.

## Authentication

JWT access tokens (`middleware/jwt-auth.ts`, `requireAuth`) — short-lived, verified per-request, populate `req.auth`. Refresh tokens are opaque, Redis-backed, rotating on every use (`modules/auth/token.service.ts`) — never a second JWT for refresh.

## Authorization

Role check via `middleware/rbac.ts`'s `requireRole(...)`, applied per-route, never inferred from the frontend. Tenant isolation is enforced twice: explicitly (every repository query takes `tenantId`) and structurally (`middleware/tenant-scope.plugin.ts` refuses to execute an unscoped query against a tenant-owned collection at the Mongoose layer).

## Error handling

Throw `AppError` (`utils/app-error.ts`) from any layer — controllers, services, or repositories. Express 5 forwards a rejected promise from any handler automatically, so no `try/catch`-and-`next(err)` boilerplate is needed in controllers. `middleware/error-handler.ts` is the single place that turns any thrown value (`AppError`, Zod, Mongoose validation/cast/duplicate-key, or an unexpected error) into the standard response shape.

## Logging

Structured logging via `pino` (`config/logger.ts`), attached per-request via `pino-http`. Secrets (`password`, `passwordHash`, `refreshToken`, the `authorization` header) are redacted centrally — never log a request/response body containing one of these fields directly.

## Caching

`cache/cache.service.ts` provides a generic cache-aside helper (`getOrSetCache`, `invalidateCache`, `invalidateCachePattern`), namespaced under a `cache:` Redis key prefix (`buildCacheKey`). It has no opinion on *what* to cache or for how long — that's a per-service decision made when a real read-heavy, rarely-changing query justifies it. Nothing is wired up to use it yet; this is the infrastructure, not a caching policy.

## Queue

`jobs/queue.ts` / `jobs/worker.ts` are thin factories over BullMQ (`getQueue(name)`, `createWorker(name, processor)`), sharing the same Redis connection as everything else. `jobs/health-check.job.ts` is a real, working queue+worker pair (`GET /health/queue` enqueues a ping and waits for a worker to actually process it) that proves the pipeline end-to-end without embedding any domain logic — the pattern to copy when a real job (reminders, settlement) is ready to be built.

## File upload

`uploads/upload.middleware.ts` (multer, memory storage, type/size limits) + `uploads/upload.service.ts` (streams the buffer to Cloudinary) back a generic authenticated `POST /api/v1/uploads` endpoint returning `{ url, publicId }`. It has no opinion on what the file is *for* — associating an uploaded file with a KYC document, a receipt, etc. is business logic that belongs in whichever module needs it, built on top of this.

## Validation

Every request boundary (`body`, `query`, `params`) is validated with Zod via `middleware/validate.js`, before the controller runs — a controller should never need to defensively check `req.body` shape itself.
