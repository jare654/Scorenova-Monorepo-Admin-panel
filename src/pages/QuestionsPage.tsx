import { useState, useEffect } from "react";
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
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/context/AuthContext";

const API_URL = "https://learnova-backen.onrender.com/api/v1";

const difficultyColors: Record<string, string> = {
  easy: "bg-success/10 text-success border-success/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  hard: "bg-destructive/10 text-destructive border-destructive/20",
};

type Grade = { id: string; name: string };
type Subject = { id: string; name: string; gradeId: string };

const QuestionsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { token } = useAuth();

  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const [questions, setQuestions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [grades, setGrades] = useState<Grade[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Bulk delete dialog
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  const perPage = 10;

  // Fetch grades on mount, then fetch subjects for all grades in parallel
  useEffect(() => {
    const fetchGrades = async () => {
      setGradesLoading(true);
      try {
        const res = await fetch(`${API_URL}/grades`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const arr: Grade[] = Array.isArray(json) ? json : (json.data ?? []);
        setGrades(arr);

        setSubjectsLoading(true);
        const results = await Promise.all(
          arr.map(async (g) => {
            try {
              const sRes = await fetch(`${API_URL}/subjects?gradeId=${g.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!sRes.ok) return [];
              const sJson = await sRes.json();
              const sArr = Array.isArray(sJson) ? sJson : (sJson.data ?? []);
              return sArr.map((s: any) => ({
                ...s,
                gradeId: s.gradeId ?? g.id,
              }));
            } catch {
              return [];
            }
          }),
        );
        setAllSubjects(results.flat());
        setSubjectsLoading(false);
      } catch {
        toast({
          title: "Error",
          description: "Failed to load grades.",
          variant: "destructive",
        });
      } finally {
        setGradesLoading(false);
      }
    };
    fetchGrades();
  }, [token]);

  const filteredSubjects =
    gradeFilter === "all"
      ? allSubjects
      : allSubjects.filter((s) => s.gradeId === gradeFilter);

  useEffect(() => {
    setSubjectFilter("all");
    setPage(1);
  }, [gradeFilter]);

  // Fetch questions with debounce
  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(perPage),
          random: "false",
          withExplanation: "false",
        });

        if (subjectFilter !== "all") params.append("subjectId", subjectFilter);

        const res = await fetch(`${API_URL}/questions?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          if (res.status === 500) {
            setQuestions([]);
            setTotal(0);
            setTotalPages(1);
            return;
          } else if (res.status === 429) {
            toast({
              title: "Too Many Requests",
              description: "Please wait a moment and try again.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Error",
              description: `Failed to load questions (${res.status}).`,
              variant: "destructive",
            });
          }
          setQuestions([]);
          setTotal(0);
          setTotalPages(1);
          return;
        }

        const json = await res.json();
        setQuestions(json.data || []);
        setTotal(json.total || 0);
        setTotalPages(json.totalPages || 1);
      } catch (error) {
        console.error("Network error:", error);
        toast({
          title: "Network Error",
          description: "Failed to connect to server.",
          variant: "destructive",
        });
        setQuestions([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchQuestions, 400);
    return () => clearTimeout(timer);
  }, [page, gradeFilter, subjectFilter, difficultyFilter, token]);

  // ── Delete single question
  const handleDelete = async () => {
    if (!questionToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_URL}/questions/${questionToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setQuestions((prev) => prev.filter((q) => q.id !== questionToDelete.id));
      setTotal((prev) => prev - 1);
      toast({
        title: "Deleted",
        description: "Question deleted successfully.",
      });
      setDeleteDialog(false);
      setQuestionToDelete(null);
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete question.",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Bulk delete
  const handleBulkDelete = async () => {
    setBulkDeleteLoading(true);
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          fetch(`${API_URL}/questions/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }),
        ),
      );
      setQuestions((prev) => prev.filter((q) => !selected.has(q.id)));
      setTotal((prev) => prev - selected.size);
      toast({
        title: "Deleted",
        description: `${selected.size} questions deleted.`,
      });
      setSelected(new Set());
      setBulkDeleteDialog(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete some questions.",
        variant: "destructive",
      });
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === questions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(questions.map((q) => q.id)));
    }
  };

  const filterQuestionsFrontend = (questions: any[]) => {
    let filtered = [...questions];

    if (gradeFilter !== "all") {
      filtered = filtered.filter((q) => {
        const subject = allSubjects.find((s) => s.id === q.subjectId);
        return subject?.gradeId === gradeFilter;
      });
    }

    if (difficultyFilter !== "all") {
      filtered = filtered.filter(
        (q) => q.difficulty?.toLowerCase() === difficultyFilter.toLowerCase(),
      );
    }

    if (search) {
      filtered = filtered.filter((q) =>
        q.text.toLowerCase().includes(search.toLowerCase()),
      );
    }

    return filtered;
  };

  const displayedQuestions = filterQuestionsFrontend(questions);

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setImportLoading(true);

    try {
      const res = await fetch(`${API_URL}/questions/upload-csv`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || `HTTP ${res.status}`);
      }

      if (result.success) {
        toast({
          title: "Import Successful",
          description: `${result.created} questions imported.`,
        });
        return;
      }

      let message = `${result.created} imported, ${result.skipped} skipped.\n`;

      if (result.errors?.length) {
        message += "\nErrors:\n" + result.errors.join("\n");
      }

      if (result.missingDependencies) {
        const m = result.missingDependencies;

        if (m.grades?.length) {
          message += `\n\nMissing Grades: ${m.grades.join(", ")}`;
        }

        if (m.subjects?.length) {
          message +=
            "\nMissing Subjects: " +
            m.subjects
              .map((s: any) => `${s.subject} (Grade ${s.grade})`)
              .join(", ");
        }

        if (m.topics?.length) {
          message +=
            "\nMissing Topics: " +
            m.topics
              .map((t: any) => `${t.topic} (Subject ${t.subject})`)
              .join(", ");
        }
      }

      toast({
        title: "Import Completed with Issues",
        description: (
          <div className="max-h-40 overflow-y-auto text-xs whitespace-pre-wrap">
            {message}
          </div>
        ),
        variant: "destructive",
        duration: 10000,
      });
    } catch (err: any) {
      toast({
        title: "Import Failed",
        description: err.message || "Failed to import CSV",
        variant: "destructive",
      });
    } finally {
      setImportLoading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        <Select
          value={gradeFilter}
          onValueChange={(v) => {
            setGradeFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder={gradesLoading ? "Loading..." : "Grade"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {grades.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={subjectFilter}
          onValueChange={(v) => {
            setSubjectFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue
              placeholder={subjectsLoading ? "Loading..." : "Subject"}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {filteredSubjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={difficultyFilter}
          onValueChange={(v) => {
            setDifficultyFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Difficulty</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={() => navigate("/questions/new")}>
          <Plus className="h-4 w-4 mr-1" /> Add New
        </Button>
        <Button variant="outline" asChild disabled={importLoading}>
          <label className="cursor-pointer">
            {importLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-1" />
                Import CSV
              </>
            )}
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImportCSV}
              disabled={importLoading}
            />
          </label>
        </Button>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-muted p-3 rounded-lg">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBulkDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
          <Button variant="outline" size="sm">
            Export Selected
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-lg border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left w-10">
                <Checkbox
                  checked={
                    selected.size === displayedQuestions.length &&
                    displayedQuestions.length > 0
                  }
                  onCheckedChange={toggleAll}
                />
              </th>
              <th className="p-3 text-left font-medium text-muted-foreground">
                Question
              </th>
              <th className="p-3 text-left font-medium text-muted-foreground">
                Grade / Subject
              </th>
              <th className="p-3 text-left font-medium text-muted-foreground">
                Difficulty
              </th>
              <th className="p-3 text-left font-medium text-muted-foreground">
                Accuracy
              </th>
              <th className="p-3 text-left font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </td>
              </tr>
            ) : displayedQuestions.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="p-8 text-center text-muted-foreground"
                >
                  No questions found.
                </td>
              </tr>
            ) : (
              displayedQuestions.map((q) => {
                const subject = allSubjects.find((s) => s.id === q.subjectId);
                const subjectName = subject?.name ?? "—";
                const grade = grades.find((g) => g.id === subject?.gradeId);
                const gradeName = grade?.name ?? "—";

                return (
                  <tr
                    key={q.id}
                    className="border-b hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-3">
                      <Checkbox
                        checked={selected.has(q.id)}
                        onCheckedChange={() => toggleSelect(q.id)}
                      />
                    </td>
                    <td className="p-3 max-w-xs truncate">{q.text}</td>
                    <td className="p-3">
                      <div className="text-xs">
                        <span className="font-medium">
                          {gradeName !== "—" ? ` ${gradeName}` : "—"}
                        </span>{" "}
                        · {subjectName}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={difficultyColors[q.difficulty] || ""}
                      >
                        {q.difficulty || "—"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Progress
                          value={q.accuracy ?? 0}
                          className="w-16 h-2"
                        />
                        <span className="text-xs text-muted-foreground">
                          {q.accuracy ?? 0}%
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {/* Edit — navigate to form with question data */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={async () => {
                            try {
                              const res = await fetch(
                                `${API_URL}/questions/${q.id}/edit`,
                                {
                                  headers: {
                                    Authorization: `Bearer ${token}`,
                                  },
                                },
                              );

                              if (!res.ok)
                                throw new Error(`HTTP ${res.status}`);

                              const fullQuestion = await res.json();

                              navigate("/questions/new", {
                                state: { question: fullQuestion, isEdit: true },
                              });
                            } catch (err) {
                              console.error(err);
                              toast({
                                title: "Error",
                                description:
                                  "Failed to load question for editing.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {/* Delete — open confirmation dialog */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => {
                            setQuestionToDelete(q);
                            setDeleteDialog(true);
                          }}
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

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing{" "}
          {displayedQuestions.length === 0 ? 0 : (page - 1) * perPage + 1}–
          {Math.min(page * perPage, total)} of {total}
        </p>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = page <= 3 ? i + 1 : page - 2 + i;
            if (p > totalPages) return null;
            return (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="sm"
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Single Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog}
        onOpenChange={(v) => !v && setDeleteDialog(false)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Question</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this question? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground truncate">
            "{questionToDelete?.text}"
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={bulkDeleteDialog}
        onOpenChange={(v) => !v && setBulkDeleteDialog(false)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {selected.size} Questions</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selected.size} questions? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteDialog(false)}
              disabled={bulkDeleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleteLoading}
            >
              {bulkDeleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Deleting...
                </>
              ) : (
                `Delete ${selected.size}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuestionsPage;
