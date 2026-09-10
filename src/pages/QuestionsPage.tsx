import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Plus, Upload, Pencil, Trash2, Search, Loader2,
  FileDown, FileUp, CheckCircle2, AlertCircle, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/context/AuthContext";
import {
  bulkUploadQuestions,
  deleteQuestion,
  deleteQuestionsBulk,
  fetchQuestionById,
  fetchQuestions,
  fetchStreams,
  fetchSubjects,
  type Question,
  type Stream,
  type Subject,
} from "@/services/api/questions";
import { MathText } from "@/components/MathText";

const difficultyColors: Record<string, string> = {
  easy:   "bg-success/10 text-success border-success/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  hard:   "bg-destructive/10 text-destructive border-destructive/20",
};

// ─── CSV template — structure only, example rows from real DB subjects ────────
const CSV_TEMPLATE_HEADERS = [
  "text", "options", "correctAnswer", "difficulty", "subjectName", "topicName", "explanation",
];

function downloadCsvTemplate(
  subjects: { id: string; name: string; streamId?: string | null }[],
  streamNameById: Map<string, string>,
) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;

  // One example row per subject from the DB (max 5 to keep file small)
  const exampleRows = subjects.slice(0, 5).map((s) => {
    const streamName = s.streamId ? (streamNameById.get(s.streamId) ?? "") : "";
    return [
      escape("Sample question text here?"),
      escape("Option A|Option B|Option C|Option D"),
      escape("Option A"),
      escape("easy"),
      escape(s.name),
      escape(""),
      escape(""),
    ].join(",");
  });

  // If no subjects loaded yet, fall back to one blank example row
  if (exampleRows.length === 0) {
    exampleRows.push([
      escape("Sample question text here?"),
      escape("Option A|Option B|Option C|Option D"),
      escape("Option A"),
      escape("easy"),
      escape("SubjectName"),
      escape(""),
      escape(""),
    ].join(","));
  }

  const rows = [CSV_TEMPLATE_HEADERS.join(","), ...exampleRows];
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "scorenova_questions_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

interface UploadResult {
  created: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  subjects: Subject[];
  streamNameById: Map<string, string>;
}

const UploadModal = ({ open, onClose, onSuccess, subjects, streamNameById }: UploadModalProps) => {
  const { toast } = useToast();
  const [file, setFile]         = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<UploadResult | null>(null);

  const reset = () => { setFile(null); setResult(null); setLoading(false); };

  const handleClose = () => { reset(); onClose(); };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
    e.target.value = "";
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await bulkUploadQuestions(file);
      setResult(res);
      if (res.created > 0) onSuccess();
    } catch (err: unknown) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-primary" />
            Import Questions
          </DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to bulk-import questions.
          </DialogDescription>
        </DialogHeader>

        {/* Template download */}
        <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Download Template</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Use this CSV template to format your questions correctly.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => downloadCsvTemplate(subjects, streamNameById)}>
            <FileDown className="h-4 w-4 mr-1" /> Template
          </Button>
        </div>

        {/* Column reference */}
        <div className="rounded-lg border bg-muted/20 px-4 py-3 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Required columns
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {["text", "correctAnswer", "subjectName"].map((c) => (
              <span key={c} className="text-xs bg-primary/10 text-primary rounded px-2 py-0.5 font-mono">
                {c}
              </span>
            ))}
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-2">
            Optional columns
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {["options (pipe-separated)", "difficulty", "topicName", "explanation"].map((c) => (
              <span key={c} className="text-xs bg-muted text-muted-foreground rounded px-2 py-0.5 font-mono">
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* Drop zone */}
        {!result && (
          <>
            {loading && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 flex items-start gap-2">
                <Loader2 className="h-4 w-4 text-warning animate-spin shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-warning">Processing your file…</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Large files (4,000+ rows) can take a few minutes. Please keep this window open.
                  </p>
                </div>
              </div>
            )}
            <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 transition-colors cursor-pointer
              ${dragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"}`}
            onClick={() => document.getElementById("csv-file-input")?.click()}
          >
            <input
              id="csv-file-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
            <Upload className="h-8 w-8 text-muted-foreground mb-3" />
            {file ? (
              <div className="text-center">
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                >
                  <X className="h-3 w-3 mr-1" /> Remove
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm font-medium">Drop your file here</p>
                <p className="text-xs text-muted-foreground mt-1">
                  or click to browse — CSV, XLSX, XLS
                </p>
              </div>
            )}
          </div>
          </>
        )}

        {/* Result summary */}
        {result && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-success/10 border border-success/20 p-3 text-center">
                <p className="text-2xl font-bold text-success">{result.created}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Created</p>
              </div>
              <div className="rounded-lg bg-warning/10 border border-warning/20 p-3 text-center">
                <p className="text-2xl font-bold text-warning">{result.skipped}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Skipped</p>
              </div>
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-center">
                <p className="text-2xl font-bold text-destructive">{result.errors?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Errors</p>
              </div>
            </div>

            {result.errors?.length > 0 && (
              <div className="rounded-lg border bg-destructive/5 p-3 max-h-36 overflow-y-auto space-y-1">
                {result.errors.slice(0, 10).map((e, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">
                      <span className="font-medium text-foreground">Row {e.row}:</span> {e.reason}
                    </span>
                  </div>
                ))}
                {result.errors.length > 10 && (
                  <p className="text-xs text-muted-foreground pl-5">
                    +{result.errors.length - 10} more errors…
                  </p>
                )}
              </div>
            )}

            {result.created > 0 && (
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" />
                {result.created} question{result.created !== 1 ? "s" : ""} imported successfully.
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button onClick={handleUpload} disabled={!file || loading}>
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Processing… (may take a few minutes)</>
              ) : (
                <><Upload className="h-4 w-4 mr-1" />Upload</>
              )}
            </Button>
          )}
          {result && (
            <Button onClick={reset}>
              Upload Another
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const QuestionsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { token, initialized } = useAuth();

  const [search, setSearch]               = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [streamFilter, setStreamFilter]   = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [selected, setSelected]           = useState<Set<string>>(new Set());
  const [page, setPage]                   = useState(1);
  const [deleteDialog, setDeleteDialog]   = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [uploadModalOpen, setUploadModalOpen]   = useState(false);
  const perPage = 10;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // ── Streams
  const { data: streams = [], isFetching: streamsLoading } = useQuery<Stream[], Error>({
    queryKey: ["streams"],
    queryFn: ({ signal }) => fetchStreams(signal),
    enabled: initialized && !!token,
    staleTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // ── Subjects
  const { data: subjectsAll = [], isFetching: subjectsLoading } = useQuery<Subject[], Error>({
    queryKey: ["subjects", "all"],
    queryFn: ({ signal }) => fetchSubjects(undefined, signal),
    enabled: initialized && !!token,
    staleTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const subjects = useMemo(() => {
    const pool = streamFilter === "all"
      ? subjectsAll
      : subjectsAll.filter((s) => s.streamId === streamFilter);

    // Deduplicate by name — keep the first occurrence of each name.
    // This prevents showing "Aptitude × 2", "Civics × 2", etc. when
    // the same subject exists under multiple streams.
    const seen = new Set<string>();
    return pool.filter((s) => {
      const key = s.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [subjectsAll, streamFilter]);

  // When a subject name is selected in the filter, collect ALL subject IDs
  // with that name (across streams) so questions from both streams show.
  const resolvedSubjectIds = useMemo(() => {
    if (subjectFilter === "all") return undefined;
    const selected = subjectsAll.find((s) => s.id === subjectFilter);
    if (!selected) return subjectFilter;
    // Find all subjects with the same name (e.g. Aptitude in both streams)
    const allIds = subjectsAll
      .filter((s) => s.name.toLowerCase() === selected.name.toLowerCase())
      .map((s) => s.id);
    return allIds.join(","); // comma-separated for backend
  }, [subjectFilter, subjectsAll]);

  const subjectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of subjectsAll) map.set(s.id, s.name);
    return map;
  }, [subjectsAll]);

  // Map subjectId → streamId so we can look up stream name per question
  const subjectStreamIdById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of subjectsAll) if (s.streamId) map.set(s.id, s.streamId);
    return map;
  }, [subjectsAll]);

  const streamNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of streams) map.set(s.id, s.name);
    return map;
  }, [streams]);

  useEffect(() => { setSubjectFilter("all"); setPage(1); }, [streamFilter]);

  // ── Questions
  const { data: questionsData, isLoading: loading } = useQuery<
    { data: Question[]; total: number; totalPages: number }, Error
  >({
    queryKey: ["questions", page, streamFilter, subjectFilter, resolvedSubjectIds, difficultyFilter, debouncedSearch],
    queryFn: ({ signal }) =>
      fetchQuestions({
        page, limit: perPage,
        streamId:   streamFilter === "all" ? undefined : streamFilter,
        subjectId:  resolvedSubjectIds,
        difficulty: difficultyFilter === "all" ? undefined : difficultyFilter,
        search:     debouncedSearch.trim() || undefined,
      }, signal),
    enabled: initialized && !!token,
    staleTime: 2 * 60 * 1000,
    gcTime:    5 * 60 * 1000,
    placeholderData: (prev) => prev,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error?.message?.includes("429")) return false;
      return failureCount < 1;
    },
    retryDelay: 3000,
  });

  const questions  = questionsData?.data ?? [];
  const total      = questionsData?.total ?? 0;
  const totalPages = questionsData?.totalPages ?? 1;

  // ── Delete
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteQuestion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      toast({ title: "Deleted", description: "Question deleted." });
      setDeleteDialog(false);
      setQuestionToDelete(null);
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // ── Bulk delete
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => deleteQuestionsBulk(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      toast({ title: "Deleted", description: `${selected.size} questions deleted.` });
      setSelected(new Set());
      setBulkDeleteDialog(false);
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  };

  const toggleAll = () =>
    setSelected(selected.size === questions.length ? new Set() : new Set(questions.map((q) => q.id)));

  return (
    <div className="space-y-6">

      {/* ── Top Metrics Ribbon ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Question Bank</span>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">{loading ? "—" : total.toLocaleString()}</p>
          <span className="text-[11px] text-muted-foreground">National Exam Items</span>
        </div>
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Curriculum Streams</span>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">{streams.length || 2}</p>
          <span className="text-[11px] text-muted-foreground">Natural & Social Science</span>
        </div>
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active Subjects</span>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">{subjectsAll.length || 10}</p>
          <span className="text-[11px] text-muted-foreground">Across both streams</span>
        </div>
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Page Items</span>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">{questions.length}</p>
          <span className="text-[11px] text-muted-foreground">Items in current view</span>
        </div>
      </div>

      {/* ── Filters & Actions Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-3 sm:p-4 shadow-xs">
        <div className="flex flex-1 flex-wrap items-center gap-2.5 min-w-[240px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search question text or math formulas..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 pr-8 h-9 text-xs"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Stream */}
          <Select value={streamFilter} onValueChange={(v) => { setStreamFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40 h-9 text-xs font-medium">
              <SelectValue placeholder={streamsLoading ? "Loading..." : "All Streams"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Streams</SelectItem>
              {streams.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Subject */}
          <Select value={subjectFilter} onValueChange={(v) => { setSubjectFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40 h-9 text-xs font-medium">
              <SelectValue placeholder={subjectsLoading ? "Loading..." : "All Subjects"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Difficulty */}
          <Select value={difficultyFilter} onValueChange={(v) => { setDifficultyFilter(v); setPage(1); }}>
            <SelectTrigger className="w-32 h-9 text-xs font-medium">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Difficulties</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs shadow-xs"
            onClick={() => setUploadModalOpen(true)}
          >
            <Upload className="h-3.5 w-3.5 text-muted-foreground" /> Import CSV
          </Button>

          <Button
            size="sm"
            className="h-9 gap-1.5 text-xs shadow-xs"
            onClick={() => navigate("/questions/new")}
          >
            <Plus className="h-3.5 w-3.5" /> Add Question
          </Button>
        </div>
      </div>

      {/* ── Bulk actions ── */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 p-3 animate-slide-in">
          <span className="text-xs font-semibold text-primary">
            {selected.size} question{selected.size > 1 ? "s" : ""} selected for bulk action
          </span>
          <Button
            variant="destructive"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setBulkDeleteDialog(true)}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete Selected
          </Button>
        </div>
      )}

      {/* ── Modern Table ── */}
      <div className="rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="py-3 px-4 w-10">
                  <Checkbox
                    checked={selected.size === questions.length && questions.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </th>
                <th className="py-3 px-4">Question</th>
                <th className="py-3 px-4">Stream</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Difficulty</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    <p className="text-xs text-muted-foreground mt-2">Loading national exam questions...</p>
                  </td>
                </tr>
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-muted-foreground">
                    <p className="text-sm font-semibold text-foreground">No questions found</p>
                    <p className="text-xs text-muted-foreground mt-1">Try refining your search terms or filter selection.</p>
                  </td>
                </tr>
              ) : (
                questions.map((q) => {
                  const subjectName = q.subjectName ?? subjectNameById.get(q.subjectId ?? "") ?? "—";
                  const streamId = subjectStreamIdById.get(q.subjectId ?? "");
                  const streamName = (streamId ? streamNameById.get(streamId) : null) || "—";
                  const isNatural = streamName.toLowerCase().includes("natural");
                  const isSocial = streamName.toLowerCase().includes("social");

                  return (
                    <tr key={q.id} className="group hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-4">
                        <Checkbox checked={selected.has(q.id)} onCheckedChange={() => toggleSelect(q.id)} />
                      </td>
                      <td className="py-3 px-4 max-w-md font-medium text-foreground">
                        <div className="line-clamp-2">
                          <MathText text={q.text} />
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                            isNatural
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : isSocial
                                ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20"
                                : "bg-muted text-muted-foreground",
                          )}
                        >
                          {streamName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-medium whitespace-nowrap">
                        {subjectName}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className={cn("text-[10px] uppercase font-bold", difficultyColors[q.difficulty?.toLowerCase()] ?? "")}>
                          {q.difficulty || "medium"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={async () => {
                              try {
                                const full = await fetchQuestionById(q.id);
                                navigate("/questions/new", { state: { question: full, isEdit: true } });
                              } catch {
                                toast({ title: "Error", description: "Failed to load question for editing.", variant: "destructive" });
                              }
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => { setQuestionToDelete(q); setDeleteDialog(true); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <div className="flex items-center justify-between border-t border-border/60 px-4 py-3 bg-card">
          <p className="text-xs text-muted-foreground">
            {total === 0 ? "No questions matching criteria" : `Showing ${(page - 1) * perPage + 1}–${Math.min(page * perPage, total)} of ${total.toLocaleString()} questions`}
          </p>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-8 text-xs" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = page <= 3 ? i + 1 : page - 2 + i;
              if (p > totalPages) return null;
              return (
                <Button key={p} variant={p === page ? "default" : "outline"} size="sm" className="h-8 w-8 p-0 text-xs" onClick={() => setPage(p)}>
                  {p}
                </Button>
              );
            })}
            <Button variant="outline" size="sm" className="h-8 text-xs" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* ── Upload Modal ── */}
      <UploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["questions"] })}
        subjects={subjectsAll}
        streamNameById={streamNameById}
      />

      {/* ── Delete dialog ── */}
      <Dialog open={deleteDialog} onOpenChange={(v) => !v && setDeleteDialog(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Question</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground truncate">"{questionToDelete?.text}"</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)} disabled={deleteMutation.isPending}>Cancel</Button>
            <Button variant="destructive"
              onClick={() => questionToDelete && deleteMutation.mutate(questionToDelete.id)}
              disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Deleting…</> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk delete dialog ── */}
      <Dialog open={bulkDeleteDialog} onOpenChange={(v) => !v && setBulkDeleteDialog(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {selected.size} Questions</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialog(false)} disabled={bulkDeleteMutation.isPending}>Cancel</Button>
            <Button variant="destructive"
              onClick={() => bulkDeleteMutation.mutate(Array.from(selected))}
              disabled={bulkDeleteMutation.isPending}>
              {bulkDeleteMutation.isPending
                ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Deleting…</>
                : `Delete ${selected.size}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuestionsPage;
