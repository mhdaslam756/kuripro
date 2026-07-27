import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { Disbursement, PaginatedPayouts, PayoutDetail, PayoutReceipt } from "./types";

export interface PayoutFilters {
  chitGroupId?: string;
  status?: string;
  page?: number;
}

export function usePayouts(filters: PayoutFilters) {
  return useQuery({
    queryKey: ["payouts", filters],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "25", page: String(filters.page ?? 1) });
      if (filters.chitGroupId) params.set("chitGroupId", filters.chitGroupId);
      if (filters.status) params.set("status", filters.status);
      return api.get<PaginatedPayouts>(`/payouts?${params.toString()}`);
    },
  });
}

export function usePayout(payoutId: string | undefined) {
  return useQuery({
    queryKey: ["payout", payoutId],
    queryFn: () => api.get<{ payout: PayoutDetail }>(`/payouts/${payoutId}`).then((r) => r.payout),
    enabled: Boolean(payoutId),
  });
}

export interface RecordDisbursementInput {
  amount?: number;
  method: string;
  reference?: string;
  notes?: string;
  proofUrl?: string;
  proofPublicId?: string;
}

export function useRecordDisbursement(payoutId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordDisbursementInput) =>
      api.post<{ disbursement: Disbursement; payout: { declared: number; paid: number; remaining: number; status: string } }>(
        `/payouts/${payoutId}/disbursements`,
        input,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["payout", payoutId] });
      void queryClient.invalidateQueries({ queryKey: ["payouts"] });
    },
  });
}

export function useDisbursementReceipt(disbursementId: string | undefined) {
  return useQuery({
    queryKey: ["payout-receipt", disbursementId],
    queryFn: () =>
      api.get<{ receipt: PayoutReceipt }>(`/payouts/disbursements/${disbursementId}/receipt`).then((r) => r.receipt),
    enabled: Boolean(disbursementId),
    staleTime: Infinity,
  });
}
