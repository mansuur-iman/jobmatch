export const TOKEN_KEY = "jobmatch_token";

// In dev, Vite proxies /api to the Express server (see vite.config.ts).
const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

/** Thrown for any non-2xx response or network failure. status is 0 when the server was unreachable. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Set by AuthContext so a 401 on a protected call logs the user out.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

function extractMessage(data: any): string | null {
  const raw = data?.error ?? data?.message;
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && typeof raw.message === "string") return raw.message;
  return null;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch only rejects on network failure, not on 4xx/5xx
    throw new ApiError("Can't reach the server. Is the backend running?", 0);
  }

  // Read as text first so empty or non-JSON bodies don't crash.
  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    if (res.status === 401 && !path.startsWith("/auth/")) onUnauthorized?.();
    throw new ApiError(extractMessage(data) ?? `Request failed (${res.status})`, res.status);
  }

  return data as T;
}

export const api = {
  get: <T = any>(path: string) => request<T>("GET", path),
  post: <T = any>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T = any>(path: string, body?: unknown) => request<T>("PATCH", path, body),
};

/** Human-readable message for any thrown value. */
export function errorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function isNotFound(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404;
}
