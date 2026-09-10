import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { apiClient } from "@/services/api/client";

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
  const premiumCount = students.filter(
    (u) => Boolean(u.isPremium) || (u.status as string) === "premium"
  ).length;
  const freeCount = Math.max(0, students.length - premiumCount);
  return [
    { name: "Free", value: freeCount },
    { name: "Premium", value: premiumCount },
  ];
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AccountsProvider({ children }: { children: ReactNode }) {
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [serverDate, setServerDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchAtRef = useRef<number>(0);
  const inflightRef = useRef<Promise<void> | null>(null);

  const fetchData = useCallback(async () => {
    const now = Date.now();
    if (inflightRef.current) {
      return inflightRef.current;
    }

    if (now - lastFetchAtRef.current < 30_000) {
      return;
    }

    setLoading(true);
    setError(null);

    const promise = (async () => {
      try {
        const token = localStorage.getItem("token");

        // If there's no token, avoid calling protected endpoints and surface a clear error
        if (!token) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }

        const [dateText, accountsJson] = await Promise.all([
          apiClient.get<string>("/get-date", undefined, { retries: 0 }),
          apiClient.get<{ data?: Account[] }>("/accounts/get-accounts", undefined, { retries: 0 }),
        ]);

        // Server date — non-critical, fall back to local date if it fails
        try {
          const normalizedDate = typeof dateText === "string" ? dateText : String(dateText ?? "");
          setServerDate(new Date(normalizedDate.replace(/"/g, "")));
        } catch {
          setServerDate(new Date());
        }

        const data: Account[] = accountsJson?.data ?? [];
        setAllAccounts(data);
        lastFetchAtRef.current = Date.now();
      } catch (err) {
        setError("Failed to load accounts data.");
        // Never rethrow — a fetch failure must NEVER crash the layout
      } finally {
        setLoading(false);
        inflightRef.current = null;
      }
    })();

    inflightRef.current = promise;
    return promise;
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
