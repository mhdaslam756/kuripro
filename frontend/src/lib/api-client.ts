export const API_BASE_URL: string = (import.meta.env["VITE_API_URL"] as string | undefined) || "/api";

const ACCESS_TOKEN_KEY = "kuripro_access_token";
const REFRESH_TOKEN_KEY = "kuripro_refresh_token";

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  }
}

export function getAccessToken(): string | null {
  if (!accessToken && typeof window !== "undefined") {
    accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  }
  return accessToken;
}

export function setRefreshToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

const DEVICE_ID_STORAGE_KEY = "kuripro_device_id";

/** Stable per-browser id sent on every login so returning devices reuse one Session row. */
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, id);
  }
  return id;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ErrorResponseBody {
  error?: { code?: string; message?: string; details?: unknown };
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  skipAuthRetry?: boolean;
}

export interface SessionRefreshResult<TUser = any> {
  accessToken: string;
  refreshToken?: string;
  user: TUser;
}

let refreshInFlight: Promise<SessionRefreshResult> | null = null;
let onUnauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorizedHandler = handler;
}

export function refreshSessionTokens<TUser = any>(): Promise<SessionRefreshResult<TUser>> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const storedRt = getRefreshToken();
      const headers: Record<string, string> = {};
      if (storedRt) {
        headers["x-refresh-token"] = storedRt;
        headers["Content-Type"] = "application/json";
      }
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers,
        credentials: "include",
        body: storedRt ? JSON.stringify({ refreshToken: storedRt }) : undefined,
      });
      if (!res.ok) {
        setAccessToken(null);
        setRefreshToken(null);
        throw new ApiError(res.status, "UNAUTHORIZED", "Refresh failed");
      }
      const data = (await res.json()) as SessionRefreshResult<TUser>;
      setAccessToken(data.accessToken);
      if (data.refreshToken) {
        setRefreshToken(data.refreshToken);
      }
      return data;
    })().finally(() => {
      setTimeout(() => {
        refreshInFlight = null;
      }, 500);
    });
  }

  return refreshInFlight as Promise<SessionRefreshResult<TUser>>;
}

function isPublicAuthEndpoint(path: string): boolean {
  return (
    path.startsWith("/auth/") ||
    path.startsWith("/super-admin/login") ||
    path.startsWith("/public/")
  );
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body,
    credentials: "include",
  });

  if (res.status === 401 && !options.skipAuthRetry && !isPublicAuthEndpoint(path)) {
    try {
      await refreshSessionTokens();
      return await request<T>(path, { ...options, skipAuthRetry: true });
    } catch {
      setAccessToken(null);
      onUnauthorizedHandler?.();
      throw new ApiError(401, "UNAUTHORIZED", "Session expired");
    }
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type");
  const data: unknown = contentType?.includes("application/json") ? await res.json() : undefined;

  if (!res.ok) {
    const body = data as ErrorResponseBody | undefined;
    throw new ApiError(
      res.status,
      body?.error?.code ?? "UNKNOWN",
      body?.error?.message ?? "Something went wrong",
      body?.error?.details,
    );
  }

  return data as T;
}

/**
 * Fetches a non-JSON response (e.g. a CSV export) as a Blob, with the same in-memory bearer token
 * and one-shot 401→refresh→retry behaviour as the JSON `request` path.
 */
async function downloadBlob(path: string, skipAuthRetry = false): Promise<Blob> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { headers, credentials: "include" });

  const isAuthEndpoint = path.startsWith("/auth/");

  if (res.status === 401 && !skipAuthRetry && !isAuthEndpoint) {
    try {
      await refreshSessionTokens();
      return await downloadBlob(path, true);
    } catch {
      setAccessToken(null);
      onUnauthorizedHandler?.();
      throw new ApiError(401, "UNAUTHORIZED", "Session expired");
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, "DOWNLOAD_FAILED", "The download could not be completed");
  }

  return res.blob();
}

export const api = {
  get: <T>(path: string): Promise<T> => request<T>(path),
  post: <T>(path: string, body?: unknown): Promise<T> => request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown): Promise<T> => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string, body?: unknown): Promise<T> => request<T>(path, { method: "DELETE", body }),
  postForm: <T>(path: string, body: FormData): Promise<T> => request<T>(path, { method: "POST", body }),
  download: (path: string): Promise<Blob> => downloadBlob(path),
};
