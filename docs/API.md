# API Reference

Base URL: `/(host)/api/v1`. All versioned routes live under one aggregator (`routes/v1.ts`) so a future
`v2` is a new sibling, never a change to `v1`.

## Conventions

- **Format** — JSON in, JSON out. Money is always **integer paise**. Dates are ISO-8601 strings.
- **Auth** — send the access token as `Authorization: Bearer <token>`. The refresh token is an
  `httpOnly` cookie (`kuripro_rt`, path `/api/v1/auth`) set by the server — never read it in JS.
- **Authorization** — most endpoints require both authentication and a specific permission. A missing
  token → `401`; a valid token lacking the permission → `403`.
- **Validation** — request `body`/`query`/`params` are validated with Zod; violations → `400` with
  `error.details`. Unknown fields and NoSQL operator objects are rejected.
- **Pagination** — list endpoints accept `?page=&limit=` and return
  `{ items, page, limit, total, totalPages }`.
- **Errors** — every error is `{ "error": { "code": string, "message": string, "details"?: unknown } }`.
  Internals and stack traces are never sent to clients.
- **Rate limits** (per 15-min window, configurable via env): global `RATE_LIMIT_MAX` (default 300), auth
  `AUTH_RATE_LIMIT_MAX` (20), OTP `OTP_RATE_LIMIT_MAX` (5). Responses carry `RateLimit-*` headers.

## Health

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | none | Liveness |
| GET | `/health/queue` | none | Redis + BullMQ round-trip check |

## Authentication — `/auth`

| Method | Path | Auth | Body / notes |
|---|---|---|---|
| POST | `/auth/register-organizer` | none | Creates tenant + organizer + system roles (transactional). Returns `{ accessToken, deviceId, user }` + sets refresh cookie |
| POST | `/auth/login` | none | `{ email, password, rememberDevice? }` → `{ accessToken, deviceId, user }` |
| POST | `/auth/otp/request` | none | `{ email }` — never reveals whether the account exists |
| POST | `/auth/otp/verify` | none | `{ email, code }` |
| POST | `/auth/forgot-password` / `/auth/reset-password` | none | OTP-based reset |
| POST | `/auth/refresh` | cookie | Rotates the refresh token; returns a fresh `{ accessToken, user }` |
| POST | `/auth/change-password` | Bearer | `{ currentPassword, newPassword }` — revokes all sessions |
| POST | `/auth/logout` | cookie | Revokes the session, clears the cookie |
| GET | `/auth/sessions` | Bearer | List active devices/sessions |
| DELETE | `/auth/sessions/:id` · `/auth/sessions` | Bearer | Revoke one / all-other sessions |

### WebAuthn passkeys — `/auth/webauthn`

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/webauthn/register/options` | Bearer | Begin passkey enrollment (challenge stored in Redis) |
| POST | `/auth/webauthn/register/verify` | Bearer | `{ response, deviceLabel? }` → stores the credential |
| POST | `/auth/webauthn/login/options` | none | `{ email }` — same response whether or not the email exists (no enumeration) |
| POST | `/auth/webauthn/login/verify` | none | `{ email, response }` → `{ accessToken, deviceId, user }` + refresh cookie |
| GET | `/auth/webauthn/credentials` | Bearer | List the user's passkeys |
| DELETE | `/auth/webauthn/credentials/:id` | Bearer | Remove a passkey |

## Devices (push) — `/devices`

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/devices/push-tokens` | Bearer | `{ token, platform }` — register this device for push |
| DELETE | `/devices/push-tokens` | Bearer | `{ token }` — unregister |

## Dashboard — `/dashboard` (permission `dashboard.view`)

| Method | Path | Notes |
|---|---|---|
| GET | `/dashboard/summary` | KPIs, today's collection, pending/overdue, upcoming auctions |
| GET | `/dashboard/trends?months=` | Zero-filled monthly series (collections, member growth, auctions, income/expense, cash flow) + category breakdowns |
| GET | `/dashboard/activity?limit=` | Recent tenant activity feed |

## Notifications — `/notifications`

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET · POST | `/notifications/templates` | `notification.view` / `manage_templates` | List / create templates |
| PATCH · DELETE | `/notifications/templates/:id` | `manage_templates` | Edit / delete (built-ins can't be deleted) |
| POST | `/notifications/send` | `notification.send` | Single send (member or ad-hoc contact) |
| POST | `/notifications/send-bulk` | `notification.send` | Audience send (all / group / overdue / birthdays / custom) |
| GET | `/notifications/history` | `notification.view` | Paginated, filterable history |
| GET | `/notifications/meta` | `notification.view` | Channel availability + stats |

## Auctions — `/auctions` (cycle-scoped)

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/auctions/cycles/:id` | `auction.view` | Full auction state for a cycle |
| GET · POST | `/auctions/cycles/:id/bids` | `view` / `record_bid` | List / record a bid |
| DELETE | `/auctions/cycles/:id/bids/:childId` | `record_bid` | Withdraw a bid |
| POST | `/auctions/cycles/:id/open` · `/close` | `manage` | Open / close bidding |
| POST | `/auctions/cycles/:id/settle` | `manage` | Settle (lowest-bid / manual / lottery) → creates payout, applies dividend |
| POST | `/auctions/cycles/:id/repick` | `manage` | Reverse a settlement and re-pick |
| GET | `/auctions/cycles/:id/audit` | `view` | Append-only audit trail |
| GET | `/auctions/cycles/:id/minutes` · `/voucher` | `view` | Server-generated PDF (pdfkit) |

## Reports — `/reports` (permission `report.view`)

`GET /reports/{monthly|collections|defaulters|members|auctions|payout|cashbook|bank|income|expense|profit}`
— each accepts `?from=&to=&chitGroupId=` and returns a report DTO with chart series.
`GET /reports/{type}/export?format={pdf|excel|csv}` streams the export (permission `report.export`).
Finance entries (misc income/expense) are managed under `/finance/entries` (permission `report.manage_finance`).

## Core resources

These follow standard REST under their mount, guarded by the noted permission family. See each module's
`*.routes.ts` for exact sub-paths.

| Mount | Permission family | Purpose |
|---|---|---|
| `/members` | `members.*` | Member registry, KYC, documents, nominees/guarantors, QR, risk score, prize history |
| `/chit-groups` | `chit_group.*` | Chit groups, enrollment/roster, schedule, cycles, per-group report |
| `/collections` | `collection.*` | Record collections, dues (raise/flag-overdue), receipts, cheque clear/bounce, **offline sync** |
| `/payouts` | `payout.*` | Prize disbursement (single/installments), proof, receipts/vouchers |
| `/finance` | `report.manage_finance` | Manual income/expense entries |
| `/roles` · `/permissions` | `role.manage` | RBAC administration + permission catalog |
| `/organization` · `/branches` | `organization.manage` · `branch.manage` | Tenant profile + branches |
| `/users` | `users.*` | Staff/member-portal user accounts |
| `/activity-logs` | `activity_log.view_tenant` | Audit/activity feed |
| `/uploads` | `upload.create` | Signed uploads (Cloudinary) |

### Offline collections sync

`POST /collections/sync` accepts `{ items: QueuedCollection[] }` where each item carries a stable
`clientReceiptId`. The endpoint is **idempotent** — re-syncing the same client receipt never
double-counts. This backs the PWA's offline outbox and Background Sync (see [PWA.md](./PWA.md)).
