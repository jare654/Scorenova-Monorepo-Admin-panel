import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { API_URL } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
export type AccountStatus = "free" | "premium" | "trial";
export type AccountType = "student" | "admin" | "teacher";

export interface Account {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  type: AccountType;
  isActive: boolean;
  status: AccountStatus;
  gradeId: string | null;
  gender: string;
  address: string | null;
  profileImageFilename: string | null;
  fcmId: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  deletedBy: string | null;
  createdAt: string;
  joinedAt: string;
  lastActiveAt: string | null;
  updatedAt: string;
  deletedAt: string | null;
}

export interface UserGrowthPoint {
  day: string;
  users: number;
  premium: number;
}

export interface StatusDataPoint {
  name: string;
  value: number;
}

// ─── Context shape ────────────────────────────────────────────────────────────
interface AccountsContextValue {
  allAccounts: Account[];
  students: Account[];
  totalUsers: number;
  activeTodayCount: number;
  statusData: StatusDataPoint[];
  userGrowthData: UserGrowthPoint[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const AccountsContext = createContext<AccountsContextValue | null>(null);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildGrowthData(students: Account[]): UserGrowthPoint[] {
  const now = new Date();
  const growthMap: Record<string, { users: number; premium: number }> = {};

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    growthMap[label] = { users: 0, premium: 0 };
  }

  students.forEach((u) => {
    const joined = new Date(u.createdAt ?? u.joinedAt);
    const diffDays = (now.getTime() - joined.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 30) {
      const label = joined.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      if (growthMap[label] !== undefined) {
        growthMap[label].users += 1;
        if (u.status === "premium") growthMap[label].premium += 1;
      }
    }
  });

  let cumulativeUsers = 0;
  let cumulativePremium = 0;

  students.forEach((u) => {
    const joined = new Date(u.createdAt ?? u.joinedAt);
    const diffDays = (now.getTime() - joined.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 30) {
      cumulativeUsers += 1;
      if (u.status === "premium") cumulativePremium += 1;
    }
  });

  return Object.keys(growthMap).map((label) => {
    cumulativeUsers += growthMap[label].users;
    cumulativePremium += growthMap[label].premium;
    return { day: label, users: cumulativeUsers, premium: cumulativePremium };
  });
}

function buildStatusData(students: Account[]): StatusDataPoint[] {
  const count = { free: 0, premium: 0, trial: 0 };
  students.forEach((u) => {
    const s = (u.status ?? "free").toLowerCase() as keyof typeof count;
    if (s in count) count[s] += 1;
  });
  return [
    { name: "Premium", value: count.premium },
    { name: "Free", value: count.free },
    { name: "Trial", value: count.trial },
  ];
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AccountsProvider({ children }: { children: ReactNode }) {
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [serverDate, setServerDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");

      // If there's no token, avoid calling protected endpoints and surface a clear error
      if (!token) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      const [dateRes, accountsRes] = await Promise.all([
        fetch(`${API_URL}/get-date`),
        fetch(`${API_URL}/accounts/get-accounts`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      // Server date — non-critical, fall back to local date if it fails
      try {
        const dateText = await dateRes.text();
        setServerDate(new Date(dateText.replace(/"/g, "")));
      } catch {
        setServerDate(new Date());
      }

      // Accounts
      if (!accountsRes.ok) {
        let body = "";
        try {
          body = await accountsRes.text();
        } catch (e) {
          body = String(e);
        }
        throw new Error("Failed to fetch accounts");
      }
      const accountsJson = await accountsRes.json();
      const data: Account[] = accountsJson?.data ?? [];
      setAllAccounts(data);
    } catch (err) {
      setError("Failed to load accounts data.");
      // Never rethrow — a fetch failure must NEVER crash the layout
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for auth events so we can refetch when the user logs in/out
  useEffect(() => {
    const handleLogin = () => {
      fetchData();
    };
    const handleLogout = () => {
      setAllAccounts([]);
      setServerDate(null);
      setLoading(false);
    };

    try {
      window.addEventListener("auth:login", handleLogin);
      window.addEventListener("auth:logout", handleLogout);
    } catch (e) {
      /* noop */
    }

    return () => {
      try {
        window.removeEventListener("auth:login", handleLogin);
        window.removeEventListener("auth:logout", handleLogout);
      } catch (e) {
        /* noop */
      }
    };
  }, [fetchData]);

  // ── Derived values ────────────────────────────────────────────────────────
  const students = allAccounts.filter((u) => u.type === "student");
  const totalUsers = students.length;

  const activeTodayCount = serverDate
    ? students.filter((u) => {
        if (!u.lastActiveAt) return false;
        return (
          new Date(u.lastActiveAt).toDateString() === serverDate.toDateString()
        );
      }).length
    : 0;

  const userGrowthData = buildGrowthData(students);
  const statusData = buildStatusData(students);

  return (
    <AccountsContext.Provider
      value={{
        allAccounts,
        students,
        totalUsers,
        activeTodayCount,
        statusData,
        userGrowthData,
        loading,
        error,
        refresh: fetchData,
      }}
    >
      {children}
    </AccountsContext.Provider>
  );
}

// ─── Consumer hook ────────────────────────────────────────────────────────────
export function useAccounts(): AccountsContextValue {
  const ctx = useContext(AccountsContext);
  if (!ctx) {
    throw new Error("useAccounts must be used inside <AccountsProvider>");
  }
  return ctx;
}
