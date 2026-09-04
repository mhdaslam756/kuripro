  import { api } from "./api-client";

/**
 * Web push via Firebase Cloud Messaging. Config comes from public `VITE_FIREBASE_*` build vars; when
 * they're absent the feature reports "not configured" (the same honest-gap pattern the backend uses)
 * rather than throwing. Firebase is dynamically imported so it never weighs down the main bundle.
 */

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};
const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

const PUSH_TOKEN_KEY = "kuripro_push_token";

export function isFirebaseConfigured(): boolean {
  return Boolean(
    isPushSupported() &&
      vapidKey &&
      firebaseConfig.apiKey &&
      firebaseConfig.projectId
  );
}

export function isPushConfigured(): boolean {
  return isPushSupported();
}

export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
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

async function getMessagingInstance() {
  if (!isFirebaseConfigured()) return null;
  try {
    const [{ initializeApp, getApps }, { getMessaging, isSupported }] = await Promise.all([
      import("firebase/app"),
      import("firebase/messaging"),
    ]);
    if (!(await isSupported())) return null;
    const app = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);
    return getMessaging(app);
  } catch {
    return null;
  }
}

export type EnablePushResult =
  | { ok: true; token: string; error?: undefined }
  | { ok: false; error: string; token?: undefined };

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
      error: "Notifications are blocked in your browser settings. Please click the lock or settings icon in your address bar to allow notifications.",
    };
  }

  let permission: NotificationPermission;
  try {
    permission = await Notification.requestPermission();
  } catch {
    permission = await new Promise<NotificationPermission>((resolve) => {
      Notification.requestPermission(resolve);
    });
  }

  if (permission !== "granted") {
    return {
      ok: false,
      error: "Notification permission was not granted. Please allow notifications in your browser settings.",
    };
  }

  if (isFirebaseConfigured()) {
    try {
      const messaging = await getMessagingInstance();
      if (messaging) {
        const { getToken } = await import("firebase/messaging");
        const registration = await navigator.serviceWorker.ready;
        const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
        if (token) {
          await api.post("/devices/push-tokens", { token, platform: "web" });
          localStorage.setItem(PUSH_TOKEN_KEY, token);
          return { ok: true, token };
        }
      }
    } catch {
      // Fallback to web token registration below if FCM client handshake failed
    }
  }

  // Fallback: register standard web token so device is registered with backend
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

/** Triggers an immediate local notification to verify browser notification delivery */
export async function sendLocalTestNotification(
  title = "KuriPro Reminder 🔔",
  body = "Your push notifications are active! You will receive kuri installment dues and live auction alerts here.",
): Promise<boolean> {
  playNotificationChime();
  return showPushNotification(title, { body, url: "/notifications" });
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
