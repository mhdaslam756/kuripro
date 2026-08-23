import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type {
  AuctionRules,
  BulkAssignResult,
  ChitCycle,
  ChitGroup,
  ChitGroupFrequency,
  ChitMembership,
  ChitSummaryReport,
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

export interface CreateChitGroupInput {
  name: string;
  registrationNumber: string;
  chitValueRupees: number;
  totalMembers: number;
  frequency: ChitGroupFrequency;
  customIntervalDays?: number;
  startDate: string;
  auctionRules: {
    allotmentMethod: string;
    foremanCommissionPercent?: number;
    minBidDiscountPercent: number;
    maxBidDiscountPercent?: number;
    bidIncrementPercent: number;
  };
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
  auctionRules?: AuctionRules;
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
