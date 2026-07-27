# Security Model

KuriPro handles members' money, so security is defense-in-depth, not an afterthought. This document
describes the controls and how they're tested.

## Tenant isolation

The strongest guarantee: **one organization can never read or write another's data.**

- Every tenant-owned Mongoose schema uses `tenantScopedPlugin`, which throws on any `find`/`update`/
  `delete`/`count` whose filter lacks `tenantId`. A forgotten scope is a loud crash, not a silent leak.
- Repositories always pass `tenantId` from the authenticated request context (`req.auth.tenantId`),
  never from client input.
- Cross-tenant/admin operations must opt in explicitly with `{ tenantId: { $exists: true } }`.

Tested by `tests/integration/tenant-scope.test.ts` (the guard) and
`tests/security/security.test.ts` (two orgs, isolated data + tenant contexts).

## Authentication

- **Access tokens** — short-lived (15 min) JWTs, HMAC-signed with `JWT_ACCESS_SECRET` (≥ 32 chars,
  enforced at boot). They carry `userId`, `tenantId`, `roleId`, and `permissions[]`.
- **Refresh tokens** — opaque, stored server-side in Redis and **rotated on every refresh**; the old
  token is invalidated. Delivered in an `httpOnly`, `secure` (in prod), `sameSite=strict` cookie scoped
  to `/api/v1/auth` so it is never exposed to JS or sent to non-auth endpoints.
- **Session records** track each device; users can list and revoke sessions, and "log out everywhere."
- **Password policy** — ≥ 10 chars with upper, lower, and digit; hashed with a strong KDF. Changing or
  resetting a password **revokes every session**.
- **No user enumeration** — OTP request, forgot-password, and passkey-login-options all return the same
  response whether or not the email exists.
- Forged or tampered JWTs are rejected (`tests/security` → "rejects a tampered/forged JWT").

## WebAuthn (passkeys)

Passwordless, phishing-resistant biometric login.

- Registration and authentication use proper challenge/response; challenges are stored in Redis with a
  short TTL and consumed once.
- Public keys and signature counters are stored per credential; the counter guards against cloned
  authenticators.
- A passkey is bound to its account: at login the credential's user must match the claimed email, so a
  valid passkey for account A can't sign into account B.
- RP ID / origin are configured via `WEBAUTHN_RP_ID` / `WEBAUTHN_ORIGIN`.

## Authorization (RBAC)

- Permission-based, checked by `requirePermission("…")` against the permissions embedded in the JWT.
- Permissions are **re-resolved from the database on every refresh**, so revoking a permission takes
  effect within one access-token lifetime (≤ 15 min), not the refresh token's full life.
- The permission catalog and default role grants are integrity-tested (`tests/unit/permissions-integrity.test.ts`):
  no unknown keys, no duplicates, valid categories.

## Input validation & injection

- Every `body`/`query`/`params` is parsed with **Zod** before it reaches business logic. Unexpected
  fields are dropped and type mismatches rejected with `400`.
- Because inputs are coerced to their declared primitive types, **NoSQL operator injection** (e.g. a
  login body of `{ "email": { "$ne": null } }`) is rejected at the boundary and never reaches the query
  layer — proven in `tests/security`.
- JSON bodies are capped at 1 MB.

## Transport & headers

- **helmet** sets a strict `Content-Security-Policy`, `X-Content-Type-Options: nosniff`,
  `X-Frame-Options`, `Strict-Transport-Security`, `Referrer-Policy: no-referrer`, and more.
- **CORS** allows only the configured `CORS_ORIGIN`, with credentials.
- All secrets belong on HTTPS transports (e.g. managed Redis requires the `rediss://` TLS scheme).

## Rate limiting

Per-IP limits over a 15-minute window, configurable via env with production defaults:

| Scope | Env | Default |
|---|---|---|
| Global API | `RATE_LIMIT_MAX` | 300 |
| Auth (login/register/refresh/webauthn) | `AUTH_RATE_LIMIT_MAX` | 20 |
| OTP request / forgot-password | `OTP_RATE_LIMIT_MAX` | 5 |

Responses advertise `RateLimit-*` headers. Enforcement (429 past the ceiling) is tested in
`tests/security`.

## Error hygiene

The central error handler returns only `{ error: { code, message, details? } }`. Stack traces and
internal identifiers are never sent to clients, and error bodies are verified not to contain secrets or
connection strings (`tests/security` → "structured error shape without leaking internals").

## Secret hygiene

- `backend/.env` holds live secrets and is **gitignored**.
- `backend/.env.example` is a **placeholder-only** template (`.gitignore` force-includes it via
  `!.env.example`, so it must never contain real values).
- The env schema fails fast on missing/short secrets at boot.
- Optional third-party providers (Cloudinary, Firebase, Twilio, Resend) are omitted safely — the app
  reports the gap rather than embedding fallback credentials.

> If a real secret is ever committed to a tracked file, treat it as compromised and **rotate it**
> (database password, Redis token, API keys, service-account key), then purge it from history.
