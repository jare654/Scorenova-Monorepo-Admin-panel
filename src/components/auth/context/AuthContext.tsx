import { createContext, useContext, useEffect, useState } from "react";
import { AdminUser } from "@/types";

type AuthContextType = {
  user: AdminUser | null;
  token: string | null;
  login: (phoneNumber: string, password: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

const API_URL = "https://learnova-backen.onrender.com/api/v1";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // ✅ Restore session
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (phoneNumber: string, password: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber,
          password,
          loginAs: "admin",
          fcmId: "web-admin",
        }),
      });

      if (!res.ok) return false;

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

      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
