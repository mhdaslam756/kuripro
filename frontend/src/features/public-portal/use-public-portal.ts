import { useMutation, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { setAccessToken } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { queryClient } from "@/lib/query-client";

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
        loginWithTokens(res.auth.accessToken, res.auth.user, (res.auth as any).refreshToken);
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
          refreshToken?: string;
          user: any;
        };
      }>(`/public/org/${slug}/login`, input);

      setAccessToken(res.auth.accessToken);
      loginWithTokens(res.auth.accessToken, res.auth.user, res.auth.refreshToken);

      return res;
    },
  });
}

/** What we learn from a mobile number before deciding which sign-up path to show. */
export interface PublicPhoneCheck {
  /** A KuriPro login already exists for this number. */
  accountExists: boolean;
  /** The number already belongs to this organisation, so signing in is the next step. */
  alreadyMember: boolean;
  /** The account's email with most of it hidden, so the person recognises it. */
  maskedEmail?: string;
}

export function usePublicPhoneCheck(slug: string) {
  return useMutation({
    mutationFn: (phone: string) => api.post<PublicPhoneCheck>(`/public/org/${slug}/check-phone`, { phone }),
  });
}

export interface JoinOrganizationInput {
  phone: string;
  password: string;
  /** Only when the account has no existing member profile to reuse. */
  address?: { line1: string; city: string; state: string; pincode: string; country: string };
  occupationType?: string;
}

/** Joins this organisation with an account the person already has, then signs them in to it. */
export function usePublicJoin(slug: string) {
  const { loginWithTokens } = useAuth();

  return useMutation({
    mutationFn: async (input: JoinOrganizationInput) => {
      const res = await api.post<{ auth: { accessToken: string; refreshToken?: string; user: any } }>(
        `/public/org/${slug}/join`,
        input,
      );
      // Anything cached belongs to whichever organisation this browser was in before.
      queryClient.clear();
      setAccessToken(res.auth.accessToken);
      loginWithTokens(res.auth.accessToken, res.auth.user, res.auth.refreshToken);
      return res;
    },
  });
}


/** Confirms the password of an existing account. Creates nothing; the page then offers the Join button. */
export function usePublicVerifyAccount(slug: string) {
  return useMutation({
    mutationFn: (input: { phone: string; password: string }) =>
      api.post<{ verified: true; name: string }>(`/public/org/${slug}/verify-account`, input),
  });
}
