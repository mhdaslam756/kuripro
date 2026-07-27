import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type {
  BulkCollectionResult,
  Collection,
  CycleSummary,
  Installment,
  PaginatedCollections,
  PaginatedDues,
  RaiseDuesResult,
  Receipt,
  SyncOfflineResult,
} from "./types";
import type { QueuedCollection } from "./offline-queue";

// --- Dues (installments for a cycle) ---

export function useDues(chitGroupId: string | undefined, chitCycleId: string | undefined, status?: string) {
  return useQuery({
    queryKey: ["dues", chitGroupId, chitCycleId, status],
    queryFn: () => {
      const params = new URLSearchParams({ chitGroupId: chitGroupId!, chitCycleId: chitCycleId!, limit: "100" });
      if (status) params.set("status", status);
      return api.get<PaginatedDues>(`/collections/dues?${params.toString()}`);
    },
    enabled: Boolean(chitGroupId && chitCycleId),
  });
}

export function useCycleSummary(chitGroupId: string | undefined, chitCycleId: string | undefined) {
  return useQuery({
    queryKey: ["cycle-summary", chitGroupId, chitCycleId],
    queryFn: () =>
      api
        .get<{ summary: CycleSummary }>(`/collections/dues/summary?chitGroupId=${chitGroupId}&chitCycleId=${chitCycleId}`)
        .then((r) => r.summary),
    enabled: Boolean(chitGroupId && chitCycleId),
  });
}

export function useRaiseDues() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { chitGroupId: string; chitCycleId: string }) =>
      api.post<RaiseDuesResult>("/collections/dues/raise", input),
    onSuccess: () => invalidateCollections(queryClient),
  });
}

export function useFlagOverdue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chitGroupId: string) => api.post<{ flagged: number }>("/collections/dues/flag-overdue", { chitGroupId }),
    onSuccess: () => invalidateCollections(queryClient),
  });
}

// --- Recording ---

export interface RecordCollectionInput {
  paymentId: string;
  amount?: number;
  method: string;
  reference?: string;
  notes?: string;
}

export function useRecordCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordCollectionInput) =>
      api.post<{ collection: Collection; installment: Installment }>("/collections", input),
    onSuccess: () => invalidateCollections(queryClient),
  });
}

export function useBulkCollect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: RecordCollectionInput[]) => api.post<BulkCollectionResult>("/collections/bulk", { items }),
    onSuccess: () => invalidateCollections(queryClient),
  });
}

export function useSyncOffline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (queued: QueuedCollection[]) => {
      const items = queued.map((q) => ({
        clientReceiptId: q.clientReceiptId,
        paymentId: q.paymentId,
        amount: q.amount,
        method: q.method,
        reference: q.reference,
        notes: q.notes,
      }));
      return api.post<SyncOfflineResult>("/collections/sync", { items });
    },
    onSuccess: () => invalidateCollections(queryClient),
  });
}

// --- History ---

export interface CollectionFilters {
  chitGroupId?: string;
  memberId?: string;
  method?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
}

export function useCollectionHistory(filters: CollectionFilters) {
  return useQuery({
    queryKey: ["collection-history", filters],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "25", page: String(filters.page ?? 1) });
      if (filters.chitGroupId) params.set("chitGroupId", filters.chitGroupId);
      if (filters.method) params.set("method", filters.method);
      if (filters.status) params.set("status", filters.status);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      return api.get<PaginatedCollections>(`/collections?${params.toString()}`);
    },
  });
}

// --- Receipt ---

export function useReceipt(collectionId: string | undefined) {
  return useQuery({
    queryKey: ["receipt", collectionId],
    queryFn: () => api.get<{ receipt: Receipt }>(`/collections/${collectionId}/receipt`).then((r) => r.receipt),
    enabled: Boolean(collectionId),
    staleTime: Infinity,
  });
}

// --- Reconciliation ---

export function useClearCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<{ collection: Collection }>(`/collections/${id}/clear`),
    onSuccess: () => invalidateCollections(queryClient),
  });
}

export function useBounceCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<{ collection: Collection }>(`/collections/${id}/bounce`),
    onSuccess: () => invalidateCollections(queryClient),
  });
}

function invalidateCollections(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["dues"] });
  void queryClient.invalidateQueries({ queryKey: ["cycle-summary"] });
  void queryClient.invalidateQueries({ queryKey: ["collection-history"] });
}
