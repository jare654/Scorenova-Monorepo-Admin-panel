import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Save, X, Sparkles, Eye, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  createQuestion,
  createSubject,
  createTopic,
  explainQuestion,
  fetchQuestionStatistics,
  fetchStreams,
  fetchSubjects,
  fetchTopics,
  updateQuestion,
  type Stream,
  type Subject,
  type Topic,
} from "@/services/api/questions";
import { MathText } from "@/components/MathText";

// ─── Reusable create dialog ───────────────────────────────────────────────────

const CreateDialog = ({
  open,
  title,
  placeholder,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  placeholder: string;
  loading: boolean;
  onConfirm: (name: string, description: string) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) { setName(""); setDescription(""); }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Name *</Label>
            <Input
              placeholder={placeholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && name.trim() && onConfirm(name.trim(), description)}
            />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Input
              placeholder="Enter description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button onClick={() => name.trim() && onConfirm(name.trim(), description)} disabled={!name.trim() || loading}>
            {loading ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── AI explanation dialog ────────────────────────────────────────────────────

const AIExplanationDialog = ({
  open,
  result,
  onUse,
  onClose,
}: {
  open: boolean;
  result: { stepByStep: string; clear: string; simplified: string } | null;
  onUse: (text: string) => void;
  onClose: () => void;
}) => {
  if (!result) return null;
  const tabs = [
    { value: "stepByStep", label: "Step by Step", content: result.stepByStep },
    { value: "clear", label: "Clear", content: result.clear },
    { value: "simplified", label: "Simplified", content: result.simplified },
  ];
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> AI Generated Explanation
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="stepByStep" className="w-full">
          <TabsList className="w-full">
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="flex-1 text-xs">{t.label}</TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((t) => (
            <TabsContent key={t.value} value={t.value} className="mt-4">
              <div className="bg-muted rounded-lg p-4 text-sm leading-relaxed min-h-[120px] whitespace-pre-line">
                {t.content}
              </div>
              <Button className="w-full mt-3" onClick={() => onUse(t.content)}>
                Use this explanation
              </Button>
            </TabsContent>
          ))}
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="w-full">Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const AddQuestionPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocation();
  const queryClient = useQueryClient();
  const editingQuestion = location.state?.question;
  const isEditMode = !!editingQuestion;
  const preselectedSubjectId: string | undefined = location.state?.preselectedSubjectId;

  // ── Form state
  const [streamId, setStreamId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState("0");
  const [explanation, setExplanation] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  // ── Taxonomy data
  const [streams, setStreams] = useState<Stream[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  // ── Dialog state
  const [subjectDialog, setSubjectDialog] = useState(false);
  const [topicDialog, setTopicDialog] = useState(false);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // ── AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ stepByStep: string; clear: string; simplified: string } | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // ── Stats
  const [stats, setStats] = useState<{
    totalAttempts: number;
    correctAnswers: number;
    averageTimeSeconds: number;
    successRate: number;
  } | null>(null);

  // ── Load streams on mount
  useEffect(() => {
    fetchStreams()
      .then(setStreams)
      .catch(() => toast({ title: "Error", description: "Failed to load streams.", variant: "destructive" }));
  }, [toast]);

  // ── Load subjects when stream changes (with race condition prevention)
  useEffect(() => {
    if (!streamId) {
      setSubjects([]);
      if (!isEditMode) { setSubjectId(""); setTopicId(""); }
      return;
    }
    let cancelled = false;
    fetchSubjects(streamId)
      .then((data) => {
        if (cancelled) return;
        setSubjects(data);
        // Don't clear subjectId if we have a preselected one — the preselect effect will set it
        if (!isEditMode && !preselectedSubjectId) { setSubjectId(""); setTopicId(""); }
      })
      .catch(() => {
        if (!cancelled) toast({ title: "Error", description: "Failed to load subjects.", variant: "destructive" });
      });
    return () => { cancelled = true; };
  }, [streamId, isEditMode, prefilled, preselectedSubjectId, toast]);

  // ── Load topics when subject changes (with race condition prevention)
  useEffect(() => {
    if (!subjectId) {
      setTopics([]);
      if (!isEditMode || prefilled) setTopicId("");
      return;
    }
    let cancelled = false;
    fetchTopics(subjectId)
      .then((data) => {
        if (cancelled) return;
        setTopics(data);
        if (!isEditMode || prefilled) setTopicId("");
      })
      .catch(() => {
        if (!cancelled) toast({ title: "Error", description: "Failed to load topics.", variant: "destructive" });
      });
    return () => { cancelled = true; };
  }, [subjectId, isEditMode, prefilled, toast]);

  // ── Unsaved changes tracking & warning
  const isDirty = Boolean(
    questionText.trim() ||
    options.some((o) => o.trim()) ||
    explanation.trim()
  );

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !loading) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, loading]);

  // ── Prefill form when editing
  useEffect(() => {
    if (!isEditMode || !editingQuestion) return;
    setQuestionText(editingQuestion.text ?? "");
    setOptions(Array.isArray(editingQuestion.options) ? editingQuestion.options : ["", "", "", ""]);
    setDifficulty(
      editingQuestion.difficulty
        ? editingQuestion.difficulty.charAt(0).toUpperCase() + editingQuestion.difficulty.slice(1).toLowerCase()
        : "",
    );
    setExplanation(editingQuestion.explanation ?? "");
    if (Array.isArray(editingQuestion.options)) {
      const idx = editingQuestion.options.indexOf(editingQuestion.correctAnswer);
      if (idx >= 0) setCorrectAnswer(String(idx));
    }
  }, [isEditMode, editingQuestion]);

  // ── Resolve stream from streams list (edit mode)
  useEffect(() => {
    if (!isEditMode || !editingQuestion || !streams.length) return;
    // Try to match by subjectId → find subject → find its streamId
    if (editingQuestion.subjectId) {
      fetchSubjects()
        .then((allSubjects) => {
          const match = allSubjects.find((s) => s.id === editingQuestion.subjectId);
          if (match?.streamId) setStreamId(match.streamId);
        })
        .catch(() => {});
    }
  }, [streams, isEditMode, editingQuestion]);

  // ── Auto-select subject when navigated from Mock Exams / Practice page
  useEffect(() => {
    if (!preselectedSubjectId || isEditMode || !streams.length) return;
    fetchSubjects()
      .then((allSubjects) => {
        const match = allSubjects.find((s) => s.id === preselectedSubjectId);
        if (match?.streamId) {
          setStreamId(match.streamId);
          // After stream is set, subjects will load — then we set subjectId below
        }
      })
      .catch(() => {});
  }, [preselectedSubjectId, isEditMode, streams.length]);

  // ── Once subjects load, apply preselected subject
  useEffect(() => {
    if (!preselectedSubjectId || isEditMode || !subjects.length) return;
    const match = subjects.find((s) => s.id === preselectedSubjectId);
    if (match) setSubjectId(match.id);
  }, [preselectedSubjectId, isEditMode, subjects]);

  // ── Resolve subject from subjects list (edit mode)
  useEffect(() => {
    if (!isEditMode || !editingQuestion || !subjects.length) return;
    const match = subjects.find((s) => s.id === editingQuestion.subjectId || s.name === editingQuestion.subjectName);
    if (match) setSubjectId(match.id);
  }, [subjects, isEditMode, editingQuestion]);

  // ── Resolve topic from topics list (edit mode)
  useEffect(() => {
    if (!isEditMode || !editingQuestion || !topics.length) return;
    const match = topics.find((t) => t.id === editingQuestion.topicId || t.name === editingQuestion.topicName);
    if (match) setTopicId(match.id);
  }, [topics, isEditMode, editingQuestion]);

  // ── Load stats when editing
  useEffect(() => {
    if (!isEditMode || !editingQuestion?.id) return;
    fetchQuestionStatistics(editingQuestion.id)
      .then((result) => { if (result) setStats(result); })
      .catch(() => {});
  }, [isEditMode, editingQuestion?.id]);

  // ── AI generate
  const handleAIGenerate = async () => {
    const missing: string[] = [];
    if (!questionText.trim()) missing.push("question text");
    if (!options[parseInt(correctAnswer)]?.trim()) missing.push("correct answer");
    if (!subjectId) missing.push("subject");
    if (missing.length > 0) {
      toast({ title: "Missing info", description: `Fill in: ${missing.join(", ")}`, variant: "destructive" });
      return;
    }
    const selectedSubject = subjects.find((s) => s.id === subjectId);
    const selectedTopic = topics.find((t) => t.id === topicId);
    setAiLoading(true);
    try {
      const result = await explainQuestion({
        question: questionText,
        correctAnswer: options[parseInt(correctAnswer)],
        options,
        subject: selectedSubject?.name ?? "",
        topic: selectedTopic?.name ?? "",
      });
      if (!result.stepByStep && !result.clear && !result.simplified) throw new Error("Empty AI response");
      setAiResult({
        stepByStep: result.stepByStep ?? "",
        clear: result.clear ?? "",
        simplified: result.simplified ?? "",
      });
      setAiDialogOpen(true);
    } catch {
      toast({ title: "AI Error", description: "Failed to generate explanation.", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  // ── Create subject
  const handleCreateSubject = async (name: string, description: string) => {
    if (!streamId) {
      toast({ title: "Select a stream first", variant: "destructive" });
      return;
    }
    const exists = subjects.find((s) => s.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      setSubjectId(exists.id);
      setSubjectDialog(false);
      return;
    }
    setDialogLoading(true);
    try {
      const newSubject = await createSubject({ name, description, streamId });
      setSubjects((prev) => [...prev, newSubject]);
      setSubjectId(newSubject.id);
      setSubjectDialog(false);
      toast({ title: "Created", description: `Subject "${name}" created.` });
    } catch {
      toast({ title: "Error", description: "Failed to create subject.", variant: "destructive" });
    } finally {
      setDialogLoading(false);
    }
  };

  // ── Create topic
  const handleCreateTopic = async (name: string, description: string) => {
    const exists = topics.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      setTopicId(exists.id);
      setTopicDialog(false);
      return;
    }
    setDialogLoading(true);
    try {
      const newTopic = await createTopic({ name, description, subjectId });
      setTopics((prev) => [...prev, newTopic]);
      setTopicId(newTopic.id);
      setTopicDialog(false);
      toast({ title: "Created", description: `Topic "${name}" created.` });
    } catch {
      toast({ title: "Error", description: "Failed to create topic.", variant: "destructive" });
    } finally {
      setDialogLoading(false);
    }
  };

  // ── Validate & save
  const validate = () => {
    const e: Record<string, boolean> = {};
    if (!streamId) e.stream = true;
    if (!subjectId) e.subject = true;
    if (!difficulty) e.difficulty = true;
    if (!questionText.trim() || questionText.trim().length < 10) e.questionText = true;
    if (options.some((o) => !o.trim())) e.options = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast({ title: "Validation Error", description: "Fill in all required fields.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const body = {
        subjectId,
        topicId: topicId || null,
        text: questionText,
        options,
        correctAnswer: options[parseInt(correctAnswer)],
        difficulty: difficulty.toLowerCase(),
        explanation,
      };
      if (isEditMode) {
        await updateQuestion(editingQuestion.id, body);
      } else {
        await createQuestion(body);
      }
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      toast({ title: "Success", description: isEditMode ? "Question updated." : "Question saved." });
      if (isEditMode) {
        navigate("/questions");
      } else {
        setQuestionText("");
        setOptions(["", "", "", ""]);
        setCorrectAnswer("0");
        setExplanation("");
        setDifficulty("");
        setTopicId("");
        setErrors({});
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (isDirty && !window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
      return;
    }
    navigate("/questions");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{isEditMode ? "Edit Question" : "Add New Question"}</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <Button variant="outline" onClick={() => setPreviewOpen(true)}>
            <Eye className="h-4 w-4 mr-1" /> Preview
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : <><Save className="h-4 w-4 mr-1" />{isEditMode ? "Update" : "Save"}</>}
          </Button>
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-card rounded-lg border p-6 space-y-4">
        <h3 className="font-medium">Basic Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Stream */}
          <div>
            <Label>Stream *</Label>
            <Select value={streamId} onValueChange={setStreamId}>
              <SelectTrigger className={errors.stream ? "border-destructive" : ""}>
                <SelectValue placeholder="Select stream" />
              </SelectTrigger>
              <SelectContent>
                {streams.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div>
            <Label>Subject *</Label>
            <Select value={subjectId} onValueChange={setSubjectId} disabled={!streamId}>
              <SelectTrigger className={errors.subject ? "border-destructive" : ""}>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
                <div className="border-t mt-1 pt-1">
                  <button
                    type="button"
                    onClick={() => setSubjectDialog(true)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-primary hover:bg-muted rounded-sm"
                  >
                    <Plus className="h-3 w-3" /> Create New Subject
                  </button>
                </div>
              </SelectContent>
            </Select>
            {!streamId && <p className="text-xs text-muted-foreground mt-1">Select a stream first</p>}
          </div>

          {/* Difficulty */}
          <div>
            <Label>Difficulty *</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className={errors.difficulty ? "border-destructive" : ""}>
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Topic */}
        <div>
          <Label>Topic (optional)</Label>
          <Select value={topicId} onValueChange={setTopicId} disabled={!subjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Select topic" />
            </SelectTrigger>
            <SelectContent>
              {topics.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
              <div className="border-t mt-1 pt-1">
                <button
                  type="button"
                  onClick={() => setTopicDialog(true)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-primary hover:bg-muted rounded-sm"
                >
                  <Plus className="h-3 w-3" /> Create New Topic
                </button>
              </div>
            </SelectContent>
          </Select>
          {!subjectId && <p className="text-xs text-muted-foreground mt-1">Select a subject first</p>}
        </div>
      </div>

      {/* Question Text */}
      <div className="bg-card rounded-lg border p-6 space-y-4">
        <h3 className="font-medium">Question Text *</h3>
        <Textarea
          placeholder="Enter the question text (minimum 10 characters)..."
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          rows={4}
          className={errors.questionText ? "border-destructive" : ""}
        />
        <p className="text-xs text-muted-foreground">Minimum 10 characters required</p>
      </div>

      {/* Options */}
      <div className="bg-card rounded-lg border p-6 space-y-4">
        <h3 className="font-medium">Answer Options *</h3>
        <RadioGroup value={correctAnswer} onValueChange={setCorrectAnswer}>
          {["A", "B", "C", "D"].map((label, i) => (
            <div key={label} className="flex items-center gap-3">
              <RadioGroupItem value={String(i)} id={`opt-${i}`} />
              <Label htmlFor={`opt-${i}`} className="font-medium w-6">{label}.</Label>
              <Input
                placeholder={`Option ${label}`}
                value={options[i]}
                onChange={(e) => {
                  const next = [...options];
                  next[i] = e.target.value;
                  setOptions(next);
                }}
                className={errors.options && !options[i].trim() ? "border-destructive flex-1" : "flex-1"}
              />
            </div>
          ))}
        </RadioGroup>
        <p className="text-xs text-muted-foreground">Select the radio button next to the correct answer.</p>
      </div>

      {/* Explanation */}
      <div className="bg-card rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Explanation</h3>
          <Button variant="outline" size="sm" onClick={handleAIGenerate} disabled={aiLoading}>
            <Sparkles className={`h-4 w-4 mr-1 ${aiLoading ? "animate-pulse" : ""}`} />
            {aiLoading ? "Generating..." : "AI Generate"}
          </Button>
        </div>
        <Textarea
          placeholder="Explain why the correct answer is right..."
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={4}
        />
        {explanation && <p className="text-xs text-muted-foreground">{explanation.length} characters</p>}
      </div>

      {/* Statistics (hidden for now)
      <div className="bg-card rounded-lg border p-6">
        <h3 className="font-medium mb-4">Statistics</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{stats?.totalAttempts.toLocaleString() ?? "0"}</p>
            <p className="text-xs text-muted-foreground">Attempts</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{stats?.correctAnswers.toLocaleString() ?? "0"}</p>
            <p className="text-xs text-muted-foreground">Correct</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {stats && stats.averageTimeSeconds > 0 ? `${stats.averageTimeSeconds}s` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Avg Time</p>
          </div>
        </div>
        {stats && stats.totalAttempts > 0 && (
          <div className="mt-4 pt-4 border-t text-center">
            <p className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Success Rate</p>
          </div>
        )}
      </div>
      */}

      {/* Dialogs */}
      <CreateDialog
        open={subjectDialog}
        title="Create New Subject"
        placeholder="e.g. Chemistry"
        loading={dialogLoading}
        onConfirm={handleCreateSubject}
        onCancel={() => setSubjectDialog(false)}
      />
      <CreateDialog
        open={topicDialog}
        title="Create New Topic"
        placeholder="e.g. Organic Chemistry"
        loading={dialogLoading}
        onConfirm={handleCreateTopic}
        onCancel={() => setTopicDialog(false)}
      />
      <AIExplanationDialog
        open={aiDialogOpen}
        result={aiResult}
        onUse={(text) => {
          setExplanation(text);
          setAiDialogOpen(false);
          toast({ title: "Applied", description: "AI explanation inserted." });
        }}
        onClose={() => setAiDialogOpen(false)}
      />

      {/* Live Mobile Question Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Mobile App Preview
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 flex-wrap">
              {streamId && (
                <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium text-muted-foreground">
                  {streams.find((s) => s.id === streamId)?.name ?? "Stream"}
                </span>
              )}
              {subjectId && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
                  {subjects.find((s) => s.id === subjectId)?.name ?? "Subject"}
                </span>
              )}
              {difficulty && (
                <span className="text-xs border px-2 py-0.5 rounded text-muted-foreground">
                  {difficulty}
                </span>
              )}
            </div>

            <div className="border rounded-lg p-4 space-y-3 bg-card">
              <h4 className="font-semibold text-sm leading-relaxed">
                {questionText.trim() ? (
                  <MathText text={questionText} />
                ) : (
                  <span className="text-muted-foreground italic">No question text entered yet...</span>
                )}
              </h4>

              <div className="space-y-2 pt-2">
                {options.map((opt, i) => {
                  const isCorrect = String(i) === correctAnswer;
                  return (
                    <div
                      key={i}
                      className={`p-2.5 rounded-md border text-sm flex items-start gap-2.5 ${
                        isCorrect
                          ? "bg-success/10 border-success/40 text-success-foreground font-medium"
                          : "bg-background border-border text-foreground"
                      }`}
                    >
                      <span className="font-bold text-xs shrink-0 w-4">
                        {["A", "B", "C", "D"][i]}.
                      </span>
                      <div className="flex-1">
                        {opt.trim() ? (
                          <MathText text={opt} />
                        ) : (
                          <span className="text-muted-foreground italic">Empty choice</span>
                        )}
                      </div>
                      {isCorrect && (
                        <span className="text-[10px] bg-success text-success-foreground px-1.5 py-0.5 rounded font-bold ml-auto shrink-0">
                          Correct
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {explanation.trim() && (
                <div className="mt-3 p-3 bg-muted/40 rounded-md border text-xs space-y-1">
                  <span className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Explanation
                  </span>
                  <div className="text-foreground">
                    <MathText text={explanation} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddQuestionPage;
