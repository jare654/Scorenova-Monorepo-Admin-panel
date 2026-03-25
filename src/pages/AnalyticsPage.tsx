import { useState } from "react";
import { Users, Activity, Clock, HelpCircle, Download } from "lucide-react";
import KPICard from "@/components/KPICard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from "recharts";
import { useToast } from "@/hooks/use-toast";

const gradePerformance = [
  { grade: "Grade 6", users: 4234, accuracy: 72, retention: 68 },
  { grade: "Grade 8", users: 5123, accuracy: 68, retention: 72 },
  { grade: "Grade 12", users: 3490, accuracy: 64, retention: 65 },
];

const subjectData = [
  { subject: "Math", grade6: 75, grade8: 70, grade12: 65 },
  { subject: "Physics", grade6: 68, grade8: 62, grade12: 58 },
  { subject: "English", grade6: 82, grade8: 78, grade12: 74 },
  { subject: "Biology", grade6: 70, grade8: 66, grade12: 62 },
  { subject: "Chemistry", grade6: 65, grade8: 60, grade12: 55 },
];

const geoData = [
  { city: "Addis Ababa", percentage: 45 },
  { city: "Adama", percentage: 15 },
  { city: "Hawassa", percentage: 12 },
  { city: "Mekelle", percentage: 10 },
  { city: "Other", percentage: 18 },
];

const AnalyticsPage = () => {
  const [dateRange, setDateRange] = useState("30d");
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => toast({ title: "Export Started", description: "Your report is being generated..." })}>
          <Download className="h-4 w-4 mr-1" /> Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="DAU" value="1,234" trend={12} icon={Users} />
        <KPICard title="MAU" value="8,456" trend={23} icon={Activity} iconColor="text-secondary" />
        <KPICard title="Avg Session" value="24 min" icon={Clock} iconColor="text-accent" />
        <KPICard title="Questions/Day" value="12,345" icon={HelpCircle} iconColor="text-primary-light" />
      </div>

      {/* Grade Performance */}
      <div className="bg-card rounded-lg border p-6 shadow-sm">
        <h3 className="font-semibold text-card-foreground mb-4">Performance by Grade</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {gradePerformance.map((g) => (
            <div key={g.grade} className="bg-muted rounded-lg p-4 space-y-3">
              <h4 className="font-semibold">{g.grade}</h4>
              <p className="text-sm text-muted-foreground">{g.users.toLocaleString()} users</p>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1"><span>Accuracy</span><span>{g.accuracy}%</span></div>
                  <Progress value={g.accuracy} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1"><span>Retention</span><span>{g.retention}%</span></div>
                  <Progress value={g.retention} className="h-2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Performance Radar */}
        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <h3 className="font-semibold text-card-foreground mb-4">Subject Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={subjectData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar name="Grade 6" dataKey="grade6" stroke="hsl(224,76%,33%)" fill="hsl(224,76%,33%)" fillOpacity={0.1} />
              <Radar name="Grade 8" dataKey="grade8" stroke="hsl(173,58%,39%)" fill="hsl(173,58%,39%)" fillOpacity={0.1} />
              <Radar name="Grade 12" dataKey="grade12" stroke="hsl(24,95%,53%)" fill="hsl(24,95%,53%)" fillOpacity={0.1} />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Geographic Distribution */}
        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <h3 className="font-semibold text-card-foreground mb-4">Geographic Distribution</h3>
          <div className="space-y-3">
            {geoData.map((g) => (
              <div key={g.city} className="flex items-center gap-3">
                <span className="text-sm w-28 text-muted-foreground">{g.city}</span>
                <Progress value={g.percentage} className="flex-1 h-3" />
                <span className="text-sm font-medium w-10 text-right">{g.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
