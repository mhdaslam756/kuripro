import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type {
  FamilyMember,
  Guarantor,
  ImportCommitResult,
  ImportPreviewResult,
  Member,
  MemberRiskScore,
  Nominee,
  PaginatedMembers,
  PaginatedPayments,
  PaginatedTimeline,
  PrizeHistoryEntry,
} from "./types";

export interface MemberListFilters {
  search?: string;
  status?: string;
  branchId?: string;
  kycStatus?: string;
  riskBand?: string;
  page?: number;
  limit?: number;
}

export function buildMemberQueryString(filters: MemberListFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.branchId) params.set("branchId", filters.branchId);
  if (filters.kycStatus) params.set("kycStatus", filters.kycStatus);
  if (filters.riskBand) params.set("riskBand", filters.riskBand);
  params.set("page", String(filters.page ?? 1));
  params.set("limit", String(filters.limit ?? 20));
  return params.toString();
}

const membersKey = (filters: MemberListFilters) => ["members", filters] as const;
const memberKey = (id: string) => ["member", id] as const;

export function useMembers(filters: MemberListFilters) {
  return useQuery({
    queryKey: membersKey(filters),
    queryFn: () => api.get<PaginatedMembers>(`/members?${buildMemberQueryString(filters)}`),
  });
}

export function useMember(id: string | undefined) {
  return useQuery({
    queryKey: memberKey(id ?? ""),
    queryFn: () => api.get<{ member: Member }>(`/members/${id}`).then((r) => r.member),
    enabled: Boolean(id),
  });
}

export interface RegisterMemberInput {
  name: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  branchId?: string;
  occupation: {
    type: string;
    employerOrBusinessName?: string;
    monthlyIncomeRupees?: number;
    workAddress?: string;
  };
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    lat?: number;
    lng?: number;
    placeId?: string;
    formattedAddress?: string;
  };
  notes?: string;
}

export function useRegisterMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterMemberInput) => api.post<{ member: Member }>("/members", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  });
}

export function useUpdateMember(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<RegisterMemberInput> & { status?: string }) =>
      api.patch<{ member: Member }>(`/members/${id}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: memberKey(id) });
      void queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

export function useDeactivateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ member: Member }>(`/members/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  });
}

// --- KYC ---

export function useSubmitKyc(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { aadhaarNumber?: string; panNumber?: string }) =>
      api.post<{ member: Member }>(`/members/${id}/kyc`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memberKey(id) }),
  });
}

export function useVerifyKyc(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ member: Member }>(`/members/${id}/kyc/verify`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memberKey(id) }),
  });
}

export function useRejectKyc(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => api.post<{ member: Member }>(`/members/${id}/kyc/reject`, { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memberKey(id) }),
  });
}

// --- Documents ---

export interface AddDocumentInput {
  category: string;
  type: string;
  url: string;
  publicId: string;
}

export function useAddDocument(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddDocumentInput) => api.post<{ member: Member }>(`/members/${id}/documents`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memberKey(id) }),
  });
}

export function useRemoveDocument(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => api.delete<{ member: Member }>(`/members/${id}/documents/${documentId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memberKey(id) }),
  });
}

// --- Risk score ---

export function useRecomputeRiskScore(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ riskScore: MemberRiskScore }>(`/members/${id}/risk-score/recompute`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memberKey(id) }),
  });
}

// --- QR code ---

export function useMemberQrCode(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["member-qr", id],
    queryFn: () => api.get<{ qrDataUrl: string }>(`/members/${id}/qr-code`).then((r) => r.qrDataUrl),
    enabled: Boolean(id) && enabled,
    staleTime: Infinity,
  });
}

// --- Nominees ---

export function useNominees(id: string | undefined) {
  return useQuery({
    queryKey: ["member-nominees", id],
    queryFn: () => api.get<{ nominees: Nominee[] }>(`/members/${id}/nominees`).then((r) => r.nominees),
    enabled: Boolean(id),
  });
}

export function useAddNominee(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<Nominee, "id" | "memberId" | "isActive">) =>
      api.post<{ nominee: Nominee }>(`/members/${id}/nominees`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["member-nominees", id] }),
  });
}

export function useRemoveNominee(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (nomineeId: string) => api.delete<void>(`/members/${id}/nominees/${nomineeId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["member-nominees", id] }),
  });
}

// --- Guarantors ---

export function useGuarantors(id: string | undefined) {
  return useQuery({
    queryKey: ["member-guarantors", id],
    queryFn: () => api.get<{ guarantors: Guarantor[] }>(`/members/${id}/guarantors`).then((r) => r.guarantors),
    enabled: Boolean(id),
  });
}

export interface AddGuarantorInput {
  guarantorType: "EXISTING_MEMBER" | "EXTERNAL";
  guarantorMemberId?: string;
  external?: {
    name: string;
    phone: string;
    address?: string;
    occupation?: string;
    idProofType?: string;
    idProofNumber?: string;
  };
  relationToMember?: string;
}

export function useAddGuarantor(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddGuarantorInput) => api.post<{ guarantor: Guarantor }>(`/members/${id}/guarantors`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["member-guarantors", id] }),
  });
}

export function useRemoveGuarantor(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (guarantorId: string) => api.delete<{ guarantor: Guarantor }>(`/members/${id}/guarantors/${guarantorId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["member-guarantors", id] }),
  });
}

// --- Family ---

export function useFamily(id: string | undefined) {
  return useQuery({
    queryKey: ["member-family", id],
    queryFn: () => api.get<{ family: FamilyMember[] }>(`/members/${id}/family`).then((r) => r.family),
    enabled: Boolean(id),
  });
}

export function useAddFamilyMember(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<FamilyMember, "id" | "memberId">) =>
      api.post<{ familyMember: FamilyMember }>(`/members/${id}/family`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["member-family", id] }),
  });
}

export function useRemoveFamilyMember(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (familyMemberId: string) => api.delete<void>(`/members/${id}/family/${familyMemberId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["member-family", id] }),
  });
}

// --- History / timeline ---

export function usePaymentHistory(id: string | undefined) {
  return useQuery({
    queryKey: ["member-payments", id],
    queryFn: () => api.get<PaginatedPayments>(`/members/${id}/payments?limit=50`),
    enabled: Boolean(id),
  });
}

export function usePrizeHistory(id: string | undefined) {
  return useQuery({
    queryKey: ["member-prizes", id],
    queryFn: () => api.get<{ prizes: PrizeHistoryEntry[] }>(`/members/${id}/prizes`).then((r) => r.prizes),
    enabled: Boolean(id),
  });
}

export function useTimeline(id: string | undefined) {
  return useQuery({
    queryKey: ["member-timeline", id],
    queryFn: () => api.get<PaginatedTimeline>(`/members/${id}/timeline?limit=50`),
    enabled: Boolean(id),
  });
}

// --- Portal invite ---

export function useInviteToPortal(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string) =>
      api.post<{ member: Member; temporaryPassword: string | null; linkedExistingAccount: boolean }>(
        `/members/${id}/invite`,
        { email },
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memberKey(id) }),
  });
}

// --- Generic file upload (Cloudinary via the shared /uploads endpoint) ---

export function useUploadFile() {
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return api.postForm<{ url: string; publicId: string }>("/uploads", form);
    },
  });
}

// --- Bulk import ---

export function usePreviewImport() {
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return api.postForm<ImportPreviewResult>("/members/import/preview", form);
    },
  });
}

export function useCommitImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return api.postForm<ImportCommitResult>("/members/import/commit", form);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  });
}
