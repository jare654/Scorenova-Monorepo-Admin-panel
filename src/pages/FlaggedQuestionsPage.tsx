import { useState } from "react";
import {
  Flag,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Edit,
  Save,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchFlags,
  updateFlagStatus,
  type FlagStatus,
  type QuestionFlag,
} from "@/services/api/flags";
import {
  fetchQuestionById,
  updateQuestion,
  type Question,
} from "@/services/api/questions";
import { MathText } from "@/components/MathText";

const STATUS_LABELS: Record<FlagStatus, string> = {
  pending: "Pending",
  reviewed: "Reviewed",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

const STATUS_COLORS: Record<FlagStatus, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  reviewed: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  resolved: "bg-success/15 text-success border-success/30",
  dismissed: "bg-muted text-muted-foreground border-border",
};

const STATUS_ICONS: Record<FlagStatus, React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  reviewed: <Eye className="h-3 w-3" />,
  resolved: <CheckCircle2 className="h-3 w-3" />,
  dismissed: <XCircle className="h-3 w-3" />,
};

export default function FlaggedQuestionsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<FlagStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 20;

  // Selected flag for inspection dialog
  const [selectedFlag, setSelectedFlag] = useState<QuestionFlag | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Edit question state
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editText, setEditText] = useState("");
  const [editOptions, setEditOptions] = useState<string[]>([]);
  const [editCorrectAnswer, setEditCorrectAnswer] = useState("");
  const [editExplanation, setEditExplanation] = useState("");
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  // Fetch flags query
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["question-flags", statusFilter, page],
    queryFn: ({ signal }) =>
      fetchFlags(
        {
          status: statusFilter,
          page,
          limit: perPage,
        },
        signal,
      ),
  });

  const flags: QuestionFlag[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // Question details query for selected flag
  const {
    data: fullQuestion,
    isLoading: isLoadingQuestion,
    refetch: refetchQuestion,
  } = useQuery({
    queryKey: ["flagged-question-detail", selectedFlag?.questionId],
    queryFn: ({ signal }) =>
      selectedFlag?.questionId
        ? fetchQuestionById(selectedFlag.questionId, signal)
        : null,
    enabled: !!selectedFlag?.questionId,
  });

  // Status mutation
  const statusMutation = useMutation({
    mutationFn: ({
      flagId,
      status,
    }: {
      flagId: string;
      status: FlagStatus;
    }) => updateFlagStatus(flagId, status),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["question-flags"] });
      if (selectedFlag?.id === vars.flagId) {
        setSelectedFlag((prev) =>
          prev ? { ...prev, status: vars.status } : prev,
        );
      }
      toast({
        title: "Status updated",
        description: `Flag marked as ${vars.status}.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update flag status.",
        variant: "destructive",
      });
    },
  });

  const openInspectModal = (flag: QuestionFlag) => {
    setSelectedFlag(flag);
    setIsEditDialogOpen(false);
  };

  const startEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setEditText(q.text);
    setEditOptions([...(q.options || [])]);
    setEditCorrectAnswer(q.correctAnswer);
    setEditExplanation(q.explanation || "");
    setIsEditDialogOpen(true);
  };

  const handleSaveQuestion = async () => {
    if (!editingQuestion) return;
    if (!editText.trim()) {
      toast({
        title: "Validation error",
        description: "Question text cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    if (editOptions.some((o) => !o.trim())) {
      toast({
        title: "Validation error",
        description: "All choices must have text.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingQuestion(true);
    try {
      await updateQuestion(editingQuestion.id, {
        text: editText.trim(),
        options: editOptions.map((o) => o.trim()),
        correctAnswer: editCorrectAnswer,
        explanation: editExplanation.trim(),
        subjectId: editingQuestion.subjectId || "",
        topicId: editingQuestion.topicId || undefined,
        difficulty: editingQuestion.difficulty || "medium",
      });

      toast({
        title: "Question Updated",
        description: "The question and answers have been successfully updated.",
      });

      // Also automatically mark the flag as resolved if currently pending/reviewed
      if (
        selectedFlag &&
        (selectedFlag.status === "pending" || selectedFlag.status === "reviewed")
      ) {
        await statusMutation.mutateAsync({
          flagId: selectedFlag.id,
          status: "resolved",
        });
      }

      setIsEditDialogOpen(false);
      refetchQuestion();
      refetch();
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err?.message || "Could not update question.",
        variant: "destructive",
      });
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const filteredFlags = search
    ? flags.filter(
        (f) =>
          f.reason.toLowerCase().includes(search.toLowerCase()) ||
          (f.questionText &&
            f.questionText.toLowerCase().includes(search.toLowerCase())) ||
          f.id.includes(search),
      )
    : flags;

  const pendingCount = flags.filter((f) => f.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              Flagged Questions
            </h1>
            {pendingCount > 0 && (
              <Badge className="bg-warning/20 text-warning hover:bg-warning/30 border-warning/40">
                {pendingCount} Pending Action
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Review and resolve question discrepancies reported by students in the mobile app.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="gap-2 shrink-0 self-start sm:self-auto"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by reason or question text..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val as FlagStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table Content */}
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-3 text-primary" />
            <p className="text-sm">Loading flagged questions...</p>
          </div>
        ) : filteredFlags.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center px-4">
            <CheckCircle2 className="h-12 w-12 text-success/60 mb-3" />
            <p className="text-base font-medium">No flagged questions found</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {search || statusFilter !== "all"
                ? "No reports match your active filter criteria."
                : "Great job! All student-reported questions have been addressed."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3">Reported Question</th>
                  <th className="px-4 py-3">Student's Reason</th>
                  <th className="px-4 py-3 w-32">Status</th>
                  <th className="px-4 py-3 w-36">Date</th>
                  <th className="px-4 py-3 text-right w-44">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredFlags.map((flag) => (
                  <tr
                    key={flag.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-medium text-foreground line-clamp-2">
                        <MathText text={flag.questionText || "Question text unavailable"} />
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        ID: {flag.questionId.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="bg-muted/50 rounded p-2 text-xs border max-w-md">
                        <p className="font-medium text-destructive/90 flex items-center gap-1.5 mb-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          Student Feedback:
                        </p>
                        <p className="text-foreground/90 whitespace-pre-wrap">
                          {flag.reason}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_COLORS[flag.status]
                        }`}
                      >
                        {STATUS_ICONS[flag.status]}
                        {STATUS_LABELS[flag.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(flag.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openInspectModal(flag)}
                        className="h-8 gap-1 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5" /> Inspect
                      </Button>

                      {flag.status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            statusMutation.mutate({
                              flagId: flag.id,
                              status: "reviewed",
                            })
                          }
                          className="h-8 text-xs text-blue-600 hover:text-blue-700"
                        >
                          Review
                        </Button>
                      )}

                      {flag.status !== "resolved" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            statusMutation.mutate({
                              flagId: flag.id,
                              status: "resolved",
                            })
                          }
                          className="h-8 text-xs text-success hover:text-success"
                        >
                          Resolve
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
            <span>
              Showing {(page - 1) * perPage + 1} to{" "}
              {Math.min(page * perPage, total)} of {total} flags
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 text-xs"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-7 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Inspect & Review Dialog */}
      <Dialog
        open={!!selectedFlag && !isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) setSelectedFlag(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-destructive" />
              Flag Details & Triage
            </DialogTitle>
            <DialogDescription>
              Reported on{" "}
              {selectedFlag &&
                new Date(selectedFlag.createdAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          {selectedFlag && (
            <div className="space-y-4 py-2">
              {/* Student Report Note */}
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-xs font-semibold text-destructive mb-1">
                  Reported Issue:
                </p>
                <p className="text-sm font-medium text-foreground">
                  {selectedFlag.reason}
                </p>
              </div>

              {/* Question Preview */}
              <div className="border rounded-lg p-4 space-y-3 bg-muted/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Question Text
                  </span>
                  {fullQuestion && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditQuestion(fullQuestion)}
                      className="h-7 gap-1 text-xs"
                    >
                      <Edit className="h-3.5 w-3.5" /> Edit Question
                    </Button>
                  )}
                </div>

                {isLoadingQuestion ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading full
                    question...
                  </div>
                ) : fullQuestion ? (
                  <div className="space-y-3">
                    <div className="text-sm font-semibold">
                      <MathText text={fullQuestion.text} />
                    </div>

                    {/* Choices */}
                    <div className="space-y-1.5 pt-2">
                      <span className="text-xs text-muted-foreground font-medium">
                        Answer Choices:
                      </span>
                      <div className="grid grid-cols-1 gap-2">
                        {fullQuestion.options?.map((opt, idx) => {
                          const isCorrect =
                            fullQuestion.correctAnswer === opt ||
                            fullQuestion.correctAnswer ===
                              String.fromCharCode(65 + idx);
                          return (
                            <div
                              key={idx}
                              className={`p-2.5 rounded-md border text-sm flex items-start gap-2 ${
                                isCorrect
                                  ? "bg-success/10 border-success/40 text-success-foreground font-medium"
                                  : "bg-background border-border text-foreground"
                              }`}
                            >
                              <span className="font-bold text-xs shrink-0 w-5">
                                {String.fromCharCode(65 + idx)}.
                              </span>
                              <div className="flex-1">
                                <MathText text={opt} />
                              </div>
                              {isCorrect && (
                                <Badge className="bg-success text-success-foreground text-[10px] ml-auto py-0">
                                  Correct
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Explanation */}
                    {fullQuestion.explanation && (
                      <div className="bg-muted/40 p-3 rounded-md border text-xs space-y-1 mt-2">
                        <span className="font-semibold text-muted-foreground">
                          Current Explanation:
                        </span>
                        <div className="text-foreground">
                          <MathText text={fullQuestion.explanation} />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {selectedFlag.questionText || "Question details not found."}
                  </p>
                )}
              </div>

              {/* Status Actions */}
              <div className="space-y-2 pt-2">
                <Label className="text-xs">Update Flag Status</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={
                      selectedFlag.status === "pending" ? "default" : "outline"
                    }
                    onClick={() =>
                      statusMutation.mutate({
                        flagId: selectedFlag.id,
                        status: "pending",
                      })
                    }
                    className="h-8 text-xs gap-1"
                  >
                    <Clock className="h-3 w-3" /> Pending
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      selectedFlag.status === "reviewed" ? "default" : "outline"
                    }
                    onClick={() =>
                      statusMutation.mutate({
                        flagId: selectedFlag.id,
                        status: "reviewed",
                      })
                    }
                    className="h-8 text-xs gap-1"
                  >
                    <Eye className="h-3 w-3" /> Reviewed
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      selectedFlag.status === "resolved" ? "default" : "outline"
                    }
                    onClick={() =>
                      statusMutation.mutate({
                        flagId: selectedFlag.id,
                        status: "resolved",
                      })
                    }
                    className="h-8 text-xs gap-1 text-success hover:text-success"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Resolved
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      selectedFlag.status === "dismissed" ? "default" : "outline"
                    }
                    onClick={() =>
                      statusMutation.mutate({
                        flagId: selectedFlag.id,
                        status: "dismissed",
                      })
                    }
                    className="h-8 text-xs gap-1 text-muted-foreground"
                  >
                    <XCircle className="h-3 w-3" /> Dismiss
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedFlag(null)}
              className="text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inline Quick Edit Question Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => setIsEditDialogOpen(open)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Edit Question Content
            </DialogTitle>
            <DialogDescription>
              Fix the question text, update choices, or select the proper correct answer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="question-text">Question Prompt</Label>
              <Textarea
                id="question-text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                placeholder="Enter question text (LaTeX math supported e.g. $E=mc^2$)"
              />
              {editText.trim() && (
                <div className="rounded-lg border bg-muted/40 p-2.5 text-xs text-foreground">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Live LaTeX Preview</div>
                  <MathText text={editText} />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Answer Choices</Label>
              {editOptions.map((opt, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs w-6 shrink-0">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const updated = [...editOptions];
                        updated[idx] = e.target.value;
                        setEditOptions(updated);
                      }}
                      placeholder={`Choice ${String.fromCharCode(65 + idx)}`}
                    />
                    <input
                      type="radio"
                      name="correct-choice"
                      checked={
                        editCorrectAnswer === opt ||
                        editCorrectAnswer === String.fromCharCode(65 + idx)
                      }
                      onChange={() => setEditCorrectAnswer(opt)}
                      className="h-4 w-4 text-primary shrink-0 cursor-pointer"
                      title="Mark as correct answer"
                    />
                  </div>
                  {opt.trim() && (opt.includes("$") || opt.includes("\\")) && (
                    <div className="ml-8 text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                      <MathText text={opt} />
                    </div>
                  )}
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground">
                Click the radio button next to the choice that is the correct answer.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="question-explanation">Explanation</Label>
              <Textarea
                id="question-explanation"
                value={editExplanation}
                onChange={(e) => setEditExplanation(e.target.value)}
                rows={3}
                placeholder="Explanation of why this answer is correct..."
              />
              {editExplanation.trim() && (
                <div className="rounded-lg border bg-muted/40 p-2.5 text-xs text-foreground">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Live Explanation Preview</div>
                  <MathText text={editExplanation} />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSavingQuestion}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveQuestion}
              disabled={isSavingQuestion}
              className="gap-2"
            >
              {isSavingQuestion ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save & Resolve Flag
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
