import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { api, getDeviceId, setAccessToken } from "./api-client";
import { authenticateWithPasskey } from "./webauthn";

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
  deviceId: string;
  user: AuthUser;
}

interface RefreshResponse {
  accessToken: string;
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
  loginWithPasskey: (email: string) => Promise<AuthUser>;
  loginWithTokens: (accessToken: string, user: AuthUser) => void;
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

    void (async () => {
      try {
        const res = await api.post<RefreshResponse>("/auth/refresh");
        if (cancelled) return;
        setAccessToken(res.accessToken);
        setUser(res.user);
      } catch {
        // No valid session — the user just stays logged out, this isn't an error to surface.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function loginWithTokens(accessToken: string, authUser: AuthUser) {
    setAccessToken(accessToken);
    setUser(authUser);
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
    setUser(res.user);
    return res.user;
  }

  async function loginWithPasskey(email: string): Promise<AuthUser> {
    const res = await authenticateWithPasskey(email);
    setAccessToken(res.accessToken);
    setUser(res.user);
    return res.user;
  }

  async function registerOrganization(input: RegisterOrganizerInput): Promise<void> {
    const res = await api.post<LoginResponse>("/auth/register-organizer", {
      ...input,
      deviceId: getDeviceId(),
      deviceLabel: navigator.userAgent.slice(0, 100),
    });
    setAccessToken(res.accessToken);
    setUser(res.user);
  }

  async function logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }

  function hasPermission(key: string): boolean {
    return user?.permissions.includes(key) ?? false;
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, loginWithPasskey, loginWithTokens, registerOrganization, logout, hasPermission }}
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
