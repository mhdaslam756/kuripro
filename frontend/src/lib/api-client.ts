const API_BASE_URL: string = (import.meta.env["VITE_API_URL"] as string | undefined) ?? "http://localhost:4000/api";

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
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

let refreshInFlight: Promise<void> | null = null;
let onUnauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorizedHandler = handler;
}

async function refreshAccessToken(): Promise<void> {
  refreshInFlight ??= (async () => {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, { method: "POST", credentials: "include" });
    if (!res.ok) {
      throw new Error("Refresh failed");
    }
    const data = (await res.json()) as { accessToken: string };
    setAccessToken(data.accessToken);
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
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
      await refreshAccessToken();
      return await request<T>(path, { ...options, skipAuthRetry: true });
    } catch (err) {
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
      await refreshAccessToken();
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
