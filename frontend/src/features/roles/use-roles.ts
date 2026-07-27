import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { Permission, Role } from "./types";

const ROLES_KEY = ["roles"] as const;
const PERMISSIONS_KEY = ["permissions"] as const;

export function useRoles() {
  return useQuery({
    queryKey: ROLES_KEY,
    queryFn: () => api.get<{ roles: Role[] }>("/roles").then((r) => r.roles),
  });
}

export function usePermissionCatalog() {
  return useQuery({
    queryKey: PERMISSIONS_KEY,
    queryFn: () => api.get<{ permissions: Permission[] }>("/permissions").then((r) => r.permissions),
    staleTime: Infinity,
  });
}

export interface CreateRoleInput {
  name: string;
  permissionKeys: string[];
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRoleInput) => api.post<{ role: Role }>("/roles", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLES_KEY }),
  });
}

export interface UpdateRoleInput {
  id: string;
  name?: string;
  permissionKeys?: string[];
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateRoleInput) => api.patch<{ role: Role }>(`/roles/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLES_KEY }),
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/roles/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLES_KEY }),
  });
}
