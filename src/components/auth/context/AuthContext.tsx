import { createContext, useContext, useEffect, useState } from "react";
import { AdminUser } from "@/types";
import { apiClient } from "@/services/api/client";

type AuthContextType = {
  user: AdminUser | null;
  token: string | null;
  initialized: boolean;
  login: (
    phoneNumber: string,
    password: string,
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateUser: (updatedUser: Partial<AdminUser>) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // ✅ Restore session and sanitize legacy cached branding
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed?.name) {
          parsed.name = parsed.name.replace(/Learnova/gi, "Scorenova");
        }
        if (parsed?.email) {
          parsed.email = parsed.email.replace(/learnova/gi, "scorenova");
        }
        setToken(savedToken);
        setUser(parsed);
        localStorage.setItem("user", JSON.stringify(parsed));
      } catch {
        setToken(savedToken);
      }
    }

    setInitialized(true);

    // Sync latest user profile from server to ensure fresh, accurate branding
    if (savedToken) {
      apiClient
        .get<any>("/auth/get-user-info")
        .then((fresh) => {
          if (fresh && (fresh.name || fresh.email)) {
            const cleanName = (fresh.name || "Scorenova Admin").replace(/Learnova/gi, "Scorenova");
            const cleanEmail = (fresh.email || "admin@scorenova.et").replace(/learnova/gi, "scorenova");
            const updatedUser: AdminUser = {
              id: fresh.id || "admin",
              name: cleanName,
              email: cleanEmail,
              role: fresh.role?.name || "Super Admin",
              lastLogin: new Date().toISOString(),
            };
            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));
          }
        })
        .catch(() => {});
    }
  }, []);

  const login = async (phoneNumber: string, password: string) => {
    try {
      // Backend expects a 9-digit phone number (without country code).
      // Normalize: remove non-digits, drop leading '251' if present, cap at 9 digits.
      const normalized = phoneNumber.replace(/\D/g, "");
      const stripped = normalized.startsWith("251")
        ? normalized.slice(3)
        : normalized;
      const payloadPhone = stripped.slice(0, 9);

      const data = await apiClient.post<any>("/auth/login", {
        phoneNumber: payloadPhone,
        password,
        loginAs: "admin",
        fcmId: "web-admin",
      });

      const token = data?.accessToken;
      const refreshToken = data?.refreshToken;

      const rawName = data?.profile?.name || "Scorenova Admin";
      const cleanName = rawName.replace(/Learnova/gi, "Scorenova");
      const rawEmail = data?.profile?.email || "admin@scorenova.et";
      const cleanEmail = rawEmail.replace(/learnova/gi, "scorenova");

      const loggedInUser: AdminUser = {
        id: data?.profile?.id || "admin",
        name: cleanName,
        email: cleanEmail,
        role: data?.profile?.currentRole?.name || "Super Admin",
        lastLogin: new Date().toISOString(),
      };

      setToken(token);
      setUser(loggedInUser);
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(loggedInUser));
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
      try {
        window.dispatchEvent(new Event("auth:login"));
      } catch (e) {
        /* noop for non-browser env */
      }
      return { success: true };
    } catch (error: any) {
      // AbortError is normal React cleanup during navigation — not a real login failure
      if (error?.name === "AbortError" || error?.message?.includes("aborted")) {
        return { success: true };
      }
      return { success: false, message: error.message || "An error occurred. Please try again." };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    try {
      window.dispatchEvent(new Event("auth:logout"));
    } catch (e) {
      /* noop */
    }
  };

  const updateUser = (updatedUser: Partial<AdminUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedUser };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
  const handleTokenRefreshed = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail?.accessToken) setToken(detail.accessToken);
  };
  window.addEventListener("auth:token-refreshed", handleTokenRefreshed);
  return () => window.removeEventListener("auth:token-refreshed", handleTokenRefreshed);
}, []);

  return (
    <AuthContext.Provider
      value={{ user, token, initialized, login, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
