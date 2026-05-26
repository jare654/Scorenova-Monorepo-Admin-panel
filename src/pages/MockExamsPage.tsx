import { useState, useMemo, useEffect, useRef } from "react";
import {
  BookOpen, Loader2, Search, Plus, Trash2, Eye,
  CheckCircle2, XCircle, Sparkles, Hash, Clock,
  ChevronRight, ChevronLeft, AlertCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/context/AuthContext";
import {
  fetchMockSubjects, fetchAdminMockExams, fetchAdminMockExam,
  generateMockExam, deleteMockExam, pollMockExamUntilDone,
  type MockSubject, type MockExamSummary, type MockExamDetail,
} from "@/services/api/mock";
import {
  fetchExamSessions, fetchSubjects, fetchStreams,
  type ExamSession, type Subject, type Stream,
} from "@/services/api/content";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

// ─── Exam Detail Dialog ───────────────────────────────────────────────────────
interface ExamDetailProps { exam: MockExamDetail | null; open: boolean; onClose: () => void; }
const ExamDetailDialog = ({ exam, open, onClose }: ExamDetailProps) => {
  if (!exam) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {exam.label}
          </DialogTitle>
          <DialogDescription>{exam.questionCount} questions · EUEE format</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {exam.questions.map((q, i) => (
            <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-xs font-mono text-muted-foreground shrink-0 pt-0.5">{i + 1}.</span>
                <p className="text-sm font-medium">{q.question}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-5">
                {q.choices.map((c, ci) => {
                  const letter = String.fromCharCode(65 + ci);
                  const isCorrect = q.answer === letter;
                  return (
                    <div key={ci} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm border ${isCorrect ? "bg-success/10 border-success/30 text-success font-medium" : "bg-muted/40 border-transparent text-muted-foreground"}`}>
                      <span className="text-xs font-mono shrink-0">{letter}.</span>
                      {c.replace(/^[A-D]\)\s*/i, "")}
                      {isCorrect && <span className="ml-auto text-xs">✓</span>}
                    </div>
                  );
                })}
              </div>
              {q.explanation && (
                <p className="text-xs text-muted-foreground pl-5 italic">{q.explanation}</p>
              )}
            </div>
          ))}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Generate Dialog ──────────────────────────────────────────────────────────
interface GenerateDialogProps {
  open: boolean;
  onClose: () => void;
  subjects: MockSubject[];
  streamNameById: Map<string, string>;
  onGenerate: (subjectId: string, questionCount: number) => void;
  generating: boolean;
}
const GenerateDialog = ({ open, onClose, subjects, streamNameById, onGenerate, generating }: GenerateDialogProps) => {
  const [subjectId, setSubjectId]         = useState("");
  const [questionCount, setQuestionCount] = useState("50");

  const handleOpen = (v: boolean) => {
    if (v) { setSubjectId(""); setQuestionCount("50"); }
    else onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Mock Exam
          </DialogTitle>
          <DialogDescription>
            Mistral AI will generate EUEE-style questions for the selected subject.
            Existing questions are automatically avoided.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Subject *</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                    {s.streamId && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({streamNameById.get(s.streamId) ?? "—"})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Number of Questions *</Label>
            <Input
              type="number"
              min={5}
              max={100}
              value={questionCount}
              onChange={(e) => setQuestionCount(e.target.value)}
              placeholder="e.g. 50"
            />
            <p className="text-xs text-muted-foreground">Between 5 and 100 questions</p>
          </div>
          {generating && (
            <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm text-primary">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              <div>
                <p className="font-medium">Generating your exam…</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  This runs in the background. The dialog will close when done.
                </p>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={generating}>Cancel</Button>
          <Button
            onClick={() => onGenerate(subjectId, parseInt(questionCount) || 50)}
            disabled={!subjectId || generating}
          >
            {generating
              ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Generating…</>
              : <><Sparkles className="h-4 w-4 mr-1" />Generate</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const MockExamsPage = () => {
  const { token, initialized } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [subjectFilter, setSubjectFilter]   = useState("all");
  const [examSearch, setExamSearch]         = useState("");
  const [sessionSearch, setSessionSearch]   = useState("");
  const [sessionSubjectFilter, setSessionSubjectFilter] = useState("all");
  const [sessionPage, setSessionPage]       = useState(1);
  const [generateOpen, setGenerateOpen]     = useState(false);
  const [previewExam, setPreviewExam]       = useState<MockExamDetail | null>(null);
  const [previewOpen, setPreviewOpen]       = useState(false);
  const [deleteTarget, setDeleteTarget]     = useState<{ id: string; label: string } | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
  const sessionPerPage = 20;

  // ── Streams
  const { data: streams = [] } = useQuery<Stream[], Error>({
    queryKey: ["streams"],
    queryFn: ({ signal }) => fetchStreams(signal),
    enabled: initialized && !!token,
    staleTime: 10 * 60 * 1000,
  });
  const streamNameById = useMemo(() => new Map(streams.map((s) => [s.id, s.name])), [streams]);

  // ── Subjects
  const { data: mockSubjects = [], isLoading: subjectsLoading } = useQuery<MockSubject[], Error>({
    queryKey: ["mock-subjects"],
    queryFn: ({ signal }) => fetchMockSubjects(signal),
    enabled: initialized && !!token,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allSubjects = [] } = useQuery<Subject[], Error>({
    queryKey: ["subjects", "all"],
    queryFn: ({ signal }) => fetchSubjects(undefined, signal),
    enabled: initialized && !!token,
    staleTime: 5 * 60 * 1000,
  });

  // ── Admin mock exams list — auto-refetch while any exam is pending
  const { data: adminExams = [], isLoading: examsLoading } = useQuery<MockExamSummary[], Error>({
    queryKey: ["admin-mock-exams", subjectFilter],
    queryFn: ({ signal }) => fetchAdminMockExams(
      subjectFilter === "all" ? undefined : subjectFilter,
      signal,
    ),
    enabled: initialized && !!token,
    staleTime: 30_000,
    // Poll every 15s only while an exam is still generating — stops automatically when done
    refetchInterval: (query) => {
      const exams = query.state.data ?? [];
      return exams.some((e) => e.status === "pending") ? 15_000 : false;
    },
    refetchIntervalInBackground: false, // only poll when tab is active
  });

  // ── Exam sessions
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ["exam-sessions", sessionPage, sessionSubjectFilter],
    queryFn: ({ signal }) => fetchExamSessions({
      page: sessionPage,
      limit: sessionPerPage,
      subjectId: sessionSubjectFilter === "all" ? undefined : sessionSubjectFilter,
    }, signal),
    enabled: initialized && !!token,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
  const sessions: ExamSession[] = sessionsData?.data ?? [];
  const sessionsTotal      = sessionsData?.total ?? 0;
  const sessionsTotalPages = sessionsData?.totalPages ?? 1;

  // ── Generate mutation — async: POST returns immediately, then poll
  const generateMutation = useMutation({
    mutationFn: async ({ subjectId, questionCount }: { subjectId: string; questionCount: number }) => {
      // Step 1: create the exam record (returns immediately with status=pending)
      const pending = await generateMockExam(subjectId, questionCount);
      // Refresh list so the pending exam shows up right away
      qc.invalidateQueries({ queryKey: ["admin-mock-exams"] });
      // Step 2: poll until completed or failed
      const done = await pollMockExamUntilDone(pending.id, () => {
        // Refresh list on each poll tick so question count updates live
        qc.invalidateQueries({ queryKey: ["admin-mock-exams"] });
      });
      return done;
    },
    onSuccess: (exam) => {
      qc.invalidateQueries({ queryKey: ["admin-mock-exams"] });
      toast({
        title: "Exam generated",
        description: `${exam.label} created with ${exam.questionCount} questions.`,
      });
      setGenerateOpen(false);
    },
    onError: (e: Error) => toast({
      title: "Generation failed",
      description: e.message,
      variant: "destructive",
    }),
  });

  // ── Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMockExam(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-mock-exams"] });
      toast({ title: "Exam deleted" });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const handlePreview = async (exam: MockExamSummary) => {
    setLoadingPreviewId(exam.id);
    try {
      const detail = await fetchAdminMockExam(exam.id);
      setPreviewExam(detail);
      setPreviewOpen(true);
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to load exam", variant: "destructive" });
    } finally {
      setLoadingPreviewId(null);
    }
  };

  const filteredExams = adminExams.filter((e) =>
    !examSearch || e.label.toLowerCase().includes(examSearch.toLowerCase()),
  );

  const filteredSessions = sessions.filter((s) =>
    !sessionSearch ||
    s.studentName.toLowerCase().includes(sessionSearch.toLowerCase()) ||
    s.subjectName.toLowerCase().includes(sessionSearch.toLowerCase()) ||
    s.studentPhone.includes(sessionSearch),
  );

  // Group exams by subject for display
  const subjectNameById = useMemo(
    () => new Map(allSubjects.map((s) => [s.id, s.name])),
    [allSubjects],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Mock Exams</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Generate AI-powered EUEE mock exams and monitor student results.
          </p>
        </div>
        <Button onClick={() => setGenerateOpen(true)}>
          <Sparkles className="h-4 w-4 mr-1" /> Create Mock Exam
        </Button>
      </div>

      <Tabs defaultValue="exams">
        <TabsList>
          <TabsTrigger value="exams">Mock Exams</TabsTrigger>
          <TabsTrigger value="sessions">Student Results</TabsTrigger>
        </TabsList>

        {/* ══ EXAMS TAB ═════════════════════════════════════════════════════ */}
        <TabsContent value="exams" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search exams…" value={examSearch} onChange={(e) => setExamSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={subjectFilter} onValueChange={(v) => { setSubjectFilter(v); }}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All Subjects" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {allSubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {examsLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredExams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Sparkles className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No mock exams yet</p>
              <p className="text-xs mt-1">Click "Create Mock Exam" to generate your first AI-powered exam.</p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {["Exam", "Subject", "Questions", "Created", "Actions"].map((h) => (
                      <th key={h} className="p-3 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredExams.map((exam) => (
                    <tr key={exam.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            {exam.status === "pending"
                              ? <Loader2 className="h-4 w-4 text-primary animate-spin" />
                              : exam.status === "failed"
                                ? <AlertCircle className="h-4 w-4 text-destructive" />
                                : <BookOpen className="h-4 w-4 text-primary" />}
                          </div>
                          <div>
                            <span className="font-medium">{exam.label}</span>
                            {exam.status === "pending" && (
                              <p className="text-xs text-muted-foreground">Generating…</p>
                            )}
                            {exam.status === "failed" && (
                              <p className="text-xs text-destructive">Failed</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {subjectNameById.get(exam.subjectId) ?? "—"}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                          {exam.questionCount}
                        </div>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {new Date(exam.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handlePreview(exam)}
                            disabled={loadingPreviewId === exam.id || (exam.status != null && exam.status !== "completed")}
                          >
                            {loadingPreviewId === exam.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteTarget({ id: exam.id, label: exam.label })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ══ SESSIONS TAB ══════════════════════════════════════════════════ */}
        <TabsContent value="sessions" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by student or subject…" value={sessionSearch} onChange={(e) => setSessionSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={sessionSubjectFilter} onValueChange={(v) => { setSessionSubjectFilter(v); setSessionPage(1); }}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All Subjects" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {allSubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {sessionsLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <BookOpen className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">{sessionSearch ? "No sessions match your search." : "No exam sessions recorded yet."}</p>
            </div>
          ) : (
            <>
              <div className="bg-card rounded-xl border shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {["Student", "Subject", "Score", "Result", "Date"].map((h) => (
                        <th key={h} className="p-3 text-left font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map((session) => (
                      <tr key={session.sessionId} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <p className="font-medium">{session.studentName}</p>
                          <p className="text-xs text-muted-foreground">{session.studentPhone}</p>
                        </td>
                        <td className="p-3 text-sm">{session.subjectName}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{session.scorePercent}%</span>
                            <span className="text-xs text-muted-foreground">({session.correct}/{session.totalQ})</span>
                          </div>
                        </td>
                        <td className="p-3">
                          {session.passed
                            ? <div className="flex items-center gap-1.5 text-success text-xs font-medium"><CheckCircle2 className="h-4 w-4" />Passed</div>
                            : <div className="flex items-center gap-1.5 text-destructive text-xs font-medium"><XCircle className="h-4 w-4" />Failed</div>}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {new Date(session.takenAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {sessionsTotal === 0 ? "No results" : `Showing ${(sessionPage - 1) * sessionPerPage + 1}–${Math.min(sessionPage * sessionPerPage, sessionsTotal)} of ${sessionsTotal}`}
                </p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={sessionPage === 1} onClick={() => setSessionPage(sessionPage - 1)}>Previous</Button>
                  {Array.from({ length: Math.min(5, sessionsTotalPages) }, (_, i) => {
                    const p = sessionPage <= 3 ? i + 1 : sessionPage - 2 + i;
                    if (p > sessionsTotalPages) return null;
                    return <Button key={p} variant={p === sessionPage ? "default" : "outline"} size="sm" onClick={() => setSessionPage(p)}>{p}</Button>;
                  })}
                  <Button variant="outline" size="sm" disabled={sessionPage >= sessionsTotalPages} onClick={() => setSessionPage(sessionPage + 1)}>Next</Button>
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Generate Dialog ── */}
      <GenerateDialog
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        subjects={mockSubjects}
        streamNameById={streamNameById}
        generating={generateMutation.isPending}
        onGenerate={(subjectId, questionCount) =>
          generateMutation.mutate({ subjectId, questionCount })
        }
      />

      {/* ── Preview Dialog ── */}
      <ExamDetailDialog
        exam={previewExam}
        open={previewOpen}
        onClose={() => { setPreviewOpen(false); setPreviewExam(null); }}
      />

      {/* ── Delete Confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Mock Exam</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deleteTarget?.label}"</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Deleting…</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MockExamsPage;
