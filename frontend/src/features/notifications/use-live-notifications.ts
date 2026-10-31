import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth-context";
import { API_BASE_URL, getAccessToken, refreshSessionTokens } from "@/lib/api-client";
import { enablePush, playNotificationChime, showPushNotification } from "@/lib/push";
import { triggerDuePopup } from "./components/due-notification-popup";

const RETRY_BASE_MS = 4_000;
const RETRY_MAX_MS = 60_000;

/** True when the JWT's `exp` is in the past (or within 10s) — decoded locally, no verification. */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    return typeof payload.exp === "number" && payload.exp * 1000 < Date.now() + 10_000;
  } catch {
    return false;
  }
}

export function useLiveNotifications(): void {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());

  // Effect 1: Auto-request notification permission and register Web Push on login
  useEffect(() => {
    if (!user) return;

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        // Already granted — register/refresh the push subscription
        void enablePush();
      } else if (Notification.permission === "default") {
        // Not yet decided — request permission after a short delay
        const permTimer = setTimeout(() => {
          void Notification.requestPermission().then((perm) => {
            if (perm === "granted") {
              void enablePush();
            }
          });
        }, 2000);
        return () => clearTimeout(permTimer);
      }
    }
    return undefined;
  }, [user]);

  // Effect 2: SSE stream for real-time in-app delivery
  useEffect(() => {
    if (!user) return;

    let eventSource: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = RETRY_BASE_MS;
    let disposed = false;

    function handleIncomingNotification(data: {
      id?: string;
      title?: string;
      body?: string;
      type?: string;
      url?: string;
    }) {
      if (data.id && seenNotificationIdsRef.current.has(data.id)) {
        return;
      }
      if (data.id) {
        seenNotificationIdsRef.current.add(data.id);
      }

      const title = data.title || "KuriPro 🔔";
      const body = data.body || "";
      const url = data.url || "/notifications";

      // 1. Native OS / Browser Push Banner (requires notification permission)
      void showPushNotification(title, { body, url });

      // 2. Play gentle audio alert chime
      playNotificationChime();

      // 3. For Members receiving an installment due reminder, show Due Modal
      const isMember = user?.role?.slug === "MEMBER";
      const isDue =
        data.type === "REMINDER" ||
        data.type === "DUE_REMINDER" ||
        title.toLowerCase().includes("due") ||
        body.toLowerCase().includes("due") ||
        title.toLowerCase().includes("installment") ||
        body.toLowerCase().includes("installment");

      if (isDue && isMember) {
        triggerDuePopup({
          id: data.id || `due_${Date.now()}`,
          title,
          body,
          url,
        });
      }

      // 4. Silently update query caches
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["member-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }

    function scheduleRetry() {
      if (disposed) return;
      retryTimer = setTimeout(() => void connect(), retryDelay);
      retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
    }

    async function connect() {
      if (disposed) return;
      try {
        // EventSource can't set headers, so the token goes in the URL. Read it fresh on every
        // (re)connect — access tokens are short-lived, and a URL built once goes stale.
        let token = getAccessToken();
        if (!token || isTokenExpired(token)) {
          token = (await refreshSessionTokens().catch(() => null))?.accessToken ?? getAccessToken();
        }
        if (!token || disposed) return; // signed out — nothing to stream

        eventSource = new EventSource(`${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`, {
          withCredentials: true,
        });

        eventSource.onopen = () => {
          retryDelay = RETRY_BASE_MS;
        };

        eventSource.addEventListener("notification", (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            handleIncomingNotification(data);
          } catch {
            // Ignore parse errors
          }
        });

        eventSource.onmessage = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            if (data) {
              handleIncomingNotification(data);
            }
          } catch {
            // Ignore non-json heartbeats
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          scheduleRetry();
        };
      } catch {
        scheduleRetry();
      }
    }

    void connect();

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }, [user, queryClient]);
}
