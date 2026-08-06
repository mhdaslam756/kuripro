import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { ActivityItem, DashboardSummary, DashboardTrends } from "./types";

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => api.get<DashboardSummary>("/dashboard/summary"),
  });
}

export function useDashboardTrends(months: number) {
  return useQuery({
    queryKey: ["dashboard-trends", months],
    queryFn: () => api.get<DashboardTrends>(`/dashboard/trends?months=${months}`),
  });
}

export function useDashboardActivity(limit = 12) {
  return useQuery({
    queryKey: ["dashboard-activity", limit],
    queryFn: () => api.get<{ items: ActivityItem[] }>(`/dashboard/activity?limit=${limit}`).then((r) => r.items),
  });
}

export function useMemberDashboard() {
  return useQuery({
    queryKey: ["member-dashboard"],
    queryFn: () => api.get<import("./types").MemberDashboardData>("/dashboard/member"),
  });
}
