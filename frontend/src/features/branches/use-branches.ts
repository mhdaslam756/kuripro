import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { Address } from "@/features/organization/types";
import type { Branch, PaginatedBranches } from "./types";

const BRANCHES_KEY = ["branches"] as const;

export function useBranches() {
  return useQuery({
    queryKey: BRANCHES_KEY,
    queryFn: () => api.get<PaginatedBranches>("/branches?limit=100"),
  });
}

export interface CreateBranchInput {
  name: string;
  code: string;
  address: Address;
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBranchInput) => api.post<{ branch: Branch }>("/branches", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BRANCHES_KEY }),
  });
}

export interface UpdateBranchInput {
  id: string;
  name?: string;
  address?: Address;
  status?: Branch["status"];
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateBranchInput) =>
      api.patch<{ branch: Branch }>(`/branches/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BRANCHES_KEY }),
  });
}
