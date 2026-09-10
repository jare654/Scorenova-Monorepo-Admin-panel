import { useState, useMemo } from "react";
import {
  GraduationCap,
  Search,
  Loader2,
  Calendar,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Award,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchExamSessions,
  fetchSubjects,
  type ExamSession,
  type Subject,
} from "@/services/api/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function ExamSessionsPage() {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 20;

  // ── Subjects for filter dropdown
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["subjects", "all"],
    queryFn: ({ signal }) => fetchSubjects(undefined, signal),
    staleTime: 5 * 60 * 1000,
  });

  // ── Exam Sessions
  const { data: sessionsResponse, isLoading } = useQuery({
    queryKey: ["exam-sessions", page, perPage, selectedSubjectId],
    queryFn: ({ signal }) =>
      fetchExamSessions(
        {
          page,
          limit: perPage,
          subjectId: selectedSubjectId === "all" ? undefined : selectedSubjectId,
        },
        signal
      ),
    placeholderData: (prev) => prev,
  });

  const sessions: ExamSession[] = sessionsResponse?.data ?? [];
  const total = sessionsResponse?.total ?? 0;
  const totalPages = sessionsResponse?.totalPages ?? 1;

  // Filter sessions client-side by student search if provided
  const filteredSessions = useMemo(() => {
    if (!search.trim()) return sessions;
    const q = search.toLowerCase();
    return sessions.filter(
      (s) =>
        (s.studentName && s.studentName.toLowerCase().includes(q)) ||
        (s.studentPhone && s.studentPhone.includes(q)) ||
        (s.subjectName && s.subjectName.toLowerCase().includes(q))
    );
  }, [sessions, search]);

  // KPIs
  const avgScore = useMemo(() => {
    if (sessions.length === 0) return 0;
    const sum = sessions.reduce((acc, s) => acc + (s.scorePercent || 0), 0);
    return Math.round(sum / sessions.length);
  }, [sessions]);

  const passRate = useMemo(() => {
    if (sessions.length === 0) return 0;
    const passedCount = sessions.filter((s) => s.passed).length;
    return Math.round((passedCount / sessions.length) * 100);
  }, [sessions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Student Exam Sessions</h1>
          <p className="text-sm text-muted-foreground">
            Monitor real-time student exam attempts, mock test scores, and pass/fail metrics.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Recorded Sessions</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all curriculum subjects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Average Exam Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{avgScore}%</div>
            <Progress value={avgScore} className="h-1.5 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Passing Rate</CardTitle>
            <Award className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{passRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Students achieving ≥ 50% score</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-card p-4 rounded-xl border">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <div className="w-56">
            <Select
              value={selectedSubjectId}
              onValueChange={(val) => {
                setSelectedSubjectId(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Filter by Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((sub) => (
                  <SelectItem key={sub.id} value={sub.id}>
                    {sub.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filteredSessions.length}</span> sessions
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border rounded-xl bg-card">
          <GraduationCap className="h-10 w-10 mb-2 opacity-30" />
          <p className="text-sm font-medium">No exam sessions found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {search || selectedSubjectId !== "all"
              ? "Try resetting your search or subject filter."
              : "When students complete exams in the mobile app, their sessions will display here."}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium text-muted-foreground">Student</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Subject</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Questions</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Score</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Result</th>
                  <th className="p-3 text-right font-medium text-muted-foreground">Taken Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session) => (
                  <tr key={session.sessionId} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div>
                        <p className="font-semibold">{session.studentName || "Student"}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {session.studentPhone || "—"}
                        </p>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{session.subjectName || "General Exam"}</span>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {session.correct} / {session.totalQ} correct
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs min-w-[36px]">
                          {session.scorePercent}%
                        </span>
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              session.passed ? "bg-success" : "bg-destructive"
                            }`}
                            style={{ width: `${Math.min(session.scorePercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={`text-xs gap-1 ${
                          session.passed
                            ? "bg-success/10 text-success border-success/30"
                            : "bg-destructive/10 text-destructive border-destructive/30"
                        }`}
                      >
                        {session.passed ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" /> Passed
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" /> Failed
                          </>
                        )}
                      </Badge>
                    </td>
                    <td className="p-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                      {session.takenAt ? new Date(session.takenAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
            <span>
              Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total} exam sessions
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </Button>
              <span className="px-2 font-medium text-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
