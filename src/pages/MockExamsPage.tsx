import { useState, useMemo } from "react";
import {
  BookOpen, Loader2, Search, Trash2, Eye,
  CheckCircle2, XCircle, Sparkles, Hash,
  AlertCircle, ChevronLeft, FlaskConical,
  Globe, Calculator, Atom, Leaf, BookMarked,
  Users, Brain, Pencil,
  Clock,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/context/AuthContext";
import {
  fetchMockSubjects, fetchAdminMockExams, fetchAdminMockExam,
  generateMockExam, deleteMockExam, pollMockExamUntilDone,
  fetchMockResults, renameMockExam, updateMockExamDuration,
  type MockSubject, type MockExamSummary, type MockExamDetail,
  type MockResult,
} from "@/services/api/mock";
import {
  fetchSubjects, fetchStreams,
  type Subject, type Stream,
} from "@/services/api/content";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

// ─── Subject icon map ─────────────────────────────────────────────────────────
const SUBJECT_ICONS: Record<string, React.ElementType> = {
  mathematics:  Calculator,
  physics:      Atom,
  chemistry:    FlaskConical,
  biology:      Leaf,
  english:      BookMarked,
  civics:       Users,
  geography:    Globe,
  history:      BookOpen,
  aptitude:     Brain,
};

function getSubjectIcon(name: string): React.ElementType {
  const key = name.toLowerCase().split(" ")[0];
  return SUBJECT_ICONS[key] ?? BookOpen;
}

const SUBJECT_COLORS: Record<string, string> = {
  "mathematics (natural science)": "bg-blue-500/10 text-blue-600 border-blue-200",
  "mathematics (social science)":  "bg-amber-500/10 text-violet-600 border-violet-200",
  mathematics:                     "bg-amber-500/10 text-blue-600 border-blue-200",
  physics:                         "bg-amber-500/10 text-purple-600 border-purple-200",
  chemistry:                       "bg-amber-500/10 text-orange-600 border-orange-200",
  biology:                         "bg-amber-500/10 text-green-600 border-green-200",
  english:                         "bg-amber-500/10 text-pink-600 border-pink-200",
  civics:                          "bg-amber-500/10 text-yellow-600 border-yellow-200",
  geography:                       "bg-amber-500/10 text-teal-600 border-teal-200",
  history:                         "bg-amber-500/10 text-amber-600 border-amber-200",
  aptitude:                        "bg-amber-500/10 text-indigo-600 border-indigo-200",
};

function getSubjectColor(name: string): string {
  const key = name.toLowerCase().trim();
  return SUBJECT_COLORS[key] ?? SUBJECT_COLORS[key.split(" ")[0]] ?? "bg-primary/10 text-primary border-primary/20";
}

// ─── Deduplicate subjects by base name (English, Aptitude, Civics shared) ─────
function deduplicateSubjects(
  subjects: MockSubject[],
  streamNameById: Map<string, string>,
): { name: string; ids: string[]; streamId: string | null }[] {
  const SHARED = ["english", "aptitude", "civics"];
  const map = new Map<string, { name: string; ids: string[]; streamId: string | null }>();

  for (const s of subjects) {
    const baseName = s.name.replace(/\s*\(.*?\)\s*$/, "").trim();
    const key = baseName.toLowerCase();
    const isShared = SHARED.some((k) => key.startsWith(k));

    if (isShared) {
      // Merge all stream variants into one entry, strip suffix, streamId: null
      if (!map.has(baseName)) {
        map.set(baseName, { name: baseName, ids: [s.id], streamId: null });
      } else {
        map.get(baseName)!.ids.push(s.id);
      }
    } else {
      // Group by (baseName + streamId) so two subjects with the same name but
      // different streamIds each get their own card.
      const groupKey = `${baseName}::${s.streamId ?? ""}`;
      if (!map.has(groupKey)) {
        const displayName = s.streamId
          ? `${baseName} (${streamNameById.get(s.streamId) ?? s.streamId})`
          : baseName;
        map.set(groupKey, { name: displayName, ids: [s.id], streamId: s.streamId });
      } else {
        map.get(groupKey)!.ids.push(s.id);
      }
    }
  }

  return Array.from(map.values());
}

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
  subjectId: string;
  subjectName: string;
  subjectIds: string[]; // all IDs for this subject (shared subjects have multiple)
  /** null means this is a shared subject (English, Aptitude, Civics) — no stream picker */
  groupStreamId: string | null;
  onGenerate: (subjectId: string, questionCount: number) => void;
  generating: boolean;
  allSubjects: MockSubject[];
  streamNameById: Map<string, string>;
}
const GenerateDialog = ({
  open, onClose, subjectId, subjectName, subjectIds, groupStreamId,
  onGenerate, generating, allSubjects, streamNameById,
}: GenerateDialogProps) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjectId);
  const [questionCount, setQuestionCount] = useState("50");

  // Reset when dialog opens
  const handleOpen = (v: boolean) => {
    if (v) { setSelectedSubjectId(subjectId); setQuestionCount("50"); }
    else onClose();
  };

  // Filter to only the subjects matching this subject group
  const relevantSubjects = allSubjects.filter((s) => subjectIds.includes(s.id));

  // Show stream selector only for stream-specific subjects (groupStreamId !== null)
  // Shared subjects (English, Aptitude, Civics) have groupStreamId === null — no picker needed
  const showStreamPicker = groupStreamId !== null && relevantSubjects.length > 1;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Mock Exam — {subjectName}
          </DialogTitle>
          <DialogDescription>
            Mistral AI will generate EUEE-style questions. Existing questions are automatically avoided.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          {showStreamPicker && (
            <div className="space-y-1.5">
              <Label>Stream *</Label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {relevantSubjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {streamNameById.get(s.streamId ?? "") ?? s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Number of Questions *</Label>
            <Input
              type="number" min={5} max={100}
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
                <p className="text-xs text-muted-foreground mt-0.5">Runs in background. Dialog closes when done.</p>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={generating}>Cancel</Button>
          <Button
            onClick={() => onGenerate(selectedSubjectId, parseInt(questionCount) || 50)}
            disabled={!selectedSubjectId || generating}
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

// ─── Subject Grid Card ────────────────────────────────────────────────────────
interface SubjectCardProps {
  name: string;
  examCount: number;
  onClick: () => void;
}
const SubjectCard = ({ name, examCount, onClick }: SubjectCardProps) => {
  const Icon = getSubjectIcon(name);
  const colorClass = getSubjectColor(name);
  // Split "Mathematics (Natural Science)" → title: "Mathematics", stream: "Natural Science"
  const streamMatch = name.match(/\(([^)]+)\)$/);
  const displayName = streamMatch ? name.replace(/\s*\([^)]+\)$/, "").trim() : name;
  const streamLabel = streamMatch ? streamMatch[1] : null;
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start gap-3 rounded-xl border p-5 text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${colorClass} bg-card`}
    >
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colorClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="w-full">
        <p className="font-semibold text-sm leading-tight">{displayName}</p>
        {streamLabel && (
          <p className="text-xs font-medium mt-0.5 opacity-80">{streamLabel}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {examCount === 0 ? "No exams yet" : `${examCount} exam${examCount !== 1 ? "s" : ""}`}
        </p>
      </div>
    </button>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const MockExamsPage = () => {
  const { token, initialized } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  // ── All useState hooks first ───────────────────────────────────────────────
  const [selectedSubjectName, setSelectedSubjectName] = useState<string | null>(null);
  const [streamFilter, setStreamFilter]     = useState<string>("all"); // "all" | "natural" | "social"
  const [examSearch, setExamSearch]         = useState("");
  const [sessionSearch, setSessionSearch]   = useState("");
  const [sessionSubjectFilter, setSessionSubjectFilter] = useState("all");
  const [sessionPage, setSessionPage]       = useState(1);
  const [generateOpen, setGenerateOpen]     = useState(false);
  const [generateSubjectGroup, setGenerateSubjectGroup] = useState<{
    name: string; ids: string[]; streamId: string | null;
  } | null>(null);
  const [previewExam, setPreviewExam]       = useState<MockExamDetail | null>(null);
  const [previewOpen, setPreviewOpen]       = useState(false);
  const [deleteTarget, setDeleteTarget]     = useState<{ id: string; label: string } | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget]         = useState<{ id: string; label: string } | null>(null);
  const [renameValue, setRenameValue]           = useState("");

  // Duration + Free/Paid dialog state
  const [durationTarget, setDurationTarget] = useState<{ id: string; label: string; current: number | null; currentIsFree: boolean } | null>(null);
  const [durationValue, setDurationValue]   = useState("");
  const [isFreeValue, setIsFreeValue]       = useState(false);

  const sessionPerPage = 20;

  // ── Streams ────────────────────────────────────────────────────────────────
  const { data: streams = [] } = useQuery<Stream[], Error>({
    queryKey: ["streams"],
    queryFn: ({ signal }) => fetchStreams(signal),
    enabled: initialized && !!token,
    staleTime: 10 * 60 * 1000,
  });
  const streamNameById = useMemo(() => new Map(streams.map((s) => [s.id, s.name])), [streams]);

  // ── Subjects ───────────────────────────────────────────────────────────────
  const { data: mockSubjects = [], isLoading: subjectsLoading } = useQuery<MockSubject[], Error>({
    queryKey: ["mock-subjects"],
    queryFn: ({ signal }) => fetchMockSubjects(signal),
    enabled: initialized && !!token,
    staleTime: 60_000,
  });

  const { data: allSubjects = [] } = useQuery<Subject[], Error>({
    queryKey: ["subjects", "all"],
    queryFn: ({ signal }) => fetchSubjects(undefined, signal),
    enabled: initialized && !!token,
    staleTime: 5 * 60 * 1000,
  });

  // ── Admin mock exams list ──────────────────────────────────────────────────
  const { data: adminExams = [], isLoading: examsLoading } = useQuery<MockExamSummary[], Error>({
    queryKey: ["admin-mock-exams"],
    queryFn: ({ signal }) => fetchAdminMockExams(undefined, signal),
    enabled: initialized && !!token,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // ── Mock exam results ──────────────────────────────────────────────────────
  const { data: resultsData, isLoading: resultsLoading } = useQuery({
    queryKey: ["mock-results", sessionPage, sessionSubjectFilter],
    queryFn: ({ signal }) => fetchMockResults({
      page: sessionPage,
      limit: sessionPerPage,
      subjectId: sessionSubjectFilter === "all" ? undefined : sessionSubjectFilter,
    }, signal),
    enabled: initialized && !!token,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
  const results: MockResult[]  = resultsData?.data ?? [];
  const resultsTotal           = resultsData?.total ?? 0;
  const resultsTotalPages      = resultsData?.totalPages ?? 1;

  // ── Derived data — all useMemo in dependency order ─────────────────────────

  // 1. Subject groups (must come before selectedSubjectGroup)
  const subjectGroups = useMemo(
    () => deduplicateSubjects(mockSubjects, streamNameById),
    [mockSubjects, streamNameById],
  );

  // 2. Resolve selected group from live subjectGroups — always up-to-date IDs
  //    This is the key fix: shared subjects (Aptitude, English, Civics) have
  //    multiple stream IDs; storing only the name ensures we always use the
  //    current ID list after any query invalidation.
  const selectedSubjectGroup = useMemo(
    () => selectedSubjectName
      ? (subjectGroups.find((g) => g.name === selectedSubjectName) ?? null)
      : null,
    [selectedSubjectName, subjectGroups],
  );

  // 3. Exam count per card
  const examCountByGroupName = useMemo(() => {
    const map = new Map<string, number>();
    for (const group of subjectGroups) {
      const count = adminExams.filter((e) => group.ids.includes(e.subjectId)).length;
      map.set(group.name, count);
    }
    return map;
  }, [subjectGroups, adminExams]);

  // 4. Exams for the drilled-in subject — uses live IDs from selectedSubjectGroup
  const groupFilteredExams = useMemo(() => {
    if (!selectedSubjectGroup) return adminExams;
    return adminExams.filter((e) => selectedSubjectGroup.ids.includes(e.subjectId));
  }, [adminExams, selectedSubjectGroup]);

  // 5. Subject name lookup for exam table
  const subjectNameById = useMemo(
    () => new Map(allSubjects.map((s) => [s.id, s.name])),
    [allSubjects],
  );

  const filteredExams = groupFilteredExams.filter((e) =>
    !examSearch || e.label.toLowerCase().includes(examSearch.toLowerCase()),
  );

  const filteredResults = results.filter((r) =>
    !sessionSearch ||
    r.studentName.toLowerCase().includes(sessionSearch.toLowerCase()) ||
    r.subjectName.toLowerCase().includes(sessionSearch.toLowerCase()) ||
    r.examLabel.toLowerCase().includes(sessionSearch.toLowerCase()) ||
    r.studentPhone.includes(sessionSearch),
  );

  // ── Mutations ──────────────────────────────────────────────────────────────

  const generateMutation = useMutation({
    mutationFn: async ({ subjectId, questionCount }: { subjectId: string; questionCount: number }) => {
      const pending = await generateMockExam(subjectId, questionCount);
      qc.invalidateQueries({ queryKey: ["admin-mock-exams"] });
      const done = await pollMockExamUntilDone(pending.id);
      return done;
    },
    onSuccess: (exam) => {
      qc.invalidateQueries({ queryKey: ["admin-mock-exams"] });
      qc.invalidateQueries({ queryKey: ["mock-subjects"] });
      toast({
        title: "Exam generated",
        description: `${exam.label} created with ${exam.questionCount} questions.`,
      });
      setGenerateOpen(false);
      setGenerateSubjectGroup(null);
    },
    onError: (e: Error) => toast({
      title: "Generation failed",
      description: e.message,
      variant: "destructive",
    }),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) =>
      renameMockExam(id, label),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin-mock-exams"] });
      toast({ title: "Renamed", description: `Exam renamed to "${data.label}"` });
      setRenameTarget(null);
      setRenameValue("");
    },
    onError: (e: Error) => toast({ title: "Rename failed", description: e.message, variant: "destructive" }),
  });

  const durationMutation = useMutation({
    mutationFn: ({ id, durationMinutes, isFree }: { id: string; durationMinutes: number | null; isFree: boolean }) =>
      updateMockExamDuration(id, durationMinutes, isFree),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-mock-exams"] });
      
      setDurationTarget(null);
      setDurationValue("");
    },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMockExam(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-mock-exams"] });
      toast({ title: "Exam deleted" });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

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

  const handleOpenGenerate = (group: { name: string; ids: string[]; streamId: string | null }) => {
    setGenerateSubjectGroup(group);
    setGenerateOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {selectedSubjectGroup && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => { setSelectedSubjectName(null); setExamSearch(""); }}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h2 className="text-lg font-semibold">
              {selectedSubjectGroup ? selectedSubjectGroup.name : "Mock Exams"}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {selectedSubjectGroup
                ? "AI-powered EUEE mock exams for this subject."
                : "Generate AI-powered EUEE mock exams and monitor student results."}
            </p>
          </div>
        </div>
        {selectedSubjectGroup && (
          <Button onClick={() => handleOpenGenerate(selectedSubjectGroup)}>
            <Sparkles className="h-4 w-4 mr-1" /> Create Mock Exam
          </Button>
        )}
      </div>

      <Tabs defaultValue="exams">
        <TabsList>
          <TabsTrigger value="exams">Mock Exams</TabsTrigger>
          <TabsTrigger value="sessions">Student Results</TabsTrigger>
        </TabsList>

        {/* ══ EXAMS TAB ═════════════════════════════════════════════════════ */}
        <TabsContent value="exams" className="mt-4 space-y-4">

          {/* ── Subject Grid (no subject selected) ── */}
          {!selectedSubjectGroup ? (
            subjectsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : subjectGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <BookOpen className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">No subjects available</p>
                <p className="text-xs mt-1">Subjects will appear here once configured.</p>
              </div>
            ) : (
              <>
                {/* Stream filter for subject grid */}
                <div className="flex gap-2 mb-2">
                  {["all", "natural", "social"].map((f) => (
                    <Button
                      key={f}
                      variant={streamFilter === f ? "default" : "outline"}
                      size="sm"
                      className="text-xs"
                      onClick={() => setStreamFilter(f)}
                    >
                      {f === "all" ? "All Streams" : f === "natural" ? "Natural Science" : "Social Science"}
                    </Button>
                  ))}
                </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {subjectGroups
                  .filter((group) => {
                    if (streamFilter === "all") return true;
                    const nameLower = group.name.toLowerCase();
                    if (streamFilter === "natural") return nameLower.includes("natural") || (!nameLower.includes("social") && !nameLower.includes("natural"));
                    if (streamFilter === "social") return nameLower.includes("social") || (!nameLower.includes("natural") && !nameLower.includes("social"));
                    return true;
                  })
                  .map((group) => (
                  <SubjectCard
                    key={group.name}
                    name={group.name}
                    examCount={examCountByGroupName.get(group.name) ?? 0}
                    onClick={() => setSelectedSubjectName(group.name)}
                  />
                ))}
              </div>
              </>
            )
          ) : (
            /* ── Exam List (subject drilled in) ── */
            <>
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search exams…"
                    value={examSearch}
                    onChange={(e) => setExamSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {examsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
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
                        {["Exam", "Subject", "Questions", "Duration", "Created", "Actions"].map((h) => (
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
                          <td className="p-3">
                            <div className="flex items-center gap-2 text-sm">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                {exam.durationMinutes
                                  ? <span>{exam.durationMinutes} min</span>
                                  : <span className="text-muted-foreground text-xs">Auto (~{Math.ceil(exam.questionCount * 1.5)} min)</span>}
                              </div>
                              <Badge
                                variant="outline"
                                className={exam.isFree
                                  ? "bg-success/10 text-success border-success/20 text-xs"
                                  : "bg-muted text-muted-foreground text-xs"}
                              >
                                {exam.isFree ? "Free" : "Paid"}
                              </Badge>
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
                                className="h-8 w-8"
                                title="Rename"
                                onClick={() => { setRenameTarget({ id: exam.id, label: exam.label }); setRenameValue(exam.label); }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Set duration & access"
                                onClick={() => {
                                  setDurationTarget({ id: exam.id, label: exam.label, current: exam.durationMinutes, currentIsFree: exam.isFree });
                                  setDurationValue(exam.durationMinutes ? String(exam.durationMinutes) : "");
                                  setIsFreeValue(exam.isFree);
                                }}
                              >
                                <Clock className="h-4 w-4" />
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
            </>
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

          {resultsLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <BookOpen className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">{sessionSearch ? "No results match your search." : "No exam results recorded yet."}</p>
            </div>
          ) : (
            <>
              <div className="bg-card rounded-xl border shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {["Student", "Exam", "Subject", "Score", "Result", "Date"].map((h) => (
                        <th key={h} className="p-3 text-left font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map((result) => (
                      <tr key={result.sessionId} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <p className="font-medium">{result.studentName}</p>
                          <p className="text-xs text-muted-foreground">{result.studentPhone}</p>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">{result.examLabel}</td>
                        <td className="p-3 text-sm">{result.subjectName}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{result.scorePercent}%</span>
                            <span className="text-xs text-muted-foreground">({result.correct}/{result.totalQ})</span>
                          </div>
                        </td>
                        <td className="p-3">
                          {result.passed
                            ? <div className="flex items-center gap-1.5 text-success text-xs font-medium"><CheckCircle2 className="h-4 w-4" />Passed</div>
                            : <div className="flex items-center gap-1.5 text-destructive text-xs font-medium"><XCircle className="h-4 w-4" />Failed</div>}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {new Date(result.takenAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {resultsTotal === 0 ? "No results" : `Showing ${(sessionPage - 1) * sessionPerPage + 1}–${Math.min(sessionPage * sessionPerPage, resultsTotal)} of ${resultsTotal}`}
                </p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={sessionPage === 1} onClick={() => setSessionPage(sessionPage - 1)}>Previous</Button>
                  {Array.from({ length: Math.min(5, resultsTotalPages) }, (_, i) => {
                    const p = sessionPage <= 3 ? i + 1 : sessionPage - 2 + i;
                    if (p > resultsTotalPages) return null;
                    return <Button key={p} variant={p === sessionPage ? "default" : "outline"} size="sm" onClick={() => setSessionPage(p)}>{p}</Button>;
                  })}
                  <Button variant="outline" size="sm" disabled={sessionPage >= resultsTotalPages} onClick={() => setSessionPage(sessionPage + 1)}>Next</Button>
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Generate Dialog ── */}
      {generateSubjectGroup && (
        <GenerateDialog
          open={generateOpen}
          onClose={() => { setGenerateOpen(false); setGenerateSubjectGroup(null); }}
          subjectId={generateSubjectGroup.ids[0]}
          subjectName={generateSubjectGroup.name}
          subjectIds={generateSubjectGroup.ids}
          groupStreamId={generateSubjectGroup.streamId}
          allSubjects={mockSubjects}
          streamNameById={streamNameById}
          generating={generateMutation.isPending}
          onGenerate={(subjectId, questionCount) =>
            generateMutation.mutate({ subjectId, questionCount })
          }
        />
      )}

      {/* ── Preview Dialog ── */}
      <ExamDetailDialog
        exam={previewExam}
        open={previewOpen}
        onClose={() => { setPreviewOpen(false); setPreviewExam(null); }}
      />

      {/* ── Rename Dialog ── */}
      <Dialog open={!!renameTarget} onOpenChange={(v) => !v && setRenameTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Exam</DialogTitle>
            <DialogDescription>Enter a new name for this mock exam.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="e.g. Mock Exam 1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && renameValue.trim() && renameTarget) {
                  renameMutation.mutate({ id: renameTarget.id, label: renameValue.trim() });
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancel</Button>
            <Button
              disabled={!renameValue.trim() || renameMutation.isPending}
              onClick={() => renameTarget && renameMutation.mutate({ id: renameTarget.id, label: renameValue.trim() })}
            >
              {renameMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Duration & Access Dialog ── */}
      <Dialog open={!!durationTarget} onOpenChange={(v) => !v && setDurationTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Exam Duration & Access</DialogTitle>
            <DialogDescription>
              Override the timer and access level for "{durationTarget?.label}". Leave duration empty to use the automatic value (questions × 1.5 min).
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div className="space-y-1.5">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                min={1}
                value={durationValue}
                onChange={(e) => setDurationValue(e.target.value)}
                placeholder="Auto"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Access</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsFreeValue(true)}
                  className={`rounded-lg border-2 py-2 text-sm font-medium transition-colors ${
                    isFreeValue ? "border-primary bg-primary/10 text-primary" : "border-muted text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  Free
                </button>
                <button
                  type="button"
                  onClick={() => setIsFreeValue(false)}
                  className={`rounded-lg border-2 py-2 text-sm font-medium transition-colors ${
                    !isFreeValue ? "border-primary bg-primary/10 text-primary" : "border-muted text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  Paid
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {durationTarget?.current != null && (
              <Button
                variant="outline"
                disabled={durationMutation.isPending}
                onClick={() => durationTarget && durationMutation.mutate({ id: durationTarget.id, durationMinutes: null, isFree: isFreeValue })}
              >
                Reset Duration to Auto
              </Button>
            )}
            <Button variant="outline" onClick={() => setDurationTarget(null)}>Cancel</Button>
            <Button
              disabled={durationMutation.isPending}
              onClick={() => {
                if (!durationTarget) return;
                const n = durationValue.trim() === "" ? null : parseInt(durationValue, 10);
                durationMutation.mutate({ id: durationTarget.id, durationMinutes: n, isFree: isFreeValue });
              }}
            >
              {durationMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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