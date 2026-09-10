import { useState } from "react";
import {
  Users,
  Activity,
  Clock,
  TrendingUp,
  Download,
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

  // ── Users Tab (Lazy loaded) ───────────────────────────────────────────────────

  const { data: packageData } = useQuery({
    queryKey: ["analytics-packages"],
    queryFn: () =>
      apiClient
        .get<any>("/analytics/users-by-package")
        .then((res) => unwrap<any>(res)),
    enabled: !!token && activeTab === "users",
    staleTime: 60_000,
  });

  const { data: regTrend } = useQuery({
    queryKey: ["analytics-reg-trend"],
    queryFn: () =>
      apiClient
        .get<any>("/analytics/registration-trend")
        .then((res) => unwrap<any>(res)),
    enabled: !!token && activeTab === "users",
    staleTime: 60_000,
  });

  const { data: peakHours } = useQuery({
    queryKey: ["analytics-peak-hours"],
    queryFn: () =>
      apiClient
        .get<any>("/analytics/peak-hours")
        .then((res) => unwrap<any>(res)),
    enabled: !!token && activeTab === "users",
    staleTime: 60_000,
  });

  const { data: studyTime } = useQuery({
    queryKey: ["analytics-study-time"],
    queryFn: () =>
      apiClient
        .get<any>("/analytics/average-study-time")
        .then((res) => unwrap<any>(res)),
    enabled: !!token && (activeTab === "users" || activeTab === "learning"),
    staleTime: 60_000,
  });

  // ── Learning Tab (Lazy loaded) ────────────────────────────────────────────────

  const { data: passFailData } = useQuery({
    queryKey: ["analytics-pass-fail"],
    queryFn: () =>
      apiClient
        .get<any>("/analytics/pass-fail-ratio")
        .then((res) => unwrap<any>(res)),
    enabled: !!token && activeTab === "learning",
    staleTime: 60_000,
  });

  const { data: dropOffData } = useQuery({
    queryKey: ["analytics-drop-off"],
    queryFn: () =>
      apiClient
        .get<any>("/analytics/drop-off-points")
        .then((res) => unwrap<any>(res)),
    enabled: !!token && activeTab === "learning",
    staleTime: 60_000,
  });

  const { data: coverageData } = useQuery({
    queryKey: ["analytics-coverage"],
    queryFn: () =>
      apiClient
        .get<any>("/analytics/content-coverage")
        .then((res) => unwrap<any>(res)),
    enabled: !!token && (activeTab === "learning" || activeTab === "content"),
    staleTime: 60_000,
  });

  // ── Content Tab (Lazy loaded) ─────────────────────────────────────────────────

  const { data: difficultyData } = useQuery({
    queryKey: ["analytics-difficulty"],
    queryFn: () =>
      apiClient
        .get<any>("/analytics/question-difficulty-stats")
        .then((res) => unwrap<any>(res)),
    enabled: !!token && activeTab === "content",
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

  const packagePieData = packageData
    ? [
        { name: "Premium", value: packageData.premium ?? 0 },
        { name: "Free", value: packageData.free ?? 0 },
      ]
    : [];

  const passFailPieData = passFailData
    ? [
        { name: "Pass", value: passFailData.passed ?? 0 },
        { name: "Fail", value: passFailData.failed ?? 0 },
      ]
    : [];

  const dropOffRows: any[] = Array.isArray(dropOffData) ? dropOffData : [];
  const coverageRows: any[] = Array.isArray(coverageData) ? coverageData : [];
  const difficultyRows: any[] = Array.isArray(difficultyData)
    ? difficultyData
    : [];
  const regTrendRows: any[] = regTrend?.data ?? [];
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
            <h3 className="font-semibold mb-4">Registration Trend</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={regTrendRows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
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
          {/* Pass / Fail */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card rounded-lg border p-6 shadow-sm">
              <h3 className="font-semibold mb-4">Pass / Fail Ratio</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={passFailPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    <Cell fill={COLORS.secondary} />
                    <Cell fill={COLORS.danger} />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Drop-off Points */}
            <div className="bg-card rounded-lg border p-6 shadow-sm">
              <h3 className="font-semibold mb-4">Drop-off Points</h3>
              <div className="space-y-3">
                {dropOffRows.length === 0 && (
                  <p className="text-sm text-muted-foreground">No data.</p>
                )}
                {dropOffRows.map((row, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{row.label ?? row.point ?? `Point ${i + 1}`}</span>
                      <span className="text-muted-foreground">
                        {row.dropRate ?? row.rate ?? 0}%
                      </span>
                    </div>
                    <Progress value={row.dropRate ?? row.rate ?? 0} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Content Coverage */}
          <div className="bg-card rounded-lg border p-6 shadow-sm">
            <h3 className="font-semibold mb-4">Content Coverage</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={coverageRows} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                <YAxis
                  dataKey="subject"
                  type="category"
                  width={120}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="coverage" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
          <div className="bg-card rounded-lg border p-6 shadow-sm">
            <h3 className="font-semibold mb-4">Question Difficulty Stats</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={difficultyRows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="difficulty" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill={COLORS.warning} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
