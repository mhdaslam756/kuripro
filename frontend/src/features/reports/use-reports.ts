import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { ExportFormat, FinanceEntry, PaginatedFinanceEntries, ReportType } from "./types";

export interface ReportParams {
  from?: string;
  to?: string;
  chitGroupId?: string;
}

function toQuery(params: ReportParams): string {
  const search = new URLSearchParams();
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.chitGroupId) search.set("chitGroupId", params.chitGroupId);
  return search.toString();
}

export function useReport<T>(type: ReportType, params: ReportParams, enabled = true) {
  return useQuery({
    queryKey: ["report", type, params],
    queryFn: () => api.get<{ report: T }>(`/reports/${type}?${toQuery(params)}`).then((r) => r.report),
    enabled,
  });
}

/** Downloads a report export (PDF / Excel / CSV) and triggers a save. */
export async function downloadReport(type: ReportType, format: ExportFormat, params: ReportParams): Promise<void> {
  const query = toQuery(params);
  const blob = await api.download(`/reports/${type}/export?format=${format}${query ? `&${query}` : ""}`);
  const ext = format === "excel" ? "xlsx" : format;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${type}-report.${ext}`;
  link.click();
  URL.revokeObjectURL(url);
}

// --- Finance entries (income / expense) ---

export function useFinanceEntries(type?: string) {
  return useQuery({
    queryKey: ["finance-entries", type],
    queryFn: () => api.get<PaginatedFinanceEntries>(`/finance/entries?limit=50${type ? `&type=${type}` : ""}`),
  });
}

export interface CreateFinanceEntryInput {
  type: string;
  category: string;
  amountRupees: number;
  channel: string;
  date: string;
  description?: string;
}

export function useCreateFinanceEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFinanceEntryInput) => api.post<{ entry: FinanceEntry }>("/finance/entries", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["finance-entries"] });
      void queryClient.invalidateQueries({ queryKey: ["report"] });
    },
  });
}

export function useDeleteFinanceEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/finance/entries/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["finance-entries"] });
      void queryClient.invalidateQueries({ queryKey: ["report"] });
    },
  });
}
