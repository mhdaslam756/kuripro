import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { AuctionEvent, AuctionState, Bid, SettlementSummary } from "./types";

const stateKey = (cycleId: string) => ["auction-state", cycleId] as const;

export function useAuctionState(cycleId: string | undefined) {
  return useQuery({
    queryKey: stateKey(cycleId ?? ""),
    queryFn: () => api.get<{ auction: AuctionState }>(`/auctions/cycles/${cycleId}`).then((r) => r.auction),
    enabled: Boolean(cycleId),
  });
}

export function useBids(cycleId: string | undefined) {
  return useQuery({
    queryKey: ["auction-bids", cycleId],
    queryFn: () => api.get<{ bids: Bid[] }>(`/auctions/cycles/${cycleId}/bids`).then((r) => r.bids),
    enabled: Boolean(cycleId),
  });
}

export function useAuditTrail(cycleId: string | undefined) {
  return useQuery({
    queryKey: ["auction-audit", cycleId],
    queryFn: () => api.get<{ events: AuctionEvent[] }>(`/auctions/cycles/${cycleId}/audit`).then((r) => r.events),
    enabled: Boolean(cycleId),
  });
}

function useAuctionMutation<TArgs, TResult>(cycleId: string, fn: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: stateKey(cycleId) });
      void queryClient.invalidateQueries({ queryKey: ["auction-bids", cycleId] });
      void queryClient.invalidateQueries({ queryKey: ["auction-audit", cycleId] });
    },
  });
}

export function useOpenBidding(cycleId: string) {
  return useAuctionMutation(cycleId, (_: void) => api.post<unknown>(`/auctions/cycles/${cycleId}/open`));
}

export function useCloseBidding(cycleId: string) {
  return useAuctionMutation(cycleId, (_: void) => api.post<unknown>(`/auctions/cycles/${cycleId}/close`));
}

export function useRecordBid(cycleId: string) {
  return useAuctionMutation(cycleId, (input: { chitMembershipId: string; discountRupees: number }) =>
    api.post<{ bid: Bid }>(`/auctions/cycles/${cycleId}/bids`, input),
  );
}

export function useWithdrawBid(cycleId: string) {
  return useAuctionMutation(cycleId, (bidId: string) => api.delete<void>(`/auctions/cycles/${cycleId}/bids/${bidId}`));
}

export function useSettle(cycleId: string) {
  return useAuctionMutation(cycleId, (input: { method: string; winnerMembershipId?: string; winningBidId?: string }) =>
    api.post<{ settlement: SettlementSummary }>(`/auctions/cycles/${cycleId}/settle`, input),
  );
}

export function useRepick(cycleId: string) {
  return useAuctionMutation(cycleId, (reason: string | undefined) =>
    api.post<unknown>(`/auctions/cycles/${cycleId}/repick`, { reason }),
  );
}

/** Downloads a server-generated PDF (minutes or winner voucher) and triggers a save. */
export async function downloadAuctionPdf(cycleId: string, kind: "minutes" | "voucher"): Promise<void> {
  const blob = await api.download(`/auctions/cycles/${cycleId}/${kind}`);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = kind === "minutes" ? `auction-minutes.pdf` : `winner-voucher.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
