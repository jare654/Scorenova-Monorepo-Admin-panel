import { useState, useEffect } from "react";
import {
  Users,
  Activity,
  Clock,
  HelpCircle,
  Download,
  Loader2,
} from "lucide-react";
import KPICard from "@/components/KPICard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/context/AuthContext";
import { API_URL } from "@/lib/api";

const RADAR_COLORS = [
  "hsl(224,76%,33%)",
  "hsl(173,58%,39%)",
  "hsl(24,95%,53%)",
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
  const { token } = useAuth();

  // Grade performance state
  const [gradePerformance, setGradePerformance] = useState<
    {
      grade: string;
      users: number;
      accuracy: number;
      retention: number;
    }[]
  >([]);
  [] > [];
  const [gradeLoading, setGradeLoading] = useState(false);

  // DAU / MAU state
  const [dau, setDau] = useState<number | null>(null);
  const [mau, setMau] = useState<number | null>(null);

  // Subject performance radar state
  const [radarData, setRadarData] = useState<any[]>([]);
  const [radarGradeLabels, setRadarGradeLabels] = useState<
    {
      key: string;
      label: string;
    }[]
  >([]);
  const [radarLoading, setRadarLoading] = useState(false);

  // ── Fetch grade stats (for performance cards)
  useEffect(() => {
    const fetchGradeStats = async () => {
      setGradeLoading(true);
      try {
        const gradesRes = await fetch(`${API_URL}/grades`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!gradesRes.ok) throw new Error(`HTTP ${gradesRes.status}`);
        const gradesPayload = await gradesRes.json();
        const gradesData = gradesPayload?.data ?? gradesPayload;
        const grades: { id: string; name: string }[] = Array.isArray(gradesData)
          ? gradesData
          : [];

        const stats = await Promise.all(
          grades.map(async (g) => {
            try {
              const res = await fetch(`${API_URL}/grades/${g.id}/statistics`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!res.ok)
                return {
                  grade: `Grade ${g.name}`,
                  users: 0,
                  accuracy: 0,
                  retention: 0,
                };
              const payload = await res.json();
              const json = payload?.data ?? payload;
              return {
                grade: `Grade ${json.gradeName}`,
                users: json.totalUsers ?? 0,
                accuracy: 0,
                retention: 0,
              };
            } catch {
              return {
                grade: `Grade ${g.name}`,
                users: 0,
                accuracy: 0,
                retention: 0,
              };
            }
          }),
        );
        setGradePerformance(stats);
      } catch {
        toast({
          title: "Error",
          description: "Failed to load grade statistics.",
          variant: "destructive",
        });
      } finally {
        setGradeLoading(false);
      }
    };
    fetchGradeStats();
  }, [token]);

  // ── Fetch DAU / MAU
  useEffect(() => {
    const fetchUserAverages = async () => {
      try {
        const [dauRes, mauRes] = await Promise.all([
          fetch(`${API_URL}/analytics/daily-average-users`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/analytics/monthly-average-users`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (dauRes.ok) {
          const payload = await dauRes.json();
          const j = payload?.data ?? payload;
          setDau(j.average ?? 0);
        }
        if (mauRes.ok) {
          const payload = await mauRes.json();
          const j = payload?.data ?? payload;
          setMau(j.average ?? 0);
        }
      } catch {
        // Failed to load user averages
      }
    };
    fetchUserAverages();
  }, [token]);

  // ── Fetch subject performance for radar chart (first 3 grades only)
  useEffect(() => {
    const fetchSubjectPerformance = async () => {
      setRadarLoading(true);
      try {
        // Step 1: fetch grades, take first 3
        const gradesRes = await fetch(`${API_URL}/grades`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!gradesRes.ok) throw new Error(`HTTP ${gradesRes.status}`);
        const gradesPayload = await gradesRes.json();
        const gradesData = gradesPayload?.data ?? gradesPayload;
        const allGrades: { id: string; name: string }[] = Array.isArray(
          gradesData,
        )
          ? gradesData
          : [];
        const top3 = allGrades.slice(0, 3);

        // Step 2: for each grade fetch its subjects
        const gradeSubjects = await Promise.all(
          top3.map(async (g) => {
            try {
              const res = await fetch(`${API_URL}/subjects?gradeId=${g.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!res.ok) return { grade: g, subjects: [] };
              const payload = await res.json();
              const json = payload?.data ?? payload;
              const subjects: { id: string; name: string }[] = Array.isArray(
                json,
              )
                ? json
                : [];
              return { grade: g, subjects };
            } catch {
              return { grade: g, subjects: [] };
            }
          }),
        );

        // Step 3: collect all unique subject names
        const subjectNameSet = new Set<string>();
        gradeSubjects.forEach(({ subjects }) =>
          subjects.forEach((s) => subjectNameSet.add(s.name)),
        );
        const subjectNames = Array.from(subjectNameSet);

        // Step 4: for each grade, fetch progress per subject
        // Build a map: gradeName -> subjectName -> accuracy
        const gradeAccuracyMap: Record<string, Record<string, number>> = {};

        await Promise.all(
          gradeSubjects.map(async ({ grade, subjects }) => {
            gradeAccuracyMap[grade.name] = {};
            await Promise.all(
              subjects.map(async (s) => {
                try {
                  const res = await fetch(
                    `${API_URL}/progress/subject/${s.id}`,
                    { headers: { Authorization: `Bearer ${token}` } },
                  );
                  if (!res.ok) return;
                  const payload = await res.json();
                  const json = payload?.data ?? payload;
                  gradeAccuracyMap[grade.name][s.name] = json.accuracy ?? 0;
                } catch {
                  gradeAccuracyMap[grade.name][s.name] = 0;
                }
              }),
            );
          }),
        );

        // Step 5: build radar data array
        // Each entry: { subject: "Math", "Grade 12": 75, "Grade 8": 68, ... }
        const radar = subjectNames.map((subjectName) => {
          const entry: Record<string, any> = { subject: subjectName };
          top3.forEach((g) => {
            const key = `Grade ${g.name}`;
            entry[key] = gradeAccuracyMap[g.name]?.[subjectName] ?? 0;
          });
          return entry;
        });

        // Step 6: build grade label keys for radar lines
        const labels = top3.map((g, i) => ({
          key: `Grade ${g.name}`,
          label: `Grade ${g.name}`,
          color: RADAR_COLORS[i],
        }));

        setRadarData(radar);
        setRadarGradeLabels(labels as any);
      } catch {
        // Failed to load subject performance
      } finally {
        setRadarLoading(false);
      }
    };

    fetchSubjectPerformance();
  }, [token]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() =>
            toast({
              title: "Export Started",
              description: "Your report is being generated...",
            })
          }
        >
          <Download className="h-4 w-4 mr-1" /> Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="DAU"
          value={dau !== null ? dau : "—"}
          trend={12}
          icon={Users}
        />
        <KPICard
          title="MAU"
          value={mau !== null ? mau : "—"}
          trend={23}
          icon={Activity}
          iconColor="text-secondary"
        />
        <KPICard
          title="Avg Session"
          value="24 min"
          icon={Clock}
          iconColor="text-accent"
        />
        <KPICard
          title="Questions/Day"
          value="12,345"
          icon={HelpCircle}
          iconColor="text-primary-light"
        />
      </div>

      {/* Grade Performance */}
      <div className="bg-card rounded-lg border p-6 shadow-sm">
        <h3 className="font-semibold text-card-foreground mb-4">
          Performance by Grade
        </h3>
        {gradeLoading ? (
          <div className="h-32 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {gradePerformance.map((g) => (
              <div key={g.grade} className="bg-muted rounded-lg p-4 space-y-3">
                <h4 className="font-semibold">{g.grade}</h4>
                <p className="text-sm text-muted-foreground">
                  {g.users.toLocaleString()} users
                </p>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Accuracy</span>
                      <span>{g.accuracy}%</span>
                    </div>
                    <Progress value={g.accuracy} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Retention</span>
                      <span>{g.retention}%</span>
                    </div>
                    <Progress value={g.retention} className="h-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Performance Radar — connected to backend */}
        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <h3 className="font-semibold text-card-foreground mb-4">
            Subject Performance
          </h3>
          {radarLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : radarData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
              No subject data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                {radarGradeLabels.map((g: any) => (
                  <Radar
                    key={g.key}
                    name={g.label}
                    dataKey={g.key}
                    stroke={g.color}
                    fill={g.color}
                    fillOpacity={0.1}
                  />
                ))}
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Geographic Distribution */}
        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <h3 className="font-semibold text-card-foreground mb-4">
            Geographic Distribution
          </h3>
          <div className="space-y-3">
            {geoData.map((g) => (
              <div key={g.city} className="flex items-center gap-3">
                <span className="text-sm w-28 text-muted-foreground">
                  {g.city}
                </span>
                <Progress value={g.percentage} className="flex-1 h-3" />
                <span className="text-sm font-medium w-10 text-right">
                  {g.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
