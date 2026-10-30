import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type {
  BulkAssignResult,
  ChitCycle,
  ChitGroup,
  ChitGroupFrequency,
  ChitMembership,
  ChitSummaryReport,
  CommissionMode,
  MembershipHistorySlot,
  ReplaceMemberInput,
  ReplacementPreview,
  PaginatedChitGroups,
  PaginatedCycles,
  PaginatedMemberships,
  ScheduleEntry,
} from "./types";

const listKey = (status?: string) => ["chit-groups", { status }] as const;
const detailKey = (id: string) => ["chit-group", id] as const;

export function useChitGroups(status?: string) {
  return useQuery({
    queryKey: listKey(status),
    queryFn: () =>
      api.get<PaginatedChitGroups>(`/chit-groups?limit=100${status ? `&status=${status}` : ""}`),
  });
}

export function useChitGroup(id: string | undefined) {
  return useQuery({
    queryKey: detailKey(id ?? ""),
    queryFn: () => api.get<{ chitGroup: ChitGroup }>(`/chit-groups/${id}`).then((r) => r.chitGroup),
    enabled: Boolean(id),
  });
}

export interface AuctionRulesInput {
  allotmentMethod: string;
  foremanCommissionMode: CommissionMode;
  foremanCommissionPercent?: number;
  foremanCommissionAmountRupees?: number;
  minBidDiscountPercent: number;
  maxBidDiscountPercent?: number;
  bidIncrementPercent: number;
}

export interface CreateChitGroupInput {
  name: string;
  registrationNumber: string;
  chitValueRupees: number;
  totalMembers: number;
  frequency: ChitGroupFrequency;
  customIntervalDays?: number;
  startDate: string;
  auctionRules: AuctionRulesInput;
  termsAndConditions?: string;
}

export function useCreateChitGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateChitGroupInput) => api.post<{ chitGroup: ChitGroup }>("/chit-groups", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chit-groups"] }),
  });
}

export interface UpdateChitGroupInput {
  name?: string;
  frequency?: ChitGroupFrequency;
  customIntervalDays?: number;
  startDate?: string;
  auctionRules?: AuctionRulesInput;
  termsAndConditions?: string;
}

export function useUpdateChitGroup(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateChitGroupInput) => api.patch<{ chitGroup: ChitGroup }>(`/chit-groups/${id}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: detailKey(id) });
      void queryClient.invalidateQueries({ queryKey: ["chit-groups"] });
    },
  });
}

export function useActivateChitGroup(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ chitGroup: ChitGroup }>(`/chit-groups/${id}/activate`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: detailKey(id) });
      void queryClient.invalidateQueries({ queryKey: ["chit-groups"] });
    },
  });
}

// --- Roster / assignment ---

export function useChitMembers(id: string | undefined) {
  return useQuery({
    queryKey: ["chit-group-members", id],
    queryFn: () => api.get<PaginatedMemberships>(`/chit-groups/${id}/members?limit=100`),
    enabled: Boolean(id),
  });
}

export type MemberAssignmentInput = {
  memberId: string;
  shareType?: "FULL" | "HALF";
  ticketNumber?: number;
  subTicket?: string;
};

export function useAssignMember(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { memberId: string; ticketNumber?: number; shareType?: "FULL" | "HALF"; subTicket?: string }) =>
      api.post<{ membership: ChitMembership }>(`/chit-groups/${id}/members`, input),
    onSuccess: () => invalidateRoster(queryClient, id),
  });
}

export function useAssignMembers(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      payload:
        | string[]
        | { assignments: MemberAssignmentInput[] }
        | { memberIds: string[]; shareType?: "FULL" | "HALF" },
    ) => {
      const body = Array.isArray(payload) ? { memberIds: payload } : payload;
      return api.post<BulkAssignResult>(`/chit-groups/${id}/members/bulk`, body);
    },
    onSuccess: () => invalidateRoster(queryClient, id),
  });
}

export function useRemoveMember(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: string) => api.delete<void>(`/chit-groups/${id}/members/${membershipId}`),
    onSuccess: () => invalidateRoster(queryClient, id),
  });
}

function invalidateRoster(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  void queryClient.invalidateQueries({ queryKey: ["chit-group-members", id] });
  void queryClient.invalidateQueries({ queryKey: ["chit-group-detail", id] });
  void queryClient.invalidateQueries({ queryKey: ["chit-group-report", id] });
  void queryClient.invalidateQueries({ queryKey: ["chit-groups"] });
}

// --- Member replacement & exit settlement ---

export function useReplacementPreview(
  chitGroupId: string,
  membershipId: string | undefined,
  params: { effectiveCycleNumber?: number; newMemberId?: string },
) {
  const query = new URLSearchParams();
  if (params.effectiveCycleNumber) query.set("effectiveCycleNumber", String(params.effectiveCycleNumber));
  if (params.newMemberId) query.set("newMemberId", params.newMemberId);
  return useQuery({
    queryKey: ["chit-group-replacement-preview", chitGroupId, membershipId, params],
    queryFn: () =>
      api
        .get<{ preview: ReplacementPreview }>(
          `/chit-groups/${chitGroupId}/members/${membershipId}/replacement-preview?${query.toString()}`,
        )
        .then((r) => r.preview),
    enabled: Boolean(membershipId),
    retry: false,
  });
}

function invalidateHistory(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  void queryClient.invalidateQueries({ queryKey: ["chit-group-membership-history", id] });
}

export function useReplaceMember(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ membershipId, ...input }: ReplaceMemberInput & { membershipId: string }) =>
      api.post<{ newMembershipId: string }>(`/chit-groups/${id}/members/${membershipId}/replace`, input),
    onSuccess: () => {
      invalidateRoster(queryClient, id);
      invalidateHistory(queryClient, id);
      void queryClient.invalidateQueries({ queryKey: ["chit-group-replacement-preview", id] });
    },
  });
}

export function useMembershipHistory(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["chit-group-membership-history", id],
    queryFn: () => api.get<{ slots: MembershipHistorySlot[] }>(`/chit-groups/${id}/membership-history`).then((r) => r.slots),
    enabled: Boolean(id) && enabled,
  });
}

export function useUpdateReplacementSettlement(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      replacementId,
      ...input
    }: {
      replacementId: string;
      refundAmountRupees?: number;
      deductionAmountRupees?: number;
      deductionReason?: string;
      notes?: string;
    }) => api.patch(`/chit-groups/${id}/replacements/${replacementId}/settlement`, input),
    onSuccess: () => invalidateHistory(queryClient, id),
  });
}

export function useCompleteReplacementSettlement(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      replacementId,
      ...input
    }: {
      replacementId: string;
      settledAmountRupees?: number;
      method: string;
      notes?: string;
    }) => api.post(`/chit-groups/${id}/replacements/${replacementId}/settlement/complete`, input),
    onSuccess: () => invalidateHistory(queryClient, id),
  });
}

// --- Schedule / cycles ---

export function useSchedule(id: string | undefined) {
  return useQuery({
    queryKey: ["chit-group-schedule", id],
    queryFn: () => api.get<{ schedule: ScheduleEntry[] }>(`/chit-groups/${id}/schedule`).then((r) => r.schedule),
    enabled: Boolean(id),
  });
}

export function useCycles(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["chit-group-cycles", id],
    queryFn: () => api.get<PaginatedCycles>(`/chit-groups/${id}/cycles?limit=100`),
    enabled: Boolean(id) && enabled,
  });
}

// --- Documents ---

export function useAddChitDocument(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { label: string; url: string; publicId: string }) =>
      api.post<{ chitGroup: ChitGroup }>(`/chit-groups/${id}/documents`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: detailKey(id) }),
  });
}

export function useRemoveChitDocument(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => api.delete<{ chitGroup: ChitGroup }>(`/chit-groups/${id}/documents/${documentId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: detailKey(id) }),
  });
}

// --- Reports ---

export function useChitReport(id: string | undefined) {
  return useQuery({
    queryKey: ["chit-group-report", id],
    queryFn: () => api.get<{ report: ChitSummaryReport }>(`/chit-groups/${id}/report`).then((r) => r.report),
    enabled: Boolean(id),
  });
}

// Re-export for convenience where a component only needs the cycle type.
export type { ChitCycle };
