/// <reference lib="webworker" />
import { outboxAll, outboxDelete } from "./lib/idb";
import { OUTBOX_SYNC_TAG } from "./lib/pwa-constants";

// The Workbox precache manifest injected at build time by vite-plugin-pwa (injectManifest strategy).
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

const CACHE = "kuripro-shell-v1";
const APP_SHELL = "/index.html";
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000/api";

// Precache the built assets + app shell so the app opens offline.
const PRECACHE_URLS = [APP_SHELL, ...self.__WB_MANIFEST.map((entry) => entry.url)];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Network-first for navigations, falling back to the cached app shell when offline (SPA routing is
// then handled client-side). Other GETs are served cache-first with a network fallback.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Skip Vite dev server internal routes, HMR updates, extension schemes, and API requests
  if (
    !url.protocol.startsWith("http") ||
    url.pathname.startsWith("/@") ||
    url.pathname.startsWith("/node_modules/") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("__vite")
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(APP_SHELL)) ?? Response.error()),
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches
        .match(request)
        .then((cached) => cached ?? fetch(request))
        .catch(() => Response.error()),
    );
  }
});

// --- Background Sync: flush the offline collections outbox when connectivity returns ---

async function flushOutbox(): Promise<void> {
  const items = await outboxAll();
  if (items.length === 0) return;

  // The API needs a bearer token; mint one from the httpOnly refresh cookie (scoped to /auth).
  const refreshRes = await fetch(`${API_BASE}/auth/refresh`, { method: "POST", credentials: "include" });
  if (!refreshRes.ok) throw new Error("Could not authenticate background sync");
  const { accessToken } = (await refreshRes.json()) as { accessToken: string };

  const syncRes = await fetch(`${API_BASE}/collections/sync`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
    credentials: "include",
    body: JSON.stringify({ items }),
  });
  if (!syncRes.ok) throw new Error("Background sync failed");

  const result = (await syncRes.json()) as { receipts: { clientReceiptId: string }[] };
  await outboxDelete(result.receipts.map((r) => r.clientReceiptId));

  // Let any open tab refresh its queued count.
  const clients = await self.clients.matchAll();
  for (const client of clients) client.postMessage({ type: "OUTBOX_SYNCED", synced: result.receipts.length });
}

self.addEventListener("sync", (event: Event) => {
  const syncEvent = event as Event & { tag: string; waitUntil: (p: Promise<unknown>) => void };
  if (syncEvent.tag === OUTBOX_SYNC_TAG) {
    syncEvent.waitUntil(flushOutbox());
  }
});

// --- Push notifications (FCM/Web Push): show background notifications ---

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload: { title?: string; body?: string; url?: string } = {};
  try {
    const json = event.data.json() as { notification?: { title?: string; body?: string }; data?: Record<string, string> };
    payload = { title: json.notification?.title ?? json.data?.title, body: json.notification?.body ?? json.data?.body, url: json.data?.url };
  } catch {
    payload = { body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title ?? "KuriPro", {
      body: payload.body ?? "",
      icon: "/pwa-192.png",
      badge: "/pwa-192.png",
      data: { url: payload.url ?? "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data as { url?: string } | undefined)?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => "focus" in c);
      if (existing) return (existing as WindowClient).focus();
      return self.clients.openWindow(target);
    }),
  );
});

// Let the page tell a waiting worker to activate immediately (update flow).
self.addEventListener("message", (event) => {
  if ((event.data as { type?: string } | undefined)?.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});
