import { api } from "./api-client";

const PUSH_TOKEN_KEY = "kuripro_push_token";

export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
}

export function isPushConfigured(): boolean {
  return isPushSupported();
}

export function isIosDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  return isPushSupported() ? Notification.permission : "unsupported";
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type EnablePushResult =
  | { ok: true; token: string; error?: undefined }
  | { ok: false; error: string; token?: undefined };

/**
 * Registers this device for server-side push notifications.
 * Requests browser permission, obtains a Web Push subscription via Service Worker,
 * and syncs the delivery token with the backend.
 */
export async function enablePush(): Promise<EnablePushResult> {
  if (!isPushSupported()) {
    if (isIosDevice()) {
      return {
        ok: false,
        error: "On iPhone/iPad, please add KuriPro to your Home Screen first to enable push alerts (Tap Share → Add to Home Screen).",
      };
    }
    return { ok: false, error: "This browser doesn't support push notifications." };
  }

  if (Notification.permission === "denied") {
    return {
      ok: false,
      error: "Notifications are blocked in your browser settings. Please allow notifications in your browser.",
    };
  }

  let permission: NotificationPermission = Notification.permission;
  if (permission === "default") {
    try {
      permission = await Notification.requestPermission();
    } catch {
      permission = await new Promise<NotificationPermission>((resolve) => {
        Notification.requestPermission(resolve);
      });
    }
  }

  if (permission !== "granted") {
    return {
      ok: false,
      error: "Notification permission was not granted.",
    };
  }

  // 1. Standard Web Push (W3C Push API via Service Worker with server VAPID key)
  let activeVapidKey: string | null = null;
  try {
    const res = await api.get<{ publicKey: string | null }>("/devices/vapid-public-key");
    if (res?.publicKey) {
      activeVapidKey = res.publicKey;
    }
  } catch {
    // fallback to env vars
  }

  if (!activeVapidKey) {
    activeVapidKey =
      (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ||
      (import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined) ||
      null;
  }

  let pushError: string | null = null;

  // Check 1: Insecure HTTP context (e.g. 192.168.x.x on mobile)
  if (typeof window !== "undefined" && !window.isSecureContext) {
    pushError = "Web Push requires a Secure Context (HTTPS or localhost). Browsers strictly block push notifications over unencrypted HTTP (such as http://192.168.x.x). Please connect via HTTPS or localhost.";
  }
  // Check 2: iOS Safari requires installation to Home Screen for Web Push
  else if (isIosDevice() && !window.matchMedia("(display-mode: standalone)").matches && !(window.navigator as any).standalone) {
    pushError = "On iPhone/iPad, Apple requires KuriPro to be added to your Home Screen first: Tap Share (rectangle with arrow) ➔ 'Add to Home Screen', then open KuriPro from your Home Screen to enable push.";
  }
  else if (activeVapidKey && "serviceWorker" in navigator) {
    try {
      // 1. Find existing registration
      let registration: ServiceWorkerRegistration | null = null;
      try {
        registration = (await navigator.serviceWorker.getRegistration()) ?? null;
      } catch {
        // ignore
      }

      if (!registration) {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          if (regs && regs.length > 0 && regs[0]) {
            registration = regs[0];
          }
        } catch {
          // ignore
        }
      }

      if (!registration) {
        try {
          registration = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
          ]);
        } catch {
          // ignore
        }
      }

      // If still no registration, explicitly register the service worker
      if (!registration) {
        try {
          const swUrl = import.meta.env.DEV ? "/dev-sw.js?dev-sw" : "/sw.js";
          registration = await navigator.serviceWorker.register(swUrl, {
            scope: "/",
            type: import.meta.env.DEV ? "module" : "classic",
          });
        } catch (regErr: any) {
          pushError = `Service Worker registration failed: ${regErr?.message || regErr}`;
        }
      }

      if (registration) {
        // If not active yet, give it up to 3s to activate without hanging forever
        if (!registration.active) {
          await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((resolve) => setTimeout(resolve, 3000)),
          ]).catch(() => null);
        }

        const pushManager = registration.pushManager;
        if (pushManager) {
          const expectedKey = urlBase64ToUint8Array(activeVapidKey);
          const appServerKey = expectedKey.buffer.slice(
            expectedKey.byteOffset,
            expectedKey.byteOffset + expectedKey.byteLength,
          );

          let subscription = await pushManager.getSubscription().catch(() => null);

          if (subscription) {
            const rawKey = subscription.options?.applicationServerKey;
            let keyMatches = false;
            if (rawKey) {
              const currentKeyArray = new Uint8Array(rawKey);
              if (currentKeyArray.length === expectedKey.length) {
                keyMatches = currentKeyArray.every((byte, idx) => byte === expectedKey[idx]);
              }
            }
            if (!keyMatches) {
              await subscription.unsubscribe().catch(() => null);
              subscription = null;
            }
          }

          if (!subscription) {
            subscription = await pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: appServerKey as BufferSource,
            });
          }

          if (subscription) {
            const token = JSON.stringify(subscription);
            await api.post("/devices/push-tokens", {
              token,
              platform: isIosDevice() ? "ios" : "web",
            });
            localStorage.setItem(PUSH_TOKEN_KEY, token);
            return { ok: true, token };
          }
        } else {
          pushError = "PushManager is not available on this browser registration (requires HTTPS).";
        }
      } else if (!pushError) {
        pushError = "Service Worker could not be initialized on this browser.";
      }
    } catch (err: any) {
      console.error("enablePush: PushManager subscription failed:", err);
      pushError = err?.message || String(err);
    }
  }

  // 2. Fallback: register a synthetic token so the device is registered with the backend for
  //    real-time SSE delivery (in-app alerts while the app is open). Background push won't work
  //    with this token when browser is off — only the Web Push subscription provides background delivery.
  const existingToken = localStorage.getItem(PUSH_TOKEN_KEY);
  const devToken = existingToken && existingToken.startsWith("web_token_")
    ? existingToken
    : "web_token_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  try {
    await api.post("/devices/push-tokens", { token: devToken, platform: "web" });
    localStorage.setItem(PUSH_TOKEN_KEY, devToken);
    return {
      ok: false,
      error: pushError
        ? `Background push unavailable: ${pushError}. In-app alerts are active.`
        : "Could not establish background push subscription. In-app alerts are active.",
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Failed to register push token with server." };
  }
}

/** Synthesizes a crisp, gentle notification chime via Web Audio API */
export function playNotificationChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(880, now + 0.12);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.28); // D6

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.2);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch {
    // Ignore if audio context cannot play without prior gesture
  }
}

/** Shows a native OS / browser notification popup banner */
export async function showPushNotification(
  title: string,
  options?: { body?: string; url?: string; icon?: string },
): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== "granted") return false;
  try {
    if ("clearAppBadge" in navigator) {
      void (navigator as any).clearAppBadge().catch(() => {});
    }
    if ("serviceWorker" in navigator) {
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<undefined>((resolve) => setTimeout(resolve, 1500)),
        ]);
      }
      if (reg && "showNotification" in reg) {
        await reg.showNotification(title, {
          body: options?.body,
          icon: options?.icon ?? "/pwa-192.png",
          badge: "/pwa-192.png",
          vibrate: [200, 100, 200],
          tag: `kuripro-${Date.now()}`,
          data: { url: options?.url ?? "/notifications" },
        } as any);
        return true;
      }
    }
    // Fallback for non-service-worker environments (safely wrapped for Android Chrome)
    if (typeof Notification === "function") {
      try {
        new Notification(title, {
          body: options?.body,
          icon: options?.icon ?? "/pwa-192.png",
        });
        return true;
      } catch {
        // Android Chrome throws 'Illegal constructor' when calling new Notification()
      }
    }
    return false;
  } catch {
    return false;
  }
}

/** Unregisters this device's push token from the backend. */
export async function disablePush(): Promise<void> {
  const token = localStorage.getItem(PUSH_TOKEN_KEY);
  if (!token) return;
  try {
    await api.delete("/devices/push-tokens", { token });
  } finally {
    localStorage.removeItem(PUSH_TOKEN_KEY);
  }
}

export function hasRegisteredPush(): boolean {
  const token = localStorage.getItem(PUSH_TOKEN_KEY);
  if (!token) return false;
  // Accept both real PushManager subscription JSON (contains "endpoint") and fallback web_token_
  return token.includes('"endpoint"') || token.startsWith("web_token_");
}
