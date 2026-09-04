import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { api, getDeviceId, refreshSessionTokens, setAccessToken, setRefreshToken, setUnauthorizedHandler } from "./api-client";
import { queryClient } from "./query-client";
import { getSavedAccounts, saveAccount } from "./saved-accounts";

export interface AuthUser {
  id: string;
  tenantId: string | null;
  role: { id: string; name: string; slug?: string };
  permissions: string[];
  name: string;
  email: string;
  mustChangePassword: boolean;
}

interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  deviceId: string;
  user: AuthUser;
}

export interface RegisterOrganizerInput {
  tenantName: string;
  registrationNumber: string;
  contactEmail: string;
  contactPhone: string;
  address: { line1: string; city: string; state: string; pincode: string };
  organizerName: string;
  organizerEmail: string;
  organizerPhone: string;
  organizerPassword: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  /** True only while the initial silent-refresh bootstrap is in flight on app load. */
  isLoading: boolean;
  login: (email: string, password: string, rememberDevice?: boolean) => Promise<AuthUser>;
  loginWithTokens: (accessToken: string, user: AuthUser, refreshToken?: string) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  registerOrganization: (input: RegisterOrganizerInput) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (key: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On load, silently try to resume a session from the httpOnly refresh cookie — no separate
  // "/me" endpoint needed, since /auth/refresh already returns the full user payload.
  useEffect(() => {
    let cancelled = false;

    setUnauthorizedHandler(() => {
      setUser(null);
      queryClient.clear();
    });

    void (async () => {
      try {
        const res = await refreshSessionTokens<AuthUser>();
        if (cancelled) return;
        setUser(res.user);
        saveAccount(res.user);
      } catch {
        // If offline, attempt to restore previous account from local device storage
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          const saved = getSavedAccounts();
          if (saved.length > 0 && !cancelled) {
            const last = saved[0];
            setUser({
              id: last.id,
              tenantId: last.tenantId,
              role: {
                id: last.role.id ?? "",
                name: last.role.name,
                slug: last.role.slug,
              },
              permissions: last.role.slug === "SUPER_ADMIN" ? ["*"] : [],
              name: last.name,
              email: last.email,
              mustChangePassword: false,
            });
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      setUnauthorizedHandler(null);
    };
  }, []);

  function loginWithTokens(accessToken: string, authUser: AuthUser, refreshToken?: string) {
    setAccessToken(accessToken);
    if (refreshToken) {
      setRefreshToken(refreshToken);
    }
    setUser(authUser);
    saveAccount(authUser);
  }

  async function login(email: string, password: string, rememberDevice = false): Promise<AuthUser> {
    const res = await api.post<LoginResponse>("/auth/login", {
      email,
      password,
      rememberDevice,
      deviceId: getDeviceId(),
      deviceLabel: navigator.userAgent.slice(0, 100),
    });
    setAccessToken(res.accessToken);
    if (res.refreshToken) {
      setRefreshToken(res.refreshToken);
    }
    setUser(res.user);
    saveAccount(res.user);
    return res.user;
  }

  async function registerOrganization(input: RegisterOrganizerInput): Promise<void> {
    const res = await api.post<LoginResponse>("/auth/register-organizer", {
      ...input,
      deviceId: getDeviceId(),
      deviceLabel: navigator.userAgent.slice(0, 100),
    });
    setAccessToken(res.accessToken);
    if (res.refreshToken) {
      setRefreshToken(res.refreshToken);
    }
    setUser(res.user);
    saveAccount(res.user);
  }

  async function logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } finally {
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
    }
  }

  function updateUser(patch: Partial<AuthUser>) {
    setUser((prev) => (prev ? { ...prev, ...patch } : null));
  }

  function hasPermission(key: string): boolean {
    if (!user) return false;
    if (user.role?.slug === "SUPER_ADMIN" || user.permissions?.includes("*")) return true;
    return user.permissions?.includes(key) ?? false;
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, loginWithTokens, updateUser, registerOrganization, logout, hasPermission }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
