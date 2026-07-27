import { OUTBOX_SYNC_TAG } from "./pwa-constants";

export { OUTBOX_SYNC_TAG };

interface SyncManager {
  register: (tag: string) => Promise<void>;
}

/**
 * Asks the browser to fire a Background Sync (the service worker will flush the offline outbox once
 * connectivity returns, even if the app is closed). Best-effort: not all browsers support the Sync
 * API — the app's own `online` listener is the fallback. Never throws.
 */
export async function requestOutboxSync(): Promise<void> {
  try {
    if (!("serviceWorker" in navigator)) return;
    const registration = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & { sync?: SyncManager };
    if (registration.sync) {
      await registration.sync.register(OUTBOX_SYNC_TAG);
    }
  } catch {
    // Sync API unavailable or registration failed — the in-app online listener will cover it.
  }
}

/** True when the app is running as an installed PWA (standalone display mode). */
export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari exposes standalone on navigator instead of matchMedia.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
