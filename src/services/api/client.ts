import { API_URL } from "@/lib/api";

export type ApiValue = string | number | boolean | null | undefined;

export interface ApiEnvelope<T> {
  data?: T;
  message?: string;
  success?: boolean;
}

export interface ApiClientOptions {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 500;
const retryStatuses = new Set([429, 502, 503, 504]);
const GET_CACHE_TTL_MS = 0; // No cache — rely on TanStack Query's staleTime instead
const GET_MIN_INTERVAL_MS = 2000;
const GET_COOLDOWN_ON_429_MS = 10000;

const inflightGetRequests = new Map<string, Promise<unknown>>();
const getResponseCache = new Map<string, { expiresAt: number; data: unknown }>();
let lastGetRequestAt = 0;
let getQueue: Promise<void> = Promise.resolve();
const getCooldownUntil = new Map<string, number>();

async function enqueueGet<T>(key: string, work: () => Promise<T>): Promise<T> {
  return work();
}
function getToken(): string | null {
  return localStorage.getItem("token");
}
function getRefreshToken(): string | null {
  return localStorage.getItem("refreshToken");
}

function setTokens(accessToken: string, refreshToken?: string) {
  localStorage.setItem("token", accessToken);
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
  try {
    window.dispatchEvent(
      new CustomEvent("auth:token-refreshed", { detail: { accessToken, refreshToken } })
    );
  } catch {
    /* noop */
  }
}

function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("refreshToken");
  try {
    window.dispatchEvent(new Event("auth:logout"));
  } catch {
    /* noop */
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearAuth();
      return null;
    }
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-refresh-token": refreshToken,
        },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        clearAuth();
        return null;
      }
      const data = await res.json();
      if (!data?.accessToken) {
        clearAuth();
        return null;
      }
      setTokens(data.accessToken, data.refreshToken);
      return data.accessToken as string;
    } catch {
      clearAuth();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function buildHeaders(body?: BodyInit | null): Headers {
  const headers = new Headers();
  const token = getToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

function getRetryDelayMs(response: Response, attempt: number, baseDelay: number): number {
  const header = response.headers.get("retry-after");
  if (header) {
    const parsed = Number(header);
    if (!Number.isNaN(parsed)) {
      return Math.max(parsed * 1000, baseDelay);
    }
  }

  const backoff = baseDelay * Math.pow(2, attempt);
  const jitter = Math.floor(Math.random() * 150);
  return backoff + jitter;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    // Silently re-throw AbortError — it's normal React Query cleanup on unmount/navigation
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    try {
      window.dispatchEvent(new Event("auth:logout"));
    } catch {
      // noop
    }
    throw new Error("Session expired. Please log in again.");
  }

  if (response.status === 403) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        const json = await response.clone().json();
        if (json?.data?.logout === true || json?.message === "User does not exist" || (typeof json?.message === "string" && json?.message.includes("User does not exist"))) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          try {
            window.dispatchEvent(new Event("auth:logout"));
          } catch {
            // noop
          }
          throw new Error("Account has been suspended or deactivated.");
        }
      } catch {
        // noop
      }
    }
  }

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    let message = `HTTP ${response.status}`;

    if (contentType.includes("application/json")) {
      try {
        const json = await response.json();
        message = Array.isArray(json?.message)
          ? json.message.join(", ")
          : json?.message || json?.error || message;
      } catch {
        message = response.statusText || message;
      }
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null as T;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return (await response.text()) as T;
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("Failed to parse response");
  }
}

export class ApiClient {
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    signal?: AbortSignal,
    options: ApiClientOptions = {},
  ): Promise<T> {
    const requestBody = body instanceof FormData ? body : body ? JSON.stringify(body) : undefined;
    const requestOptions: RequestInit = {
      method,
      headers: buildHeaders(requestBody ?? null),
      body: requestBody,
      signal,
    };

    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const retries = options.retries ?? DEFAULT_RETRIES;
    const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

    const url = `${API_URL}${endpoint}`;
    const normalizedMethod = method.toUpperCase();

    if (normalizedMethod === "GET") {
      const cached = getResponseCache.get(url);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data as T;
      }

      const inflight = inflightGetRequests.get(url);
      if (inflight) {
        return inflight as Promise<T>;
      }
    }

   const execute = async (): Promise<T> => {
  let lastError: Error | null = null;
  let refreshedOnce = false;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    // If the signal was already aborted before we start, bail out silently
    if (signal?.aborted) {
      const abortErr = new DOMException("signal is aborted without reason", "AbortError");
      throw abortErr;
    }

    let response = await fetchWithTimeout(url, requestOptions, timeoutMs);

    // Silent refresh: on 401 (expired token), try refreshing once and retry the request
    if (response.status === 401 && !endpoint.startsWith("/auth/") && !refreshedOnce) {
      refreshedOnce = true;
      const newAccessToken = await refreshAccessToken();
      if (newAccessToken) {
        requestOptions.headers = buildHeaders(requestBody ?? null);
        response = await fetchWithTimeout(url, requestOptions, timeoutMs);
      }
    }

    if (response.status === 429) {
          getCooldownUntil.set(url, Date.now() + GET_COOLDOWN_ON_429_MS);
        }

        if (!retryStatuses.has(response.status)) {
          const data = await parseResponse<T>(response);
          if (normalizedMethod === "GET") {
            getResponseCache.set(url, { expiresAt: Date.now() + GET_CACHE_TTL_MS, data });
            inflightGetRequests.delete(url);
          }
          return data;
        }

        lastError = new Error(`HTTP ${response.status}`);

        if (attempt < retries) {
          await sleep(getRetryDelayMs(response, attempt, retryDelayMs));
          continue;
        }

        const data = await parseResponse<T>(response);
        if (normalizedMethod === "GET") {
          getResponseCache.set(url, { expiresAt: Date.now() + GET_CACHE_TTL_MS, data });
          inflightGetRequests.delete(url);
        }
        return data;
      }

      if (normalizedMethod === "GET") {
        inflightGetRequests.delete(url);
      }

      throw lastError ?? new Error("Request failed");
    };

    if (normalizedMethod === "GET") {
      const promise = enqueueGet(url, execute).catch((error) => {
        inflightGetRequests.delete(url);
        throw error;
      });
      inflightGetRequests.set(url, promise);
      return promise;
    }

    return execute();
  }

  async get<T>(endpoint: string, signal?: AbortSignal, options?: ApiClientOptions): Promise<T> {
    return this.request<T>("GET", endpoint, undefined, signal, options);
  }

  async post<T>(endpoint: string, body?: unknown, signal?: AbortSignal, options?: ApiClientOptions): Promise<T> {
    return this.request<T>("POST", endpoint, body, signal, options);
  }

  async put<T>(endpoint: string, body?: unknown, signal?: AbortSignal, options?: ApiClientOptions): Promise<T> {
    return this.request<T>("PUT", endpoint, body, signal, options);
  }

  async patch<T>(endpoint: string, body?: unknown, signal?: AbortSignal, options?: ApiClientOptions): Promise<T> {
    return this.request<T>("PATCH", endpoint, body, signal, options);
  }

  async delete<T>(endpoint: string, signal?: AbortSignal, options?: ApiClientOptions): Promise<T> {
    return this.request<T>("DELETE", endpoint, undefined, signal, options);
  }

  /** Clear the GET response cache for a specific endpoint (call after mutations that affect that data) */
  clearCache(endpoint: string): void {
    const url = `${API_URL}${endpoint}`;
    getResponseCache.delete(url);
    inflightGetRequests.delete(url);
  }

  /** Clear all GET response cache entries */
  clearAllCache(): void {
    getResponseCache.clear();
    inflightGetRequests.clear();
  }
}

export const apiClient = new ApiClient();
