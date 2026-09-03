import { useMutation, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { setAccessToken } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

export interface PublicOrgInfo {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  contactPhone: string;
  contactEmail: string;
  address: {
    city: string;
    state: string;
  };
}

export interface RegisterMemberInput {
  name: string;
  phone: string;
  email?: string;
  password: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
  };
  occupation: {
    type: string;
    employerOrBusinessName?: string;
    monthlyIncome?: number;
    workAddress?: string;
  };
}

export interface MemberLoginInput {
  identifier: string;
  password: string;
}

export function usePublicOrg(slug: string | undefined) {
  return useQuery({
    queryKey: ["public-org", slug],
    queryFn: async () => {
      const res = await api.get<{ org: PublicOrgInfo }>(`/public/org/${slug}`);
      return res.org;
    },
    enabled: Boolean(slug),
  });
}

export function usePublicMemberRegister(slug: string) {
  const { loginWithTokens } = useAuth();

  return useMutation({
    mutationFn: async (input: RegisterMemberInput) => {
      const res = await api.post<{
        message: string;
        requireEmailVerification?: boolean;
        email?: string;
        auth?: {
          accessToken: string;
          user: any;
        };
        member: any;
      }>(`/public/org/${slug}/register-member`, input);

      if (!res.requireEmailVerification && res.auth) {
        setAccessToken(res.auth.accessToken);
        loginWithTokens(res.auth.accessToken, res.auth.user);
      }

      return res;
    },
  });
}

export function usePublicMemberLogin(slug: string) {
  const { loginWithTokens } = useAuth();

  return useMutation({
    mutationFn: async (input: MemberLoginInput) => {
      const res = await api.post<{
        auth: {
          accessToken: string;
          user: any;
        };
      }>(`/public/org/${slug}/login`, input);

      setAccessToken(res.auth.accessToken);
      loginWithTokens(res.auth.accessToken, res.auth.user);

      return res;
    },
  });
}
