import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type {
  NotificationChannel,
  NotificationMeta,
  NotificationStatus,
  NotificationTemplate,
  NotificationType,
  PaginatedNotifications,
  SendBulkInput,
  SendResult,
  SendSingleInput,
} from "./types";

// --- Templates ---

export interface TemplateFilters {
  type?: NotificationType;
  channel?: NotificationChannel;
}

export function useTemplates(filters: TemplateFilters = {}) {
  const search = new URLSearchParams();
  if (filters.type) search.set("type", filters.type);
  if (filters.channel) search.set("channel", filters.channel);
  const qs = search.toString();
  return useQuery({
    queryKey: ["notification-templates", filters],
    queryFn: () => api.get<{ templates: NotificationTemplate[] }>(`/notifications/templates${qs ? `?${qs}` : ""}`).then((r) => r.templates),
  });
}

export interface TemplateInput {
  name: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  body: string;
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TemplateInput) => api.post<{ template: NotificationTemplate }>("/notifications/templates", input).then((r) => r.template),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["notification-templates"] }),
  });
}

export interface UpdateTemplateInput {
  name?: string;
  type?: NotificationType;
  channel?: NotificationChannel;
  subject?: string;
  body?: string;
  isActive?: boolean;
}

export function useUpdateTemplate(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTemplateInput) => api.patch<{ template: NotificationTemplate }>(`/notifications/templates/${id}`, input).then((r) => r.template),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["notification-templates"] }),
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/notifications/templates/${id}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["notification-templates"] }),
  });
}

// --- Sending ---

export function useSendSingle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendSingleInput) => api.post<SendResult>("/notifications/send", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notification-history"] });
      void queryClient.invalidateQueries({ queryKey: ["notification-meta"] });
    },
  });
}

export function useSendBulk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendBulkInput) => api.post<SendResult>("/notifications/send-bulk", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notification-history"] });
      void queryClient.invalidateQueries({ queryKey: ["notification-meta"] });
    },
  });
}

// --- History & meta ---

export interface HistoryFilters {
  channel?: NotificationChannel;
  type?: NotificationType;
  status?: NotificationStatus;
  page?: number;
}

export function useHistory(filters: HistoryFilters) {
  const search = new URLSearchParams();
  if (filters.channel) search.set("channel", filters.channel);
  if (filters.type) search.set("type", filters.type);
  if (filters.status) search.set("status", filters.status);
  search.set("page", String(filters.page ?? 1));
  search.set("limit", "20");
  return useQuery({
    queryKey: ["notification-history", filters],
    queryFn: () => api.get<PaginatedNotifications>(`/notifications/history?${search.toString()}`),
  });
}

export function useNotificationMeta() {
  return useQuery({
    queryKey: ["notification-meta"],
    queryFn: () => api.get<NotificationMeta>("/notifications/meta"),
  });
}
