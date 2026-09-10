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
} from "lucide-react";
import KPICard from "@/components/KPICard";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
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
  Legend,
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

  const today = new Date();
  const activeStudentsCount    = students.filter((s) => s.isActive).length;
  const suspendedStudentsCount = students.filter((s) => !s.isActive).length;
  const premiumStudentsCount   = students.filter((s) => s.isPremium || s.status === "premium").length;
  const todayRegisteredCount   = students.filter((s) => {
    const d = new Date(s.createdAt ?? s.joinedAt);
    return d.toDateString() === today.toDateString();
  }).length;

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
            className="h-9 gap-1.5 text-xs shadow-xs"
            onClick={() => navigate("/notification-test")}
          >
            <BellRing className="h-3.5 w-3.5" />
            Push Alert
          </Button>
        </div>
      </div>

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
          value={accountsLoading ? "—" : premiumStudentsCount}
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

        <div className="min-w-0 rounded-2xl border border-border/70 bg-card p-5 shadow-xs space-y-4">
          <div>
            <h3 className="font-semibold text-sm sm:text-base text-foreground">
              Subscription Status
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Breakdown of free vs premium accounts
            </p>
          </div>

          {accountsLoading || statusData.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={isMobile ? 240 : 280}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span className="text-xs text-foreground font-medium">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
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
