import {
  Users,
  UserCheck,
  UserPlus,
  UserX,
  DollarSign,
  Loader2,
} from "lucide-react";
import KPICard from "@/components/KPICard";
import ActivityFeed from "@/components/ActivityFeed";
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

const DashboardPage = () => {
  const isMobile = useIsMobile();

  // ── From context (accounts fetched once app-wide) ─────────────────────────
  const {
    totalUsers,
    statusData,
    students,
    loading: accountsLoading,
  } = useAccounts();

  // ── Grade stats — fetched via react-query hook ─────────────────────────
  const { questionsByGrade, loading: gradeStatsLoading } = useGradeStats();

  const today = new Date();
  const activeStudentsCount = students.filter((s) => s.isActive).length;
  const suspendedStudentsCount = students.filter((s) => !s.isActive).length;
  const trialStudentsCount = students.filter((s) => s.status === "trial").length;
  const todayRegisteredCount = students.filter((s) => {
    const joined = new Date(s.createdAt ?? s.joinedAt);
    return joined.toDateString() === today.toDateString();
  }).length;

  const monthlyGenderData = (() => {
    const now = new Date();
    const monthsToShow = 6;
    const map: Record<string, { male: number; female: number }> = {};
    const order: string[] = [];

    for (let i = monthsToShow - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      map[key] = { male: 0, female: 0 };
      order.push(key);
    }

    students.forEach((s) => {
      const joined = new Date(s.createdAt ?? s.joinedAt);
      const key = joined.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      if (!map[key]) return;
      const gender = (s.gender ?? "").toLowerCase();
      if (gender === "male") map[key].male += 1;
      else if (gender === "female") map[key].female += 1;
    });

    return order.map((month) => ({ month, ...map[month] }));
  })();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KPICard
          title="Total Students"
          value={accountsLoading ? "—" : totalUsers}
          trend={23}
          trendLabel="Extra"
          icon={Users}
        />
        <KPICard
          title="Active Students"
          value={accountsLoading ? "—" : activeStudentsCount}
          trend={12}
          icon={UserCheck}
          iconColor="text-success"
        />
        <KPICard
          title="Today Registered Students"
          value={accountsLoading ? "—" : todayRegisteredCount}
          trend={8}
          icon={UserPlus}
          iconColor="text-primary"
        />
        <KPICard
          title="Suspended Students"
          value={accountsLoading ? "—" : suspendedStudentsCount}
          trend={-3}
          icon={UserX}
          iconColor="text-destructive"
        />
        <KPICard
          title="Trial Students"
          value={accountsLoading ? "—" : trialStudentsCount}
          icon={Users}
        />
        <KPICard
          title="Total Revenue"
          value="45,678 ETB"
          trend={34}
          icon={DollarSign}
          iconColor="text-secondary"
        />
        {/*
        <KPICard
          title="AI Cost"
          value="345 ETB"
          trend={5}
          icon={Brain}
          iconColor="text-accent"
        />
        <KPICard
          title="Premium Users"
          value="2,345 (18%)"
          icon={Crown}
          iconColor="text-warning"
        />
        <KPICard
          title="Questions Answered"
          value="234,567"
          icon={HelpCircle}
          iconColor="text-primary-light"
        />
        */}
      </div>

      {/* ── Student Growth + Pie ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="min-w-0 rounded-lg border bg-card p-4 shadow-sm sm:p-6 lg:col-span-2">
          <h3 className="mb-4 font-semibold text-card-foreground">
            Student Growth by Gender (Monthly)
          </h3>
          {accountsLoading || monthlyGenderData.length === 0 ? (
            <div className="flex h-[240px] items-center justify-center sm:h-[300px]">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={isMobile ? 240 : 300}>
              <BarChart data={monthlyGenderData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(214,32%,91%)"
                />
                <XAxis dataKey="month" tick={{ fontSize: isMobile ? 10 : 12 }} interval={isMobile ? 1 : 0} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                {!isMobile && <Legend />}
                <Bar dataKey="male" fill="hsl(224,76%,33%)" radius={[4, 4, 0, 0]} name="Male" />
                <Bar dataKey="female" fill="hsl(173,58%,39%)" radius={[4, 4, 0, 0]} name="Female" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="min-w-0 rounded-lg border bg-card p-4 shadow-sm sm:p-6">
          <h3 className="mb-4 font-semibold text-card-foreground">
            Premium vs Free
          </h3>
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
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
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

      {/* ── Grade Stats + Activity ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <div className="min-w-0 rounded-lg border bg-card p-4 shadow-sm sm:p-6">
          <h3 className="mb-4 font-semibold text-card-foreground">
            Questions by Stream
          </h3>
          {gradeStatsLoading ? (
            <div className="flex h-[220px] items-center justify-center sm:h-[250px]">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={isMobile ? 220 : 250}>
              <BarChart data={questionsByGrade}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(214,32%,91%)"
                />
                <XAxis dataKey="grade" tick={{ fontSize: isMobile ? 10 : 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar
                  dataKey="questions"
                  fill="hsl(224,76%,33%)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* <ActivityFeed items={[]} /> */}
      </div>
    </div>
  );
};

export default DashboardPage;
