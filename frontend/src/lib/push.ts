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
  let activeVapidKey: string | null = (import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined) || null;
  try {
    const res = await api.get<{ publicKey: string | null }>("/devices/vapid-public-key");
    if (res?.publicKey) {
      activeVapidKey = res.publicKey;
    }
  } catch {
    // fallback
  }

  if (activeVapidKey && "serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      const expectedKey = urlBase64ToUint8Array(activeVapidKey);

      if (subscription) {
        const rawKey = subscription.options?.applicationServerKey;
        if (rawKey) {
          const currentKeyArray = new Uint8Array(rawKey);
          let keyMatches = currentKeyArray.length === expectedKey.length;
          if (keyMatches) {
            for (let i = 0; i < currentKeyArray.length; i++) {
              if (currentKeyArray[i] !== expectedKey[i]) {
                keyMatches = false;
                break;
              }
            }
          }
          if (!keyMatches) {
            await subscription.unsubscribe();
            subscription = null;
          }
        }
      }

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: expectedKey as unknown as BufferSource,
        });
      }
      if (subscription) {
        const token = JSON.stringify(subscription);
        await api.post("/devices/push-tokens", { token, platform: "web" });
        localStorage.setItem(PUSH_TOKEN_KEY, token);
        return { ok: true, token };
      }
    } catch {
      // Fall through to synthetic token
    }
  }

  // 2. Fallback: register standard web token so device is registered with backend for SSE delivery
  const devToken = "web_token_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  try {
    await api.post("/devices/push-tokens", { token: devToken, platform: "web" });
    localStorage.setItem(PUSH_TOKEN_KEY, devToken);
    return { ok: true, token: devToken };
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
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<undefined>((resolve) => setTimeout(resolve, 600)),
      ]);
      if (reg && "showNotification" in reg) {
        await reg.showNotification(title, {
          body: options?.body,
          icon: options?.icon ?? "/pwa-192.png",
          badge: "/pwa-192.png",
          data: { url: options?.url ?? "/notifications" },
        });
        return true;
      }
    }
    new Notification(title, {
      body: options?.body,
      icon: options?.icon ?? "/pwa-192.png",
    });
    return true;
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
  return isPushSupported() && Notification.permission === "granted" && Boolean(localStorage.getItem(PUSH_TOKEN_KEY));
}
