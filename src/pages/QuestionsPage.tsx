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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/context/AuthContext";
import {
  deleteQuestion,
  deleteQuestionsBulk,
  fetchGrades,
  fetchQuestionById,
  fetchQuestions,
  fetchSubjects,
  importQuestionsCsv,
  type Grade,
  type Question,
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
  const [gradeFilter, setGradeFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<any>(null);

  // Bulk delete dialog
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  const perPage = 10;

  // 1. Fetch grades using React Query
  const {
    data: grades = [],
    isFetching: gradesLoading,
    refetch: refetchGrades,
  } = useQuery<Grade[], Error>({
    queryKey: ["grades"],
    queryFn: ({ signal }) => fetchGrades(signal),
    enabled: false,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

  // 2. Fetch subjects for the selected grade using React Query (prevents concurrent spam and 429)
  const {
    data: subjects = [],
    isFetching: subjectsLoading,
    refetch: refetchSubjects,
  } = useQuery<Subject[], Error>({
    queryKey: ["subjects", gradeFilter],
    queryFn: ({ signal }) =>
      fetchSubjects(gradeFilter === "all" ? undefined : gradeFilter, signal),
    enabled: false,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

  const filteredSubjects = gradeFilter === "all"
    ? subjects
    : subjects.filter((subject) => subject.gradeId === gradeFilter);

  // Clear subject filter when grade changes
  useEffect(() => {
    setSubjectFilter("all");
    setPage(1);
  }, [gradeFilter]);

  // 3. Fetch questions using React Query (with page and filters)
  const { data: questionsQueryData, isLoading: loading } = useQuery<{ data: any[]; total: number; totalPages: number }, Error>({
    queryKey: ["questions", page, gradeFilter, subjectFilter],
    queryFn: ({ signal }) =>
      fetchQuestions(
        {
          page,
          limit: perPage,
          gradeId: gradeFilter === "all" ? undefined : gradeFilter,
          subjectId: subjectFilter === "all" ? undefined : subjectFilter,
          difficulty:
            difficultyFilter === "all" ? undefined : difficultyFilter,
        },
        signal,
      ),
    enabled: initialized && !!token,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

  const questions = questionsQueryData?.data ?? [];
  const total = questionsQueryData?.total ?? 0;
  const totalPages = questionsQueryData?.totalPages ?? 1;

  // 4. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteQuestion(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      toast({
        title: "Deleted",
        description: "Question deleted successfully.",
      });
      setDeleteDialog(false);
      setQuestionToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete question.",
        variant: "destructive",
      });
    },
  });

  const deleteLoading = deleteMutation.isPending;
  const handleDelete = () => {
    if (questionToDelete) {
      deleteMutation.mutate(questionToDelete.id);
    }
  };

  // 5. Bulk Delete Mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await deleteQuestionsBulk(ids);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      toast({
        title: "Deleted",
        description: `${selected.size} questions deleted.`,
      });
      setSelected(new Set());
      setBulkDeleteDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete some questions.",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteLoading = bulkDeleteMutation.isPending;
  const handleBulkDelete = () => {
    bulkDeleteMutation.mutate(Array.from(selected));
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

  const filterQuestionsFrontend = (questionsList: any[]) => {
    let filtered = [...questionsList];

    if (gradeFilter !== "all") {
      filtered = filtered.filter((q) => {
        const subject = subjects.find((s) => s.id === q.subjectId);
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

    setImportLoading(true);

    try {
      const result = await importQuestionsCsv(file);

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
          onOpenChange={(open) => {
            if (open) {
              refetchGrades();
            }
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
          onOpenChange={(open) => {
            if (open) {
              refetchSubjects();
            }
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
                const subject = subjects.find((s) => s.id === q.subjectId);
                const subjectName = q.subjectName ?? subject?.name ?? "—";
                const gradeName = q.gradeName ?? grades.find((g) => g.id === subject?.gradeId)?.name ?? "—";

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
                              const fullQuestion = await fetchQuestionById(q.id);

                              navigate("/questions/new", {
                                state: { question: fullQuestion, isEdit: true },
                              });
                            } catch (err) {
                              // Delete failed
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
