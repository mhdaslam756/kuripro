# KuriPro — Documentation

KuriPro is a production-grade, multi-tenant SaaS for running Indian **Chit Funds (Kuri)** — member
management, chit groups, collections, auctions, prize payouts, finance, reports, notifications, and a
full **installable PWA** with offline collections and biometric login.

This folder is the engineering documentation. Start here, then dive into the topic you need.

| Doc | What's in it |
|-----|--------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design — monorepo layout, backend layering, data model, request lifecycle, jobs, patterns |
| [API.md](./API.md) | REST API reference — conventions, auth, and the endpoints per module |
| [TESTING.md](./TESTING.md) | The test suite — categories, how it's wired (in-memory Mongo + mocked Redis), how to run it |
| [SECURITY.md](./SECURITY.md) | Security model — tenant isolation, authz, sessions, WebAuthn, rate limits, secret hygiene |
| [PWA.md](./PWA.md) | The Progressive Web App — offline/IndexedDB/Background Sync, install, push, camera/QR/GPS, passkeys |
| [blueprint/](./blueprint/) | Original product blueprint, UX spec, design system, and database design |

## The stack at a glance

- **Backend** — Node + Express + TypeScript (ESM), MongoDB via Mongoose, Redis (refresh tokens +
  BullMQ jobs), Zod validation, JWT access tokens + rotating refresh tokens, RBAC by permission.
- **Frontend** — React 19 + Vite + TypeScript, TanStack Query, Tailwind (design tokens), a hand-written
  service worker (offline shell + Background Sync + push), WebAuthn passkeys, FCM web push.
- **Money** — every amount is an integer number of **paise** end to end; the settlement engine balances
  to the paise.
- **Multi-tenancy** — every tenant-owned collection is guarded so a query without a `tenantId` filter
  throws rather than leaking across organizations.

## Quick start

```bash
# from the repo root (npm workspaces)
npm install

# backend needs backend/.env (see backend/.env.example for the shape)
npm run dev:backend      # http://localhost:4000
npm run dev:frontend     # http://localhost:5173

# checks
npm test                 # full test suite (backend + frontend)
npm run build:backend && npm run build:frontend
```

> **Never commit real secrets.** `backend/.env` is gitignored; `backend/.env.example` is a
> placeholder-only template. See [SECURITY.md](./SECURITY.md#secret-hygiene).
