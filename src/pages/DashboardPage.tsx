import { Users, UserCheck, DollarSign, Brain, Crown, HelpCircle } from "lucide-react";
import KPICard from "@/components/KPICard";
import ActivityFeed from "@/components/ActivityFeed";
import { recentActivity, userGrowthData } from "@/data/mockData";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";

const COLORS = ["hsl(224,76%,33%)", "hsl(173,58%,39%)", "hsl(24,95%,53%)"];

const premiumVsFree = [
  { name: "Premium", value: 2345 },
  { name: "Free", value: 9612 },
  { name: "Trial", value: 890 },
];

const questionsByGrade = [
  { grade: "Grade 6", questions: 78234 },
  { grade: "Grade 8", questions: 89456 },
  { grade: "Grade 12", questions: 66877 },
];

const DashboardPage = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard title="Total Users" value="12,847" trend={23} icon={Users} />
        <KPICard title="Active Today" value="1,234" trend={12} icon={UserCheck} iconColor="text-success" />
        <KPICard title="Total Revenue" value="45,678 ETB" trend={34} icon={DollarSign} iconColor="text-secondary" />
        <KPICard title="AI Cost" value="345 ETB" trend={5} icon={Brain} iconColor="text-accent" />
        <KPICard title="Premium Users" value="2,345 (18%)" icon={Crown} iconColor="text-warning" />
        <KPICard title="Questions Answered" value="234,567" icon={HelpCircle} iconColor="text-primary-light" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-lg border p-6 shadow-sm">
          <h3 className="font-semibold text-card-foreground mb-4">User Growth (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} interval={4} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="users" stroke="hsl(224,76%,33%)" strokeWidth={2} dot={false} name="Total Users" />
              <Line type="monotone" dataKey="premium" stroke="hsl(173,58%,39%)" strokeWidth={2} dot={false} name="Premium" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <h3 className="font-semibold text-card-foreground mb-4">Premium vs Free</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={premiumVsFree} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {premiumVsFree.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <h3 className="font-semibold text-card-foreground mb-4">Questions by Grade</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={questionsByGrade}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
              <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="questions" fill="hsl(224,76%,33%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <ActivityFeed items={recentActivity} />
      </div>
    </div>
  );
};

export default DashboardPage;
