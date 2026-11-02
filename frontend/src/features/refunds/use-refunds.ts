import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";

export type RefundStatus = "UNPAID" | "PARTIAL" | "PAID";

export interface RefundRow {
  replacementId: string;
  chitGroupId: string;
  groupName: string;
  ticket: string;
  previousMember: { name: string; memberCode: string };
  replacedBy: string;
  effectiveCycleNumber: number;
  replacedOn: string;
  /** PAY = owed to the previous member; COLLECT = owed by them. */
  direction: "PAY" | "COLLECT";
  owed: number;
  paid: number;
  outstanding: number;
  status: RefundStatus;
  method: string | null;
  settledAt: string | null;
}

export interface RefundList {
  items: RefundRow[];
  totals: { owed: number; paid: number; outstanding: number };
}

export function useRefunds(filters: {
  status?: RefundStatus;
  chitGroupId?: string;
}) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  if (filters.chitGroupId) query.set("chitGroupId", filters.chitGroupId);
  return useQuery({
    queryKey: ["refunds", filters],
    queryFn: () =>
      api.get<RefundList>(`/chit-groups/refunds?${query.toString()}`),
  });
}

export function usePayRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      chitGroupId,
      replacementId,
      ...body
    }: {
      chitGroupId: string;
      replacementId: string;
      method: string;
      settledAmountRupees: number;
    }) =>
      api.post(
        `/chit-groups/${chitGroupId}/replacements/${replacementId}/settlement/complete`,
        body,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["refunds"] });
      void queryClient.invalidateQueries({ queryKey: ["auction-state"] });
      void queryClient.invalidateQueries({
        queryKey: ["chit-group-membership-history"],
      });
    },
  });
}
