import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { BusinessHoursEntry, Organization } from "./types";

const ORGANIZATION_KEY = ["organization"] as const;

export function useOrganization() {
  return useQuery({
    queryKey: ORGANIZATION_KEY,
    queryFn: () => api.get<{ organization: Organization }>("/organization").then((r) => r.organization),
  });
}

function useInvalidateOrganization() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ORGANIZATION_KEY });
}

export function useUpdateCompanyProfile() {
  const invalidate = useInvalidateOrganization();
  return useMutation({
    mutationFn: (input: Partial<Pick<Organization, "name" | "registrationNumber" | "contactEmail" | "contactPhone">> & { address?: Organization["address"] }) =>
      api.patch<{ organization: Organization }>("/organization/profile", input),
    onSuccess: invalidate,
  });
}

export function useUpdateSettings() {
  const invalidate = useInvalidateOrganization();
  return useMutation({
    mutationFn: (input: Partial<Organization["settings"]>) =>
      api.patch<{ organization: Organization }>("/organization/settings", input),
    onSuccess: invalidate,
  });
}

export function useUpdateBusinessHours() {
  const invalidate = useInvalidateOrganization();
  return useMutation({
    mutationFn: (businessHours: BusinessHoursEntry[]) =>
      api.patch<{ organization: Organization }>("/organization/business-hours", { businessHours }),
    onSuccess: invalidate,
  });
}

export function useUploadLogo() {
  const invalidate = useInvalidateOrganization();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.postForm<{ organization: Organization }>("/organization/logo", formData);
    },
    onSuccess: invalidate,
  });
}
