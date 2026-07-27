import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface TenantItem {
  id: string;
  name: string;
  slug: string;
  contactEmail: string;
  contactPhone: string;
  registrationNumber: string;
  status: "PENDING_APPROVAL" | "ACTIVE" | "SUSPENDED" | "REJECTED";
  createdAt: string;
}

export interface ListTenantsResponse {
  items: TenantItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PlatformStats {
  totalOrganizations: number;
  pendingOrganizations: number;
  activeOrganizations: number;
  suspendedOrganizations: number;
  totalMembers: number;
  totalKuris: number;
}

export function useSuperAdminOrganizations(status?: string, search?: string, page = 1) {
  const queryParams = new URLSearchParams();
  if (status && status !== "__all__") queryParams.set("status", status);
  if (search) queryParams.set("search", search);
  queryParams.set("page", String(page));

  return useQuery({
    queryKey: ["super-admin", "organizations", status, search, page],
    queryFn: () => api.get<ListTenantsResponse>(`/super-admin/organizations?${queryParams.toString()}`),
  });
}

export function usePlatformStats() {
  return useQuery({
    queryKey: ["super-admin", "stats"],
    queryFn: () => api.get<PlatformStats>("/super-admin/stats"),
  });
}

export function useApproveOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<{ id: string }>(`/super-admin/organizations/${id}/approve`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["super-admin"] });
    },
  });
}

export function useRejectOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.post<{ id: string }>(`/super-admin/organizations/${id}/reject`, { reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["super-admin"] });
    },
  });
}

export function useSetOrganizationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "SUSPENDED" }) =>
      api.patch<{ id: string }>(`/super-admin/organizations/${id}/status`, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["super-admin"] });
    },
  });
}
