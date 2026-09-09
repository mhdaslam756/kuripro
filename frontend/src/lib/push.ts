import { api } from "./api-client";

const PUSH_TOKEN_KEY = "kuripro_push_token";

export function isPushSupported(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
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

/**
 * On iOS (iOS 16.4+), Apple WebKit only allows Push Notifications when the web app
 * has been added to the Home Screen and is opened in standalone display mode.
 */
export function isIosStandalone(): boolean {
  if (!isIosDevice()) return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as any).standalone)
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
 * Registers this device for native background push notifications (Android, iOS PWA, Chrome, Safari, Edge, Firefox).
 * 1. Checks browser support and secure HTTPS context.
 * 2. Requests OS/browser notification permission.
 * 3. Awaits the active Service Worker.
 * 4. Subscribes with the server's VAPID public key.
 * 5. Saves the standard W3C PushSubscription on the server.
 */
export async function enablePush(): Promise<EnablePushResult> {
  // 1. Basic platform & service worker check
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return { ok: false, error: "Service Workers are not supported on this browser." };
  }

  // 2. iOS Safari PWA restriction check
  if (isIosDevice() && !isIosStandalone()) {
    return {
      ok: false,
      error: "On iPhone/iPad, Apple requires KuriPro to be added to your Home Screen first: Tap Share (rectangle with arrow) ➔ 'Add to Home Screen', then open KuriPro from your Home Screen to enable notifications.",
    };
  }

  // 3. Push API availability check
  if (!("Notification" in window) || !("PushManager" in window)) {
    return { ok: false, error: "This browser does not support the Web Push API." };
  }

  // 4. Secure Context (HTTPS or localhost) check
  if (!window.isSecureContext) {
    return {
      ok: false,
      error: "Web Push requires a Secure Context (HTTPS). Please connect over HTTPS.",
    };
  }

  // 5. Browser notification permission check & prompt
  if (Notification.permission === "denied") {
    return {
      ok: false,
      error: "Notifications are blocked in your browser settings. Please allow notifications for this site in your browser site settings.",
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

  // 6. Obtain server VAPID public key
  let activeVapidKey: string | null = null;
  try {
    const res = await api.get<{ publicKey: string | null }>("/devices/vapid-public-key");
    if (res?.publicKey) {
      activeVapidKey = res.publicKey;
    }
  } catch {
    // API call failed, fallback to Vite environment variable
  }

  if (!activeVapidKey) {
    activeVapidKey = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) || null;
  }

  if (!activeVapidKey) {
    return {
      ok: false,
      error: "Push notifications are not configured on this server (missing VAPID public key).",
    };
  }

  // 7. Ensure Service Worker is registered and ready
  try {
    let registration: ServiceWorkerRegistration | null = null;
    try {
      registration = (await navigator.serviceWorker.getRegistration()) ?? null;
    } catch {
      // ignore
    }

    if (!registration) {
      try {
        const swUrl = import.meta.env.DEV ? "/dev-sw.js?dev-sw" : "/sw.js";
        registration = await navigator.serviceWorker.register(swUrl, {
          scope: "/",
          type: import.meta.env.DEV ? "module" : "classic",
        });
      } catch (regErr: any) {
        console.warn("Manual registration notice:", regErr?.message || regErr);
      }
    }

    // If there is a waiting worker, tell it to activate immediately
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }

    // If not active yet, wait briefly for ready or activation
    if (!registration?.active) {
      try {
        const readyReg = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
        ]);
        if (readyReg) {
          registration = readyReg;
        }
      } catch {
        // ignore
      }
    }

    // Final check for registration and pushManager
    if (!registration || !registration.pushManager) {
      try {
        registration = (await navigator.serviceWorker.ready) || registration;
      } catch {
        // ignore
      }
    }

    if (!registration || !registration.pushManager) {
      return {
        ok: false,
        error: "PushManager is not available on this browser's Service Worker. Please reload the page.",
      };
    }

    const appServerKey = urlBase64ToUint8Array(activeVapidKey);
    let subscription = await registration.pushManager.getSubscription().catch(() => null);

    // If an existing subscription exists, verify whether it uses the current VAPID key
    if (subscription) {
      const rawKey = subscription.options?.applicationServerKey;
      let keyMatches = false;
      if (rawKey) {
        const currentKeyArray = new Uint8Array(rawKey);
        if (currentKeyArray.length === appServerKey.length) {
          keyMatches = currentKeyArray.every((byte, idx) => byte === appServerKey[idx]);
        }
      }
      if (!keyMatches) {
        await subscription.unsubscribe().catch(() => null);
        subscription = null;
      }
    }

    // Subscribe to browser push service (FCM for Chrome/Android, APNs for Safari/iOS, etc.)
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey as unknown as BufferSource,
      });
    }

    const token = JSON.stringify(subscription);

    // 8. Register the subscription token with backend
    await api.post("/devices/push-tokens", {
      token,
      platform: isIosDevice() ? "ios" : "web",
    });

    localStorage.setItem(PUSH_TOKEN_KEY, token);
    return { ok: true, token };
  } catch (err: any) {
    console.error("enablePush error:", err);
    return {
      ok: false,
      error: err?.message ? `Failed to enable push: ${err.message}` : "Failed to enable push notifications.",
    };
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

/** Shows an in-browser notification banner using the active Service Worker */
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
      const reg = await navigator.serviceWorker.ready.catch(() => null);
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
    return false;
  } catch {
    return false;
  }
}

/** Unregisters this device's push subscription from the backend and browser */
export async function disablePush(): Promise<void> {
  const token = localStorage.getItem(PUSH_TOKEN_KEY);
  try {
    if (token) {
      await api.delete("/devices/push-tokens", { token }).catch(() => null);
    }
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration().catch(() => null);
      if (reg) {
        const sub = await reg.pushManager.getSubscription().catch(() => null);
        if (sub) {
          await sub.unsubscribe().catch(() => null);
        }
      }
    }
  } finally {
    localStorage.removeItem(PUSH_TOKEN_KEY);
  }
}

/** Checks whether a valid Web Push subscription token is stored on this device */
export function hasRegisteredPush(): boolean {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem(PUSH_TOKEN_KEY);
  if (!token) return false;
  return token.includes('"endpoint"');
}
