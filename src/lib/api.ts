// API configuration - validate in production
const getApiUrl = (): string => {
  const baseUrl =
    import.meta.env.VITE_API_URL || "https://learnova-backend-api.onrender.com";
  return `${baseUrl.replace(/\/$/, "")}/api/v1`;
};

export const API_URL = getApiUrl();

export type GradeSummary = {
  id: string;
  name: string;
  description?: string;
};

const gradeListCache = new Map<string, { expiresAt: number; data: GradeSummary[] }>();
const gradeListInFlight = new Map<string, Promise<GradeSummary[]>>();
const GRADE_LIST_CACHE_TTL = 30_000;

const analyticsAverageCache = new Map<
  string,
  { expiresAt: number; data: number | null }
>();
const analyticsAverageInFlight = new Map<string, Promise<number | null>>();
const ANALYTICS_AVERAGE_CACHE_TTL = 30_000;

export async function getGrades(token: string): Promise<GradeSummary[]> {
  const cached = gradeListCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const existingRequest = gradeListInFlight.get(token);
  if (existingRequest) {
    return existingRequest;
  }

  const request = (async () => {
    const response = await fetch(`${API_URL}/grades`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 404) {
      return [];
    }

    if (response.status === 429) {
      if (cached) {
        return cached.data;
      }
      throw new Error("Too many requests. Please try again in a moment.");
    }

    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      let errorMessage = `HTTP ${response.status}`;

      if (contentType?.includes("application/json")) {
        try {
          const json = await response.json();
          errorMessage = Array.isArray(json.message)
            ? json.message.join(", ")
            : json.message || errorMessage;
        } catch {
          // fall through to default message
        }
      }

      throw new Error(errorMessage);
    }

    const json = await response.json();
    const grades: GradeSummary[] = Array.isArray(json) ? json : (json.data ?? []);
    gradeListCache.set(token, {
      expiresAt: Date.now() + GRADE_LIST_CACHE_TTL,
      data: grades,
    });
    return grades;
  })();

  gradeListInFlight.set(token, request);

  try {
    return await request;
  } finally {
    gradeListInFlight.delete(token);
  }
}

export async function getAnalyticsAverageUsers(
  token: string,
  range: "daily" | "monthly",
): Promise<number | null> {
  const cacheKey = `${token}:${range}`;
  const cached = analyticsAverageCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const existingRequest = analyticsAverageInFlight.get(cacheKey);
  if (existingRequest) {
    return existingRequest;
  }

  const endpoint =
    range === "daily"
      ? `${API_URL}/analytics/daily-average-users`
      : `${API_URL}/analytics/monthly-average-users`;

  const request = (async () => {
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 404) {
      return null;
    }

    if (response.status === 429) {
      return cached?.data ?? null;
    }

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const json = payload?.data ?? payload;
    const average = typeof json?.average === "number" ? json.average : null;

    analyticsAverageCache.set(cacheKey, {
      expiresAt: Date.now() + ANALYTICS_AVERAGE_CACHE_TTL,
      data: average,
    });

    return average;
  })();

  analyticsAverageInFlight.set(cacheKey, request);

  try {
    return await request;
  } finally {
    analyticsAverageInFlight.delete(cacheKey);
  }
}

// Secure fetch wrapper with global error handling
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem("token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 globally (token expired or invalid)
  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    try {
      window.dispatchEvent(new Event("auth:logout"));
    } catch (e) {
      /* noop in non-browser env */
    }
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    let errorMessage = "An error occurred. Please try again.";

    if (contentType?.includes("application/json")) {
      try {
        const json = await response.json();
        errorMessage = Array.isArray(json.message)
          ? json.message.join(", ")
          : json.message || errorMessage;
      } catch {
        errorMessage = `HTTP ${response.status}`;
      }
    }

    throw new Error(errorMessage);
  }

  return response.json().catch(() => {
    throw new Error("Failed to parse response");
  });
}