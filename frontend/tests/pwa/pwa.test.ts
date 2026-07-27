import { describe, expect, it, vi } from "vitest";

import { OUTBOX_SYNC_TAG, isStandalone, requestOutboxSync } from "@/lib/pwa";
import { enablePush, isPushConfigured, isPushSupported, notificationPermission } from "@/lib/push";

describe("PWA helpers", () => {
  it("exposes a stable Background Sync tag shared with the service worker", () => {
    expect(OUTBOX_SYNC_TAG).toBe("kuripro-outbox-sync");
  });

  it("requestOutboxSync is a safe no-op when Service Workers are unavailable", async () => {
    // jsdom has no navigator.serviceWorker — must resolve, never throw.
    await expect(requestOutboxSync()).resolves.toBeUndefined();
  });

  it("isStandalone is false in a normal (non-installed) window", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }));
    expect(isStandalone()).toBe(false);
  });
});

describe("Push (honest-gap when Firebase isn't configured)", () => {
  it("reports push as not configured without VITE_FIREBASE_* env", () => {
    expect(isPushConfigured()).toBe(false);
  });

  it("notificationPermission is a defined state", () => {
    expect(["default", "granted", "denied", "unsupported"]).toContain(notificationPermission());
  });

  it("enablePush fails gracefully (never throws) when unconfigured/unsupported", async () => {
    const res = await enablePush();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBeTruthy();
  });

  it("isPushSupported returns a boolean", () => {
    expect(typeof isPushSupported()).toBe("boolean");
  });
});
