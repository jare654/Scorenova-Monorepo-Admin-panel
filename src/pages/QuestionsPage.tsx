import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Upload, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
  easy: "bg-success/10 text-success border-success/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  hard: "bg-destructive/10 text-destructive border-destructive/20",
};

const QuestionsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { token, initialized } = useAuth();

  const [search, setSearch] = useState("");
  const [streamFilter, setStreamFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const perPage = 10;

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

  // ── Subjects filtered by stream
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
    if (streamFilter === "all") return subjectsAll;
    return subjectsAll.filter((s) => s.streamId === streamFilter);
  }, [subjectsAll, streamFilter]);

  const subjectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of subjectsAll) map.set(s.id, s.name);
    return map;
  }, [subjectsAll]);

  // Reset subject filter when stream changes
  useEffect(() => {
    setSubjectFilter("all");
    setPage(1);
  }, [streamFilter]);

  // ── Questions
  const { data: questionsData, isLoading: loading } = useQuery<
    { data: Question[]; total: number; totalPages: number },
    Error
  >({
    queryKey: ["questions", page, streamFilter, subjectFilter, difficultyFilter, search],
    queryFn: ({ signal }) =>
      fetchQuestions(
        {
          page,
          limit: perPage,
          streamId: streamFilter === "all" ? undefined : streamFilter,
          subjectId: subjectFilter === "all" ? undefined : subjectFilter,
          difficulty: difficultyFilter === "all" ? undefined : difficultyFilter,
          search: search.trim() || undefined,
        },
        signal,
      ),
    enabled: initialized && !!token,
    placeholderData: (prev) => prev,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    retry: false,
  });

  const questions = questionsData?.data ?? [];
  const total = questionsData?.total ?? 0;
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

  const toggleAll = () => {
    setSelected(
      selected.size === questions.length
        ? new Set()
        : new Set(questions.map((q) => q.id)),
    );
  };

  // ── Bulk upload (CSV / Excel)
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    try {
      const result = await bulkUploadQuestions(file);
      const errorSummary =
        result.errors?.length
          ? `\n${result.errors.slice(0, 5).map((e) => `Row ${e.row}: ${e.reason}`).join("\n")}`
          : "";
      toast({
        title: result.created > 0 ? "Import complete" : "Import finished",
        description: `Created: ${result.created}, Skipped: ${result.skipped}${errorSummary}`,
        variant: result.errors?.length ? "destructive" : "default",
        duration: result.errors?.length ? 10000 : 4000,
      });
      if (result.created > 0) {
        queryClient.invalidateQueries({ queryKey: ["questions"] });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Import failed";
      toast({ title: "Import failed", description: message, variant: "destructive" });
    } finally {
      setImportLoading(false);
      e.target.value = "";
    }
  };

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

        {/* Stream filter */}
        <Select
          value={streamFilter}
          onValueChange={(v) => { setStreamFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={streamsLoading ? "Loading..." : "Stream"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Streams</SelectItem>
            {streams.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Subject filter */}
        <Select
          value={subjectFilter}
          onValueChange={(v) => { setSubjectFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={subjectsLoading ? "Loading..." : "Subject"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Difficulty filter */}
        <Select
          value={difficultyFilter}
          onValueChange={(v) => { setDifficultyFilter(v); setPage(1); }}
        >
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

        <Button variant="outline" asChild disabled={importLoading}>
          <label className="cursor-pointer whitespace-nowrap">
            {importLoading ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Importing...</>
            ) : (
              <><Upload className="h-4 w-4 mr-1" />Import CSV/Excel</>
            )}
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleImport}
              disabled={importLoading}
            />
          </label>
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
              <th className="p-3 text-left font-medium text-muted-foreground">Subject</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Difficulty</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </td>
              </tr>
            ) : questions.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No questions found.
                </td>
              </tr>
            ) : (
              questions.map((q) => {
                const subjectName = q.subjectName ?? subjectNameById.get(q.subjectId ?? "") ?? "—";
                return (
                  <tr key={q.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <Checkbox
                        checked={selected.has(q.id)}
                        onCheckedChange={() => toggleSelect(q.id)}
                      />
                    </td>
                    <td className="p-3 max-w-xs truncate">{q.text}</td>
                    <td className="p-3 text-xs text-muted-foreground">{subjectName}</td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={difficultyColors[q.difficulty] ?? ""}
                      >
                        {q.difficulty || "—"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={async () => {
                            try {
                              const full = await fetchQuestionById(q.id);
                              navigate("/questions/new", {
                                state: { question: full, isEdit: true },
                              });
                            } catch {
                              toast({
                                title: "Error",
                                description: "Failed to load question for editing.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => { setQuestionToDelete(q); setDeleteDialog(true); }}
                        >
                          <Trash2 className="h-4 w-4" />
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
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total === 0 ? "No results" : `Showing ${(page - 1) * perPage + 1}–${Math.min(page * perPage, total)} of ${total}`}
        </p>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = page <= 3 ? i + 1 : page - 2 + i;
            if (p > totalPages) return null;
            return (
              <Button key={p} variant={p === page ? "default" : "outline"} size="sm" onClick={() => setPage(p)}>
                {p}
              </Button>
            );
          })}
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      </div>

      {/* ── Delete dialog ── */}
      <Dialog open={deleteDialog} onOpenChange={(v) => !v && setDeleteDialog(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Question</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground truncate">"{questionToDelete?.text}"</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)} disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => questionToDelete && deleteMutation.mutate(questionToDelete.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Deleting...</> : "Delete"}
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
            <Button variant="outline" onClick={() => setBulkDeleteDialog(false)} disabled={bulkDeleteMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => bulkDeleteMutation.mutate(Array.from(selected))}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending
                ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Deleting...</>
                : `Delete ${selected.size}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuestionsPage;
