import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  Users,
  UserCheck,
  UserPlus,
  UserX,
  Crown,
  Loader2,
  FileQuestion,
  BookOpen,
  Flag,
  BellRing,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import KPICard from "@/components/KPICard";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { useAccounts } from "@/components/auth/context/Accountcontext";
import { useGradeStats } from "@/hooks/Usegradestats";
import { useIsMobile } from "@/hooks/use-mobile";

// Modern SaaS chart palette
const PALETTE = {
  primary: "#2563eb",   // Royal Blue
  secondary: "#06b6d4", // Cyan
  accent: "#8b5cf6",    // Violet
  warning: "#f59e0b",   // Amber
  muted: "#94a3b8",     // Slate
};

const PIE_COLORS = ["#2563eb", "#f59e0b", "#10b981", "#8b5cf6"];

// All 12 months abbreviated
const ALL_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DashboardPage = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const {
    totalUsers,
    statusData,
    students,
    loading: accountsLoading,
  } = useAccounts();

  const { questionsByGrade, loading: gradeStatsLoading } = useGradeStats();

  // ── Real Subscription / Users by Package data from backend ──
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const {
    data: packageData,
    isLoading: packageLoading,
    isError: packageError,
    error: packageErrorDetails,
    refetch: refetchPackage,
  } = useQuery<{
    premium?: number;
    free?: number;
    total?: number;
  }>({
    queryKey: ["analytics-users-by-package-dashboard"],
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<any>("/analytics/users-by-package", signal);
      setLastUpdated(new Date());
      return res?.data ?? res ?? {};
    },
    staleTime: 60_000,
  });

  const subscriptionData = useMemo(() => {
    if (packageData && (packageData.free !== undefined || packageData.premium !== undefined)) {
      const free = Number(packageData.free) || 0;
      const premium = Number(packageData.premium) || 0;
      return [
        { name: "Free", value: free, color: "#2563eb" },
        { name: "Premium", value: premium, color: "#f59e0b" },
      ];
    }

    const premiumCount = students.filter((s) => s.isPremium || s.status === "premium").length;
    const freeCount = Math.max(0, students.length - premiumCount);
    return [
      { name: "Free", value: freeCount, color: "#2563eb" },
      { name: "Premium", value: premiumCount, color: "#f59e0b" },
    ];
  }, [packageData, students]);

  const totalSubscribers = subscriptionData.reduce((acc, curr) => acc + curr.value, 0);

  const today = new Date();
  const activeStudentsCount    = students.filter((s) => s.isActive).length;
  const suspendedStudentsCount = students.filter((s) => !s.isActive).length;
  const premiumStudentsCount   = students.filter((s) => s.isPremium || s.status === "premium").length;
  const todayRegisteredCount   = students.filter((s) => {
    const d = new Date(s.createdAt ?? s.joinedAt);
    return d.toDateString() === today.toDateString();
  }).length;
  const premiumCountDisplay = packageData?.premium !== undefined ? packageData.premium : premiumStudentsCount;

  // ── Monthly gender chart — all 12 months of current year, all students ──
  const monthlyGenderData = (() => {
    const now = new Date();
    const year = now.getFullYear();

    const buckets = ALL_MONTHS.map((mon, idx) => ({
      month:  mon,
      monthIndex: idx,
      male:   0,
      female: 0,
    }));

    if (students.length === 0) return buckets;

    const getDate = (s: typeof students[0]): Date | null => {
      for (const raw of [s.joinedAt, s.createdAt]) {
        if (!raw) continue;
        const d = new Date(raw);
        if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return d;
      }
      return null;
    };

    students.forEach((s) => {
      const d = getDate(s);
      if (!d) return;
      if (d.getFullYear() !== year) return;
      const bucket = buckets[d.getMonth()];
      if (!bucket) return;
      const g = (s.gender ?? "").toLowerCase().trim();
      if (g === "female" || g === "f") bucket.female += 1;
      else                              bucket.male   += 1;
    });

    return buckets;
  })();

  return (
    <div className="space-y-6">

      {/* ── Top Welcome & Quick Actions Ribbon ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-border/70 bg-gradient-to-r from-card via-card to-primary/5 p-5 sm:p-6 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Platform Overview
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time analytics for Scorenova Ethiopian National Examination platform.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background/60 border text-[11px] text-muted-foreground mr-1">
            <span>Updated:</span>
            <span className="font-medium text-foreground">
              {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 text-xs shadow-xs"
            disabled={packageLoading}
            onClick={() => refetchPackage()}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", packageLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 text-xs shadow-xs"
            onClick={() => navigate("/questions/new")}
          >
            <FileQuestion className="h-3.5 w-3.5 text-primary" />
            Add Question
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 text-xs shadow-xs"
            onClick={() => navigate("/mock-exams")}
          >
            <BookOpen className="h-3.5 w-3.5 text-secondary" />
            Mock Exams
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 text-xs shadow-xs"
            onClick={() => navigate("/flagged-questions")}
          >
            <Flag className="h-3.5 w-3.5 text-amber-500" />
            Flagged Triage
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 text-xs shadow-xs"
            onClick={() => navigate("/notification-test")}
          >
            <BellRing className="h-3.5 w-3.5" />
            Push Alert
          </Button>
        </div>
      </div>

      {packageError && (
        <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Failed to sync subscription metrics with backend: {(packageErrorDetails as any)?.message ?? "Connection timeout"}.</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs border-destructive/30 hover:bg-destructive/20"
            onClick={() => refetchPackage()}
          >
            Try Again
          </Button>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard
          title="Total Students"
          value={accountsLoading ? "—" : totalUsers}
          icon={Users}
          iconColor="text-primary"
          badge="Enrolled"
        />
        <KPICard
          title="Active Students"
          value={accountsLoading ? "—" : activeStudentsCount}
          icon={UserCheck}
          iconColor="text-emerald-500"
          badge="Healthy"
        />
        <KPICard
          title="Premium Members"
          value={packageLoading && accountsLoading ? "—" : premiumCountDisplay}
          icon={Crown}
          iconColor="text-amber-500"
          badge="Subscribed"
        />
        <KPICard
          title="New Today"
          value={accountsLoading ? "—" : todayRegisteredCount}
          icon={UserPlus}
          iconColor="text-cyan-500"
          badge="24h"
        />
      </div>

      {/* ── Student Growth + Pie ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="min-w-0 rounded-2xl border border-border/70 bg-card p-5 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                Student Registrations by Gender
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Monthly breakdown for the current academic year
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600 inline-block" /> Male
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-500 inline-block" /> Female
              </span>
            </div>
          </div>

          {accountsLoading ? (
            <div className="flex h-[260px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={isMobile ? 240 : 280}>
              <BarChart data={monthlyGenderData} margin={{ top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: isMobile ? 10 : 12, fill: "#64748b" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    fontSize: "12px",
                  }}
                  formatter={(value, name) => [value, name]}
                  labelFormatter={(label) => {
                    const entry = monthlyGenderData.find((d) => d.month === label);
                    const total = entry ? entry.male + entry.female : 0;
                    return `${label}  (Total: ${total})`;
                  }}
                />
                <Bar dataKey="male" fill={PALETTE.primary} radius={[4, 4, 0, 0]} name="Male" />
                <Bar dataKey="female" fill={PALETTE.secondary} radius={[4, 4, 0, 0]} name="Female" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="min-w-0 rounded-2xl border border-border/70 bg-card p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-sm sm:text-base text-foreground">
              Subscription Status
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Breakdown of free vs premium accounts
            </p>
          </div>

          {accountsLoading || packageLoading ? (
            <div className="flex h-[260px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="h-[210px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={subscriptionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={90}
                      paddingAngle={subscriptionData.filter((d) => d.value > 0).length > 1 ? 4 : 0}
                      dataKey="value"
                    >
                      {subscriptionData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: any) => [
                        `${Number(val)} accounts (${totalSubscribers > 0 ? ((Number(val) / totalSubscribers) * 100).toFixed(1) : 0}%)`,
                        name,
                      ]}
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "none",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center metric inside donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold tracking-tight text-foreground">
                    {totalSubscribers}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Total Enrolled
                  </span>
                </div>
              </div>

              {/* Clean Legend with explicit spacing and metrics */}
              <div className="flex items-center justify-center gap-6 pt-3 border-t border-border/50 w-full mt-2">
                {subscriptionData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex items-baseline gap-1.5 text-xs">
                      <span className="font-semibold text-foreground">{item.name}</span>
                      <span className="text-muted-foreground font-mono text-[11px]">
                        {item.value} ({totalSubscribers > 0 ? Math.round((item.value / totalSubscribers) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Questions by Stream ── */}
      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs space-y-4">
        <div>
          <h3 className="font-semibold text-sm sm:text-base text-foreground">
            Curriculum Question Coverage by Stream
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total active national exam questions available per curriculum stream
          </p>
        </div>

        {gradeStatsLoading ? (
          <div className="flex h-[200px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={questionsByGrade} margin={{ top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="grade"
                tick={{ fontSize: isMobile ? 11 : 12, fill: "#64748b" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#64748b" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="questions" fill={PALETTE.primary} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  );
};

export default DashboardPage;
