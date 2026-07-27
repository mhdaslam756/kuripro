# Progressive Web App

KuriPro is an installable PWA built for collection agents in the field — it opens offline, records
collections without a network, syncs when connectivity returns, and supports biometric login, push
notifications, camera, QR scanning, and GPS.

## Service worker

A **hand-written** service worker (`frontend/src/sw.ts`) is bundled by `vite-plugin-pwa` in
`injectManifest` mode — the plugin only injects the Workbox precache manifest; all behavior is ours:

- **Offline app shell** — precaches the built assets + `index.html`; navigations are network-first with
  a cached-shell fallback, so the SPA opens with no connection.
- **Background Sync** — a `sync` handler (tag `kuripro-outbox-sync`) flushes the offline collections
  outbox once connectivity returns, even if the app was closed. It mints an access token from the
  refresh cookie, posts to `/collections/sync`, and clears what synced.
- **Push** — a `push` handler renders background notifications; `notificationclick` focuses/opens the app.
- **Updates** — the page is notified when a new version is waiting and offers a one-tap reload.

Registration and the install/update state live in `lib/pwa-runtime.ts`; UI (offline banner + update
toast) in `components/pwa/pwa-status.tsx`.

## Offline mode & IndexedDB

Collections captured offline are stored in **IndexedDB** (`lib/idb.ts`, via `idb`) as an **outbox**.
Each entry carries a stable `clientReceiptId`, which makes `/collections/sync` **idempotent** — a
collection is never double-counted, even if a sync is retried by the app *and* the service worker.

Two sync paths cooperate:
1. **In-app** — `collect-tab` auto-syncs on the `online` event and offers a manual "Sync now".
2. **Background Sync** — the service worker flushes the same outbox when the app isn't open.

The outbox and queue are covered by `frontend/tests/offline/`.

## Install

`lib/pwa-runtime.ts` captures the browser's `beforeinstallprompt`, exposes `canInstall`, and fires the
native prompt from the **Device & Security** page (and detects when already running standalone). The
install-prompt state machine is tested in `frontend/tests/pwa/pwa-runtime.test.ts`.

## Web app manifest & icons

Configured in `vite.config.ts` and emitted to `dist/manifest.webmanifest`: name, ledger-cream/brass
theme colors, `standalone` display, and maskable + regular PNG icons (`public/pwa-*.png`).

## Device capabilities

All are capability-detected with graceful "unsupported / permission denied" states, surfaced on the
**Device & Security** page and reusable across the app:

| Capability | Module | Notes |
|---|---|---|
| **Camera** | `lib/use-camera.ts`, `components/device/camera-capture.tsx` | `getUserMedia` preview + JPEG capture |
| **QR scanner** | `components/device/qr-scanner.tsx` | Native `BarcodeDetector` with a `@zxing/browser` fallback |
| **GPS** | `lib/use-geolocation.ts` | Explicit permission states; geotags addresses / collection location |
| **Online status** | `lib/use-pwa.ts` | Drives the offline indicator + auto-sync |

## Push notifications (FCM web)

`lib/push.ts` registers the device for **Firebase Cloud Messaging** web push: it requests notification
permission, obtains a token, and registers it with `POST /devices/push-tokens`. The backend's
notification PUSH channel fans a member's notification out to their registered device tokens.

Firebase config comes from public `VITE_FIREBASE_*` build vars. When absent, push reports **"not
configured"** (the same honest-gap pattern as the backend) and never throws — verified in
`frontend/tests/pwa/pwa.test.ts`. Firebase is dynamically imported so it never weighs down the main
bundle.

## Biometric login (passkeys)

`lib/webauthn.ts` (via `@simplewebauthn/browser`) drives passkey enrollment (Device & Security page) and
passwordless sign-in (the "Sign in with a passkey" button on the login page). See the WebAuthn section
of [SECURITY.md](./SECURITY.md#webauthn-passkeys) for the server side.

## What can't be verified headlessly

Real push delivery, native biometric prompts, and installed-standalone behavior require HTTPS + real
provider keys + a real authenticator + device gestures. These paths are built with capability detection
and honest-gap messaging; everything testable (outbox/IndexedDB, install state machine, online status,
push honest-gap, capability detection) is covered by the automated suite, and the flows were validated in
a real browser during development.
