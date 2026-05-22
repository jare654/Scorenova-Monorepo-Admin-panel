import {
  Users,
  UserCheck,
  UserPlus,
  UserX,
  Loader2,
} from "lucide-react";
import KPICard from "@/components/KPICard";
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

const COLORS = ["hsl(224,76%,33%)", "hsl(173,58%,39%)", "hsl(24,95%,53%)"];

// All 12 months abbreviated
const ALL_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DashboardPage = () => {
  const isMobile = useIsMobile();

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
  const trialStudentsCount     = students.filter((s) => s.status === "trial").length;
  const todayRegisteredCount   = students.filter((s) => {
    const d = new Date(s.createdAt ?? s.joinedAt);
    return d.toDateString() === today.toDateString();
  }).length;

  // ── Monthly gender chart — all 12 months of current year, all students ──
  const monthlyGenderData = (() => {
    const now = new Date();
    const year = now.getFullYear();

    // Build all 12 month buckets for the current year
    const buckets = ALL_MONTHS.map((mon, idx) => ({
      month:  mon,
      monthIndex: idx,
      male:   0,
      female: 0,
    }));

    if (students.length === 0) return buckets;

    // Resolve the best available date for a student
    const getDate = (s: typeof students[0]): Date | null => {
      for (const raw of [s.joinedAt, s.createdAt]) {
        if (!raw) continue;
        const d = new Date(raw);
        if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return d;
      }
      return null;
    };

    // Place every student into their month bucket (current year only)
    students.forEach((s) => {
      const d = getDate(s);
      if (!d) return;
      if (d.getFullYear() !== year) return; // skip students from other years
      const bucket = buckets[d.getMonth()];
      if (!bucket) return;
      const g = (s.gender ?? "").toLowerCase().trim();
      if (g === "female" || g === "f") bucket.female += 1;
      else                              bucket.male   += 1; // male, unknown, or any other value
    });

    return buckets;
  })();

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <KPICard
          title="Total Students"
          value={accountsLoading ? "—" : totalUsers}
          icon={Users}
        />
        <KPICard
          title="Active Students"
          value={accountsLoading ? "—" : activeStudentsCount}
          icon={UserCheck}
          iconColor="text-success"
        />
        <KPICard
          title="Today Registered"
          value={accountsLoading ? "—" : todayRegisteredCount}
          icon={UserPlus}
          iconColor="text-primary"
        />
        <KPICard
          title="Suspended Students"
          value={accountsLoading ? "—" : suspendedStudentsCount}
          icon={UserX}
          iconColor="text-destructive"
        />
        <KPICard
          title="Trial Students"
          value={accountsLoading ? "—" : trialStudentsCount}
          icon={Users}
        />
      </div>

      {/* ── Student Growth + Pie ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="min-w-0 rounded-lg border bg-card p-4 shadow-sm sm:p-6 lg:col-span-2">
          <h3 className="mb-4 font-semibold text-card-foreground">
            Student Growth by Gender (Monthly)
          </h3>
          {accountsLoading ? (
            <div className="flex h-[240px] items-center justify-center sm:h-[300px]">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={isMobile ? 240 : 300}>
              <BarChart
                data={monthlyGenderData}
                margin={{ bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: isMobile ? 9 : 11 }}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={55}
                />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  formatter={(value, name) => [value, name]}
                  labelFormatter={(label) => {
                    const entry = monthlyGenderData.find((d) => d.month === label);
                    const total = entry ? entry.male + entry.female : 0;
                    return `${label}  (Total: ${total})`;
                  }}
                />
                {!isMobile && <Legend />}
                <Bar dataKey="male"   fill="hsl(224,76%,33%)" radius={[4, 4, 0, 0]} name="Male" />
                <Bar dataKey="female" fill="hsl(173,58%,39%)" radius={[4, 4, 0, 0]} name="Female" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="min-w-0 rounded-lg border bg-card p-4 shadow-sm sm:p-6">
          <h3 className="mb-4 font-semibold text-card-foreground">Premium vs Free</h3>
          {accountsLoading || statusData.length === 0 ? (
            <div className="flex h-[240px] items-center justify-center sm:h-[300px]">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={isMobile ? 240 : 300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Questions by Stream ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <div className="min-w-0 rounded-lg border bg-card p-4 shadow-sm sm:p-6">
          <h3 className="mb-4 font-semibold text-card-foreground">Questions by Stream</h3>
          {gradeStatsLoading ? (
            <div className="flex h-[220px] items-center justify-center sm:h-[250px]">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={isMobile ? 220 : 250}>
              <BarChart data={questionsByGrade}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
                <XAxis dataKey="grade" tick={{ fontSize: isMobile ? 10 : 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="questions" fill="hsl(224,76%,33%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

    </div>
  );
};

export default DashboardPage;
