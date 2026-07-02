import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  a.download = "learnova_questions_template.csv";
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
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () =>
    setSelected(selected.size === questions.length ? new Set() : new Set(questions.map((q) => q.id)));

  return (
    <div className="space-y-4">

      {/* ── Filters ── */}
      <div className="flex flex-wrap lg:flex-nowrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>

        <Select value={streamFilter} onValueChange={(v) => { setStreamFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={streamsLoading ? "Loading..." : "Stream"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Streams</SelectItem>
            {streams.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={subjectFilter} onValueChange={(v) => { setSubjectFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={subjectsLoading ? "Loading..." : "Subject"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={difficultyFilter} onValueChange={(v) => { setDifficultyFilter(v); setPage(1); }}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>

        {/* Import button — opens modal */}
        <Button variant="outline" onClick={() => setUploadModalOpen(true)}>
          <Upload className="h-4 w-4 mr-1" /> Import CSV/Excel
        </Button>

        <Button onClick={() => navigate("/questions/new")}>
          <Plus className="h-4 w-4 mr-1" /> Add New
        </Button>
      </div>

      {/* ── Bulk actions ── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-muted p-3 rounded-lg">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button variant="destructive" size="sm" onClick={() => setBulkDeleteDialog(true)}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-card rounded-lg border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 w-10">
                <Checkbox
                  checked={selected.size === questions.length && questions.length > 0}
                  onCheckedChange={toggleAll}
                />
              </th>
              <th className="p-3 text-left font-medium text-muted-foreground">Question</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Stream</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Subject</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Difficulty</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              </td></tr>
            ) : questions.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">
                No questions found.
              </td></tr>
            ) : questions.map((q) => {
              const subjectName = q.subjectName ?? subjectNameById.get(q.subjectId ?? "") ?? "—";
              const streamId = subjectStreamIdById.get(q.subjectId ?? "");
              const streamName = streamId ? (streamNameById.get(streamId) ?? "—") : "—";
              return (
                <tr key={q.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <Checkbox checked={selected.has(q.id)} onCheckedChange={() => toggleSelect(q.id)} />
                  </td>
                  <td className="p-3 max-w-xs truncate">{q.text}</td>
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{streamName}</td>
                  <td className="p-3 text-xs text-muted-foreground">{subjectName}</td>
                  <td className="p-3">
                    <Badge variant="outline" className={difficultyColors[q.difficulty] ?? ""}>
                      {q.difficulty || "—"}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8"
                        onClick={async () => {
                          try {
                            const full = await fetchQuestionById(q.id);
                            navigate("/questions/new", { state: { question: full, isEdit: true } });
                          } catch {
                            toast({ title: "Error", description: "Failed to load question for editing.", variant: "destructive" });
                          }
                        }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                        onClick={() => { setQuestionToDelete(q); setDeleteDialog(true); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total === 0 ? "No results" : `Showing ${(page - 1) * perPage + 1}–${Math.min(page * perPage, total)} of ${total}`}
        </p>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = page <= 3 ? i + 1 : page - 2 + i;
            if (p > totalPages) return null;
            return (
              <Button key={p} variant={p === page ? "default" : "outline"} size="sm" onClick={() => setPage(p)}>{p}</Button>
            );
          })}
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
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
