import { createContext, useContext, useEffect, useState } from "react";
import { AdminUser } from "@/types";
import { API_URL } from "@/lib/api";

type AuthContextType = {
  user: AdminUser | null;
  token: string | null;
  initialized: boolean;
  login: (
    phoneNumber: string,
    password: string,
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // ✅ Restore session
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }

    setInitialized(true);
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

      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: payloadPhone,
          password,
          loginAs: "admin",
          fcmId: "web-admin",
        }),
      });

      // log status and body for debugging 400 responses
      if (!res.ok) {
        let bodyText = "";
        try {
          bodyText = await res.text();
        } catch (e) {
          bodyText = String(e);
        }

        // try parse JSON message
        try {
          const parsed = JSON.parse(bodyText);
          const msg = parsed?.message ?? bodyText;
          return { success: false, message: Array.isArray(msg) ? msg.join(", ") : msg };
        } catch {
          return { success: false, message: "Login failed. Please check your credentials." };
        }
      }

      const data = await res.json();

      const token = data?.accessToken;

      const loggedInUser: AdminUser = {
        id: data?.profile?.id || "admin",
        name: data?.profile?.name || "Admin",
        email: data?.profile?.email || "admin@examapp.com",
        role: data?.profile?.currentRole?.name || "Super Admin",
        lastLogin: new Date().toISOString(),
      };

      setToken(token);
      setUser(loggedInUser);

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(loggedInUser));
      try {
        window.dispatchEvent(new Event("auth:login"));
      } catch (e) {
        /* noop for non-browser env */
      }
      return { success: true };
    } catch (error) {
      return { success: false, message: "An error occurred. Please try again." };
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

  return (
    <AuthContext.Provider
      value={{ user, token, initialized, login, logout }}
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
