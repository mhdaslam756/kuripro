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

export function isPushConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId && firebaseConfig.appId && vapidKey);
}

export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  return isPushSupported() ? Notification.permission : "unsupported";
}

async function getMessagingInstance() {
  const [{ initializeApp, getApps }, { getMessaging, isSupported }] = await Promise.all([
    import("firebase/app"),
    import("firebase/messaging"),
  ]);
  if (!(await isSupported())) return null;
  const app = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);
  return getMessaging(app);
}

export type EnablePushResult =
  | { ok: true; token: string; error?: undefined }
  | { ok: false; error: string; token?: undefined };

/** Requests notification permission, obtains an FCM token, and registers it with the backend. */
export async function enablePush(): Promise<EnablePushResult> {
  if (!isPushConfigured()) return { ok: false, error: "Push isn't configured on this build (no Firebase keys)." };
  if (!isPushSupported()) return { ok: false, error: "This browser doesn't support push notifications." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, error: "Notification permission was not granted." };

  const messaging = await getMessagingInstance();
  if (!messaging) return { ok: false, error: "Messaging isn't available in this browser." };

  const { getToken } = await import("firebase/messaging");
  const registration = await navigator.serviceWorker.ready;
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) return { ok: false, error: "Could not obtain a device token." };

  await api.post("/devices/push-tokens", { token, platform: "web" });
  localStorage.setItem(PUSH_TOKEN_KEY, token);
  return { ok: true, token };
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
