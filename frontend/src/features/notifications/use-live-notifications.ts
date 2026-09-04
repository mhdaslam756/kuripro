import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth-context";
import { API_BASE_URL, getAccessToken } from "@/lib/api-client";
import { enablePush, playNotificationChime, showPushNotification } from "@/lib/push";
import { triggerDuePopup } from "./components/due-notification-popup";

export function useLiveNotifications(): void {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    // Silently register device with backend for server push delivery
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        void enablePush();
      } else if (Notification.permission === "default") {
        void Notification.requestPermission().then((perm) => {
          if (perm === "granted") {
            void enablePush();
          }
        });
      }
    }

    const token = getAccessToken();
    if (!token) return;

    // Real-time SSE stream connection for server-side push delivery
    const streamUrl = `${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`;
    let eventSource: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

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

      // 1. Native OS / Browser Push Banner from Server Dispatch
      void showPushNotification(title, {
        body,
        url,
      });

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

    function connect() {
      try {
        eventSource = new EventSource(streamUrl, { withCredentials: true });

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
          retryTimer = setTimeout(connect, 4000);
        };
      } catch {
        retryTimer = setTimeout(connect, 4000);
      }
    }

    connect();

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }, [user, queryClient]);
}

