// API configuration - validate in production
const getApiUrl = (): string => {
  const baseUrl =
    import.meta.env.VITE_API_URL || "https://learnova-backend-api.onrender.com";
  return `${baseUrl.replace(/\/$/, "")}/api/v1`;
};

export const API_URL = getApiUrl();

// Secure fetch wrapper with global error handling
export interface ApiRequestOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 500;
const GET_CACHE_TTL_MS = 30 * 1000;
const GET_MIN_INTERVAL_MS = 2000;
const GET_COOLDOWN_ON_429_MS = 10000;

const retryStatuses = new Set([429, 502, 503, 504]);

const inflightGetRequests = new Map<string, Promise<unknown>>();
const getResponseCache = new Map<string, { expiresAt: number; data: unknown }>();
let lastGetRequestAt = 0;
let getQueue: Promise<void> = Promise.resolve();
const getCooldownUntil = new Map<string, number>();

async function enqueueGet<T>(key: string, work: () => Promise<T>): Promise<T> {
  let resolveQueue: () => void;
  const next = new Promise<void>((resolve) => {
    resolveQueue = resolve;
  });

  const prev = getQueue;
  getQueue = prev.then(() => next);

  await prev;

  const now = Date.now();
  const cooldownUntil = getCooldownUntil.get(key) ?? 0;
  const waitForCooldown = Math.max(0, cooldownUntil - now);
  const waitForInterval = Math.max(0, GET_MIN_INTERVAL_MS - (now - lastGetRequestAt));
  const waitMs = Math.max(waitForCooldown, waitForInterval);
  if (waitMs > 0) {
    await sleep(waitMs);
  }

  try {
    return await work();
  } finally {
    lastGetRequestAt = Date.now();
    resolveQueue!();
  }
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
      /* noop in non-browser env */
    }
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    let errorMessage = `HTTP ${response.status}`;

    if (contentType.includes("application/json")) {
      try {
        const json = await response.json();
        errorMessage = Array.isArray(json.message)
          ? json.message.join(", ")
          : json.message || json.error || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
    }

    throw new Error(errorMessage);
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

export async function apiFetch<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const token = localStorage.getItem("token");

  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

  const requestOptions: RequestInit = {
    ...options,
    headers,
  };

  const requestUrl = `${API_URL}${endpoint}`;
  const method = (requestOptions.method ?? "GET").toUpperCase();

  if (method === "GET") {
    const cached = getResponseCache.get(requestUrl);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }

    const inflight = inflightGetRequests.get(requestUrl);
    if (inflight) {
      return inflight as Promise<T>;
    }
  }

  let lastError: Error | null = null;

  const execute = async (): Promise<T> => {
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const response = await fetchWithTimeout(
        requestUrl,
        requestOptions,
        timeoutMs,
      );

      if (response.status === 429) {
        getCooldownUntil.set(requestUrl, Date.now() + GET_COOLDOWN_ON_429_MS);
      }

    if (!retryStatuses.has(response.status)) {
      const data = await parseResponse<T>(response);
      if (method === "GET") {
        getResponseCache.set(requestUrl, {
          expiresAt: Date.now() + GET_CACHE_TTL_MS,
          data,
        });
        inflightGetRequests.delete(requestUrl);
      }
      return data;
    }

    lastError = new Error(`HTTP ${response.status}`);

    if (attempt < retries) {
      await sleep(getRetryDelayMs(response, attempt, retryDelayMs));
      continue;
    }

      const data = await parseResponse<T>(response);
      if (method === "GET") {
        getResponseCache.set(requestUrl, {
          expiresAt: Date.now() + GET_CACHE_TTL_MS,
          data,
        });
        inflightGetRequests.delete(requestUrl);
      }
      return data;
    }

    if (method === "GET") {
      inflightGetRequests.delete(requestUrl);
    }
    throw lastError ?? new Error("Request failed");
  };

  if (method === "GET") {
    const promise = enqueueGet(requestUrl, execute).catch((error) => {
      inflightGetRequests.delete(requestUrl);
      throw error;
    });
    inflightGetRequests.set(requestUrl, promise);
    return promise;
  }

  return execute();
}