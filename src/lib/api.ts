// API configuration - validate in production
const getApiUrl = (): string => {
  const baseUrl =
    import.meta.env.VITE_API_URL || "https://learnova-backend-api.onrender.com";
  return `${baseUrl.replace(/\/$/, "")}/api/v1`;
};

export const API_URL = getApiUrl();

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