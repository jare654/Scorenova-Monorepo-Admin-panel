import { useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  DollarSign,
  Brain,
  Crown,
  HelpCircle,
  Loader2,
} from "lucide-react";
import KPICard from "@/components/KPICard";
import ActivityFeed from "@/components/ActivityFeed";
import {
  LineChart,
  Line,
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
import { useAuth } from "@/components/auth/context/AuthContext";
import { useAccounts } from "@/components/auth/context/Accountcontext";
import { useGradeStats } from "@/hooks/Usegradestats";
import { useIsMobile } from "@/hooks/use-mobile";

const COLORS = ["hsl(224,76%,33%)", "hsl(173,58%,39%)", "hsl(24,95%,53%)"];

const DashboardPage = () => {
  const { token } = useAuth();
  const isMobile = useIsMobile();

  // ── From context (accounts fetched once app-wide) ─────────────────────────
  const {
    totalUsers,
    activeTodayCount,
    userGrowthData,
    statusData,
    loading: accountsLoading,
  } = useAccounts();

  // ── Grade stats — fetched via react-query hook ─────────────────────────
  const { questionsByGrade, loading: gradeStatsLoading } = useGradeStats();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KPICard
          title="Total Users"
          value={accountsLoading ? "—" : totalUsers}
          trend={23}
          trendLabel="Extra"
          icon={Users}
        />
        <KPICard
          title="Active Today"
          value={accountsLoading ? "—" : activeTodayCount}
          trend={12}
          icon={UserCheck}
          iconColor="text-success"
        />
        <KPICard
          title="Total Revenue"
          value="45,678 ETB"
          trend={34}
          icon={DollarSign}
          iconColor="text-secondary"
        />
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
      </div>

      {/* ── User Growth + Pie ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="min-w-0 rounded-lg border bg-card p-4 shadow-sm sm:p-6 lg:col-span-2">
          <h3 className="mb-4 font-semibold text-card-foreground">
            User Growth (Last 30 Days)
          </h3>
          {accountsLoading || userGrowthData.length === 0 ? (
            <div className="flex h-[240px] items-center justify-center sm:h-[300px]">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={isMobile ? 240 : 300}>
              <LineChart data={userGrowthData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(214,32%,91%)"
                />
                <XAxis dataKey="day" tick={{ fontSize: isMobile ? 10 : 12 }} interval={isMobile ? 6 : 4} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                {!isMobile && <Legend />}
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="hsl(224,76%,33%)"
                  strokeWidth={2}
                  dot={false}
                  name="Total Users"
                />
                <Line
                  type="monotone"
                  dataKey="premium"
                  stroke="hsl(173,58%,39%)"
                  strokeWidth={2}
                  dot={false}
                  name="Premium"
                />
              </LineChart>
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
            Questions by Grade
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

        <ActivityFeed items={[]} />
      </div>
    </div>
  );
};

export default DashboardPage;
