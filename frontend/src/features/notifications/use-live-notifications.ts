import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import { API_BASE_URL, api, getAccessToken } from "@/lib/api-client";
import { enablePush, playNotificationChime, showPushNotification } from "@/lib/push";

export function useLiveNotifications(): void {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (!user) return;

    // 1. Auto-refresh push registration if permission is already granted
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      void enablePush();
    }

    const token = getAccessToken();
    if (!token) return;

    // 2. Real-time SSE stream connection
    const streamUrl = `${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`;
    let eventSource: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    function handleIncomingNotification(data: {
      id: string;
      title: string;
      body: string;
      type?: string;
      url?: string;
    }) {
      if (data.id && seenNotificationIdsRef.current.has(data.id)) {
        return;
      }
      if (data.id) {
        seenNotificationIdsRef.current.add(data.id);
      }

      // Play audio chime
      playNotificationChime();

      // Native OS / Browser push banner
      void showPushNotification(data.title, {
        body: data.body,
        url: data.url || "/notifications",
      });

      // In-app interactive toast
      toast.info(data.title, {
        description: data.body,
        duration: 8000,
        action: {
          label: "View",
          onClick: () => navigate(data.url || "/notifications"),
        },
      });

      // Refresh notification inbox and dashboards
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
            if (data && data.title && data.body) {
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

    // 3. Fallback active-poll check every 12 seconds to guarantee 100% delivery
    const pollInterval = setInterval(async () => {
      try {
        const res = await api.get<{ items: Array<{ id: string; subject?: string; body: string; createdAt: string }> }>(
          "/notifications/history?limit=3",
        );
        const latestItems = res?.items ?? [];

        // On first poll, seed known notification IDs so we don't alert old ones
        if (initialLoadRef.current) {
          initialLoadRef.current = false;
          for (const item of latestItems) {
            seenNotificationIdsRef.current.add(item.id);
          }
          return;
        }

        for (const item of latestItems) {
          if (!seenNotificationIdsRef.current.has(item.id)) {
            handleIncomingNotification({
              id: item.id,
              title: item.subject ?? "Payment Reminder 🔔",
              body: item.body,
              url: "/notifications",
            });
          }
        }
      } catch {
        // Polling failure is non-fatal
      }
    }, 12000);

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      clearInterval(pollInterval);
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }, [user, queryClient, navigate]);
}
