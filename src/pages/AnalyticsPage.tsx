import { useState, useMemo } from "react";
import {
  Users,
  Activity,
  Clock,
  TrendingUp,
  Download,
  GraduationCap,
  BookOpen,
  Layers,
  FileQuestion,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import KPICard from "@/components/KPICard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/context/AuthContext";
import { useAccounts } from "@/components/auth/context/Accountcontext";
import { apiClient } from "@/services/api/client";
import { useQuery } from "@tanstack/react-query";

// ─── Colors ────────────────────────────────────────────────────────────────────

const COLORS = {
  primary: "hsl(224,76%,33%)",
  secondary: "hsl(173,58%,39%)",
  accent: "hsl(24,95%,53%)",
  warning: "hsl(38,92%,50%)",
  danger: "hsl(0,84%,60%)",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const unwrap = <T,>(payload: unknown): T => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const AnalyticsPage = () => {
  const { toast } = useToast();
  const { token } = useAuth();
  const { totalUsers: totalStudents, loading: studentsLoading } = useAccounts();
  const [activeTab, setActiveTab] = useState("users");

  // ── Overview ────────────────────────────────────────────────────────────────

  const { data: overview } = useQuery({
    queryKey: ["analytics-overview"],
    queryFn: () =>
      apiClient.get<any>("/analytics/overview").then((res) => unwrap<any>(res)),
    enabled: !!token,
    staleTime: 60_000,
  });

  const { data: dau } = useQuery({
    queryKey: ["analytics-dau"],
    queryFn: () =>
      apiClient
        .get<any>("/analytics/daily-active-users")
        .then((res) => unwrap<any>(res)),
    enabled: !!token,
    staleTime: 60_000,
  });

  const { data: mau } = useQuery({
    queryKey: ["analytics-mau"],
    queryFn: () =>
      apiClient
        .get<any>("/analytics/monthly-active-users")
        .then((res) => unwrap<any>(res)),
    enabled: !!token,
    staleTime: 60_000,
  });

  // ── Users Tab ─────────────────────────────────────────────────────────────────

  const { data: packageData } = useQuery({
    queryKey: ["analytics-packages"],
    queryFn: () =>
      apiClient
        .get<any>("/analytics/users-by-package")
        .then((res) => unwrap<any>(res)),
    enabled: !!token,
    staleTime: 60_000,
  });

  const { data: regTrend } = useQuery({
    queryKey: ["analytics-reg-trend"],
    queryFn: () =>
      apiClient
        .get<any>("/analytics/registration-trend")
        .then((res) => unwrap<any>(res)),
    enabled: !!token,
    staleTime: 60_000,
  });

  const { data: peakHours } = useQuery({
    queryKey: ["analytics-peak-hours"],
    queryFn: () =>
      apiClient
        .get<any>("/analytics/peak-hours")
        .then((res) => unwrap<any>(res)),
    enabled: !!token,
    staleTime: 60_000,
  });

  const { data: studyTime } = useQuery({
    queryKey: ["analytics-study-time"],
    queryFn: () =>
      apiClient
        .get<any>("/analytics/average-study-time")
        .then((res) => unwrap<any>(res)),
    enabled: !!token,
    staleTime: 60_000,
  });

  // ── Learning Tab ──────────────────────────────────────────────────────────────

  const { data: passFailData } = useQuery({
    queryKey: ["analytics-pass-fail"],
    queryFn: () =>
      apiClient
        .get<any>("/analytics/pass-fail-ratio")
        .then((res) => unwrap<any>(res)),
    enabled: !!token,
    staleTime: 60_000,
  });

  const { data: dropOffData } = useQuery({
    queryKey: ["analytics-drop-off"],
    queryFn: () =>
      apiClient
        .get<any>("/analytics/drop-off-points")
        .then((res) => unwrap<any>(res)),
    enabled: !!token,
    staleTime: 60_000,
  });

  const { data: coverageData } = useQuery({
    queryKey: ["analytics-coverage"],
    queryFn: () =>
      apiClient
        .get<any>("/analytics/content-coverage")
        .then((res) => unwrap<any>(res)),
    enabled: !!token,
    staleTime: 60_000,
  });

  // ── Content Tab ───────────────────────────────────────────────────────────────

  const { data: difficultyData } = useQuery({
    queryKey: ["analytics-difficulty"],
    queryFn: () =>
      apiClient
        .get<any>("/analytics/question-difficulty-stats")
        .then((res) => unwrap<any>(res)),
    enabled: !!token,
    staleTime: 60_000,
  });

  // ── Reports Tab (Lazy loaded) ─────────────────────────────────────────────────

  const { data: flagsData, isLoading: flagsLoading } = useQuery({
    queryKey: ["analytics-flags"],
    queryFn: () =>
      apiClient
        .get<any>("/questions/flags?limit=50")
        .then((res) => {
          // Normalize: could be { data: [...] } or array directly
          const arr = res?.data ?? res;
          return Array.isArray(arr) ? arr : [];
        }),
    enabled: !!token && activeTab === "reports",
    staleTime: 30_000,
  });

  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ["analytics-reports"],
    queryFn: () =>
      apiClient.get<any>("/reports?limit=50").then((res) => {
        // Normalize: { data: [...], total } → extract the array
        const arr = res?.data ?? res;
        return Array.isArray(arr) ? arr : [];
      }),
    enabled: !!token,
    staleTime: 30_000,
  });

  // ── Radar — uses single batch endpoint, no per-subject calls ───────────────

  const { data: radarPayload, isLoading: radarLoading } = useQuery({
    queryKey: ["analytics-radar"],
    queryFn: async () => {
      // 3 requests total instead of N+2
      const [streamsRaw, subjectsRaw, allProgressRaw] = await Promise.all([
        apiClient.get<any>("/streams"),
        apiClient.get<any>("/subjects"),
        apiClient.get<any>("/progress/subjects/all"),
      ]);

      const streams: { id: string; name: string }[] = Array.isArray(streamsRaw)
        ? streamsRaw
        : (streamsRaw?.data ?? []);

      const subjects: { id: string; name: string; streamId: string | null }[] =
        Array.isArray(subjectsRaw) ? subjectsRaw : (subjectsRaw?.data ?? []);

      const allProgress: { subjectId: string; accuracy: number }[] =
        Array.isArray(allProgressRaw) ? allProgressRaw : (allProgressRaw?.data ?? []);

      // Build accuracy map from the single batch response
      const accuracyMap = new Map<string, number>(
        allProgress.map((r) => [r.subjectId, r.accuracy]),
      );

      const subjectNames = [...new Set(subjects.map((s) => s.name))];

      const radarData = subjectNames.map((name) => {
        const entry: Record<string, string | number> = { subject: name };
        for (const stream of streams) {
          const match = subjects.find(
            (s) => s.name === name && s.streamId === stream.id,
          );
          entry[stream.name] = match ? (accuracyMap.get(match.id) ?? 0) : 0;
        }
        return entry;
      });

      return { radarData, streams };
    },
    enabled: !!token,
    staleTime: 120_000,
  });

  // ── Derived Values ───────────────────────────────────────────────────────────

  const packagePieData = useMemo(() => {
    if (!packageData) return [];
    const premium = Number(packageData.premium ?? 0);
    const free = Number(packageData.free ?? 0);
    if (premium === 0 && free === 0) return [];
    return [
      { name: "Premium", value: premium, color: COLORS.accent },
      { name: "Free", value: free, color: COLORS.primary },
    ];
  }, [packageData]);

  // Pass / Fail Ratio calculation
  const passFailSummary = useMemo(() => {
    if (!passFailData) {
      return { passed: 0, failed: 0, total: 0, passRate: 0, hasData: false };
    }
    const passed = Number(passFailData.passed ?? 0);
    const failed = Number(passFailData.failed ?? 0);
    const total = Number(passFailData.total ?? passed + failed);
    const passRate =
      total > 0
        ? Number(passFailData.passRate ?? ((passed / total) * 100).toFixed(1))
        : 0;
    return {
      passed,
      failed,
      total,
      passRate,
      hasData: total > 0,
    };
  }, [passFailData]);

  const passFailPieData = useMemo(() => {
    if (!passFailSummary.hasData) return [];
    const slices = [];
    if (passFailSummary.passed > 0) {
      slices.push({
        name: "Pass",
        value: passFailSummary.passed,
        color: "#10b981",
      });
    }
    if (passFailSummary.failed > 0) {
      slices.push({
        name: "Fail",
        value: passFailSummary.failed,
        color: "#ef4444",
      });
    }
    return slices;
  }, [passFailSummary]);

  // Drop-off points calculation
  const dropOffRows = useMemo(() => {
    const raw = Array.isArray(dropOffData)
      ? dropOffData
      : Array.isArray(dropOffData?.data)
      ? dropOffData.data
      : [];

    return raw.map((row: any, i: number) => {
      const subjectName =
        row.subjectName ?? row.label ?? row.name ?? `Subject ${i + 1}`;
      const uniqueUsers = Number(row.uniqueUsers ?? 0);
      const totalAttempts = Number(row.totalAttempts ?? 0);
      const avgAttemptsPerUser = Number(
        row.avgAttemptsPerUser ??
          (uniqueUsers > 0 ? (totalAttempts / uniqueUsers).toFixed(1) : 0),
      );
      const isDropOff =
        row.isDropOff !== undefined
          ? Boolean(row.isDropOff)
          : avgAttemptsPerUser < 5 && uniqueUsers > 0;

      const benchmark = 10;
      const engagementPercent = Math.min(
        100,
        Math.round((avgAttemptsPerUser / benchmark) * 100),
      );
      const dropRate =
        row.dropRate ??
        (isDropOff
          ? Math.max(25, 100 - engagementPercent)
          : Math.max(5, 100 - engagementPercent));

      return {
        subjectName,
        uniqueUsers,
        totalAttempts,
        avgAttemptsPerUser,
        isDropOff,
        engagementPercent,
        dropRate,
      };
    });
  }, [dropOffData]);

  // Content coverage calculation
  const coverageRows = useMemo(() => {
    const raw = Array.isArray(coverageData)
      ? coverageData
      : Array.isArray(coverageData?.data)
      ? coverageData.data
      : [];

    return raw.map((c: any) => {
      let streamName = c.streamName ?? c.subject ?? c.name ?? "General";
      if (
        streamName.toLowerCase() === "unassigned" ||
        c.streamId === "unassigned"
      ) {
        streamName = "Common Curriculum";
      }
      return {
        streamName,
        coveragePercent: Number(c.coveragePercent ?? c.coverage ?? 0),
        totalSubjects: Number(c.totalSubjects ?? 0),
        attemptedSubjects: Number(c.attemptedSubjects ?? 0),
      };
    });
  }, [coverageData]);

  // Question difficulty stats calculation — guarantee Easy, Medium, Hard are sorted and present
  const difficultyRows = useMemo(() => {
    const raw = Array.isArray(difficultyData)
      ? difficultyData
      : Array.isArray(difficultyData?.data)
      ? difficultyData.data
      : [];

    const order = ["Easy", "Medium", "Hard"];
    const tierMap = new Map<string, { attempts: number; correct: number; accuracy: number }>();
    order.forEach((t) => tierMap.set(t, { attempts: 0, correct: 0, accuracy: 0 }));

    raw.forEach((d: any) => {
      const rawDiff = String(d.difficulty ?? d.level ?? "medium").toLowerCase();
      const label = rawDiff.charAt(0).toUpperCase() + rawDiff.slice(1);
      const attempts = Number(d.attempts ?? d.count ?? 0);
      const correct = Number(d.correct ?? 0);
      const accuracy = Number(
        d.accuracy ?? (attempts > 0 ? ((correct / attempts) * 100).toFixed(1) : 0),
      );
      tierMap.set(label, { attempts, correct, accuracy });
    });

    return Array.from(tierMap.entries()).map(([difficulty, stats]) => ({
      difficulty,
      ...stats,
    }));
  }, [difficultyData]);

  const difficultyHasData = useMemo(() => {
    return difficultyRows.some((r) => r.attempts > 0);
  }, [difficultyRows]);

  // Registration trend calculation — handles unwrap array or { data: [...] } envelope
  const regTrendRows = useMemo(() => {
    const raw = Array.isArray(regTrend)
      ? regTrend
      : Array.isArray(regTrend?.data)
      ? regTrend.data
      : [];

    return raw.map((r: any) => {
      let formattedDate = r.date;
      if (r.date) {
        try {
          const d = new Date(r.date);
          formattedDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        } catch {
          formattedDate = String(r.date).slice(0, 10);
        }
      }
      return {
        date: formattedDate,
        rawDate: r.date,
        count: Number(r.count ?? 0),
      };
    });
  }, [regTrend]);

  const peakHoursRows: any[] = peakHours?.hours ?? [];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold">Analytics</h2>

        <Button
          variant="outline"
          onClick={() =>
            toast({ title: "Export", description: "Coming soon." })
          }
        >
          <Download className="h-4 w-4 mr-1" />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Students"
          value={studentsLoading ? "—" : totalStudents}
          icon={Users}
        />
        <KPICard
          title="DAU"
          value={dau?.average ?? "—"}
          icon={Activity}
          iconColor="text-secondary"
        />
        <KPICard
          title="MAU"
          value={mau?.average ?? "—"}
          icon={TrendingUp}
          iconColor="text-accent"
        />
        <KPICard
          title="Avg Study Time"
          value={studyTime ? `${studyTime.averageHours}h` : "—"}
          icon={Clock}
          iconColor="text-warning"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="learning">Learning</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* ── Users ── */}
        <TabsContent value="users" className="mt-4 space-y-6">
          {/* Registration Trend */}
          <div className="bg-card rounded-lg border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">Registration Trend</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  New student signups over the last 30 days
                </p>
              </div>
              {regTrendRows.length > 0 && (
                <Badge variant="outline" className="font-mono text-xs">
                  {regTrendRows.reduce((sum, r) => sum + r.count, 0)} Total
                </Badge>
              )}
            </div>

            {regTrendRows.length === 0 ? (
              <div className="h-[220px] flex flex-col items-center justify-center text-muted-foreground text-sm">
                <Users className="h-8 w-8 mb-2 opacity-30 text-primary" />
                <p className="font-medium text-foreground">No Registration Trend Data</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  New student signups will appear here over time.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={regTrendRows} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(v: any) => [`${v} student${v !== 1 ? "s" : ""}`, "Registered"]}
                    labelFormatter={(label: any) => `Date: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={COLORS.primary}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: COLORS.primary }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Package split + Peak hours */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card rounded-lg border p-6 shadow-sm">
              <h3 className="font-semibold mb-4">Users by Package</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={packagePieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {packagePieData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={
                          i === 0 ? COLORS.primary : COLORS.secondary
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-lg border p-6 shadow-sm">
              <h3 className="font-semibold mb-4">Peak Hours</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={peakHoursRows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="sessions" fill={COLORS.accent} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {/* ── Learning ── */}
        <TabsContent value="learning" className="mt-4 space-y-6">
          {/* Pass / Fail & Drop-off Points */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pass / Fail */}
            <div className="bg-card rounded-xl border p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">Pass / Fail Ratio</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sessions with ≥50% accuracy considered passing
                  </p>
                </div>
                {passFailSummary.hasData && (
                  <Badge
                    variant="outline"
                    className={
                      passFailSummary.passRate >= 50
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-semibold"
                    }
                  >
                    {passFailSummary.passRate}% Pass Rate
                  </Badge>
                )}
              </div>

              {!passFailSummary.hasData ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-center">
                  <GraduationCap className="h-10 w-10 mb-2.5 opacity-30 text-primary" />
                  <p className="text-sm font-medium text-foreground">No Exam Attempts Recorded</p>
                  <p className="text-xs text-muted-foreground max-w-xs mt-1">
                    Pass/fail metrics will automatically calculate as students take practice sessions and mock exams.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={190}>
                    <PieChart>
                      <Pie
                        data={passFailPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={passFailPieData.length > 1 ? 4 : 0}
                      >
                        {passFailPieData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={entry.color}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any, name: any) => {
                          const v = Number(val) || 0;
                          const pct =
                            passFailSummary.total > 0
                              ? ((v / passFailSummary.total) * 100).toFixed(1)
                              : 0;
                          return [`${v} sessions (${pct}%)`, name];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Summary Breakdown */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t text-xs">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-muted-foreground">Passed</p>
                        <p className="font-bold text-foreground">
                          {passFailSummary.passed}{" "}
                          <span className="text-[11px] font-normal text-muted-foreground">
                            ({passFailSummary.passRate}%)
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/5 border border-rose-500/10">
                      <div className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-muted-foreground">Failed</p>
                        <p className="font-bold text-foreground">
                          {passFailSummary.failed}{" "}
                          <span className="text-[11px] font-normal text-muted-foreground">
                            ({(100 - passFailSummary.passRate).toFixed(1)}%)
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-center text-muted-foreground">
                    Based on {passFailSummary.total} completed session{passFailSummary.total !== 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </div>

            {/* Drop-off Points */}
            <div className="bg-card rounded-xl border p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">Subject Drop-off & Retention</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Subjects flagged when student engagement drops below 5 attempts
                  </p>
                </div>
              </div>

              {dropOffRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-center">
                  <BookOpen className="h-10 w-10 mb-2.5 opacity-30 text-primary" />
                  <p className="text-sm font-medium text-foreground">No Engagement Data</p>
                  <p className="text-xs text-muted-foreground max-w-xs mt-1">
                    Student subject attempts and drop-off rates will appear as users practice.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                  {dropOffRows.map((row, i) => (
                    <div key={i} className="p-3 rounded-lg border bg-muted/20 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium text-sm truncate text-foreground">
                            {row.subjectName}
                          </span>
                        </div>
                        {row.isDropOff ? (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0 font-medium">
                            High Drop-off
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/20 font-medium">
                            Active Retention
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          <strong className="text-foreground font-semibold">{row.avgAttemptsPerUser}</strong> avg attempts / student
                        </span>
                        <span>
                          {row.totalAttempts} attempts ({row.uniqueUsers} student{row.uniqueUsers !== 1 ? "s" : ""})
                        </span>
                      </div>

                      <div className="space-y-1">
                        <Progress
                          value={Math.min(100, Math.max(10, row.engagementPercent))}
                          className={row.isDropOff ? "[&>div]:bg-rose-500" : "[&>div]:bg-emerald-500"}
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Engagement Score</span>
                          <span>{row.engagementPercent}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Content Coverage */}
          <div className="bg-card rounded-xl border p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-semibold text-foreground">Curriculum Content Coverage</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Percentage of curriculum subjects actively attempted by students across educational streams
                </p>
              </div>
            </div>

            {coverageRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-center">
                <Layers className="h-10 w-10 mb-2.5 opacity-30 text-primary" />
                <p className="text-sm font-medium text-foreground">No Coverage Data</p>
                <p className="text-xs text-muted-foreground max-w-xs mt-1">
                  Content coverage across curriculum streams will calculate as questions are attempted.
                </p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={coverageRows} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                    <YAxis
                      dataKey="streamName"
                      type="category"
                      width={140}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(v: any, _name: any, entry: any) => [
                        `${v}% coverage (${entry.payload.attemptedSubjects} of ${entry.payload.totalSubjects} subjects attempted)`,
                        "Coverage",
                      ]}
                    />
                    <Bar dataKey="coveragePercent" fill={COLORS.primary} radius={[0, 4, 4, 0]}>
                      {coverageRows.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={entry.coveragePercent > 0 ? COLORS.primary : "#94a3b8"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Stream Breakdown Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {coverageRows.map((stream, i) => (
                    <div key={i} className="p-3 rounded-lg border bg-muted/20 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-foreground truncate">{stream.streamName}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {stream.coveragePercent}%
                        </Badge>
                      </div>
                      <Progress value={stream.coveragePercent} className="h-1.5" />
                      <p className="text-[11px] text-muted-foreground">
                        {stream.attemptedSubjects} of {stream.totalSubjects} subjects practiced
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Radar */}
          {!radarLoading && radarPayload && (
            <div className="bg-card rounded-lg border p-6 shadow-sm">
              <h3 className="font-semibold mb-4">Accuracy by Subject & Stream</h3>
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={radarPayload.radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  {radarPayload.streams.map((stream, i) => (
                    <Radar
                      key={stream.id}
                      name={stream.name}
                      dataKey={stream.name}
                      stroke={Object.values(COLORS)[i % 5]}
                      fill={Object.values(COLORS)[i % 5]}
                      fillOpacity={0.25}
                    />
                  ))}
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </TabsContent>

        {/* ── Content ── */}
        <TabsContent value="content" className="mt-4">
          <div className="bg-card rounded-xl border p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-semibold text-foreground">Question Difficulty Distribution & Performance</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Total student attempts and accuracy breakdown across difficulty tiers
                </p>
              </div>
            </div>

            {!difficultyHasData ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-center">
                <FileQuestion className="h-10 w-10 mb-2.5 opacity-30 text-primary" />
                <p className="text-sm font-medium text-foreground">No Question Attempts Recorded</p>
                <p className="text-xs text-muted-foreground max-w-xs mt-1">
                  Difficulty statistics will populate as students answer questions across subjects.
                </p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={difficultyRows} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="difficulty" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(v: any, name: any, entry: any) => {
                        if (name === "attempts")
                          return [
                            `${v} attempt${v !== 1 ? "s" : ""} (${entry.payload.accuracy}% accuracy, ${entry.payload.correct} correct)`,
                            "Attempts",
                          ];
                        return [v, name];
                      }}
                    />
                    <Bar dataKey="attempts" fill={COLORS.warning} radius={[4, 4, 0, 0]}>
                      {difficultyRows.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={
                            entry.difficulty.toLowerCase() === "easy"
                              ? "#10b981"
                              : entry.difficulty.toLowerCase() === "medium"
                              ? "#f59e0b"
                              : "#ef4444"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {difficultyRows.map((diff, i) => (
                    <div key={i} className="p-3 rounded-lg border bg-muted/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-foreground">
                          {diff.difficulty}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            diff.attempts > 0
                              ? diff.accuracy >= 50
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
                                : "bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px]"
                              : "text-[10px] text-muted-foreground"
                          }
                        >
                          {diff.attempts > 0 ? `${diff.accuracy}% Accuracy` : "0% Accuracy"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        {diff.attempts} attempt{diff.attempts !== 1 ? "s" : ""} ({diff.correct} correct)
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* ── Reports ── */}
        <TabsContent value="reports" className="mt-4 space-y-6">
          {/* Flags */}
          <div className="bg-card rounded-lg border p-6 shadow-sm">
            <h3 className="font-semibold mb-4">Flagged Questions</h3>
            {flagsLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !flagsData || (Array.isArray(flagsData) && flagsData.length === 0) ? (
              <p className="text-sm text-muted-foreground">No flags found.</p>
            ) : (
              <div className="divide-y">
                {(Array.isArray(flagsData) ? flagsData : []).map(
                  (flag: any, i: number) => (
                    <div key={i} className="py-3 flex items-start justify-between gap-4">
                      <div className="text-sm">
                        <p className="font-medium">{flag.question ?? flag.title ?? "—"}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          {flag.reason ?? "No reason provided"}
                        </p>
                      </div>
                      <Badge variant="destructive" className="shrink-0">
                        Flag
                      </Badge>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>

          {/* Reports */}
          <div className="bg-card rounded-lg border p-6 shadow-sm">
            <h3 className="font-semibold mb-4">User Reports</h3>
            {reportsLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !reportsData ||
              (Array.isArray(reportsData) && reportsData.length === 0) ? (
              <p className="text-sm text-muted-foreground">No reports found.</p>
            ) : (
              <div className="divide-y">
                {(Array.isArray(reportsData) ? reportsData : []).map(
                  (report: any, i: number) => (
                    <div key={i} className="py-3 flex items-start justify-between gap-4">
                      <div className="text-sm">
                        <p className="font-medium">
                          {report.subject ?? report.title ?? "—"}
                        </p>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          {report.description ?? report.body ?? "No description"}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        Report
                      </Badge>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsPage;
