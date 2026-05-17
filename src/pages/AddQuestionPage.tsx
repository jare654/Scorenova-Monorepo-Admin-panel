import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useAuth } from "@/components/auth/context/AuthContext";
import { useLocation } from "react-router-dom";
import { API_URL, getGrades } from "@/lib/api";

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
    if (open) {
      setName("");
      setDescription("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Name *</Label>
            <Input
              placeholder={placeholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                name.trim() &&
                onConfirm(name.trim(), description)
              }
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
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={() => name.trim() && onConfirm(name.trim(), description)}
            disabled={!name.trim() || loading}
          >
            {loading ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

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
            <Sparkles className="h-4 w-4 text-primary" />
            AI Generated Explanation
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="stepByStep" className="w-full">
          <TabsList className="w-full">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex-1 text-xs"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-4">
              <div className="bg-muted rounded-lg p-4 text-sm leading-relaxed min-h-[120px] whitespace-pre-line">
                {tab.content}
              </div>
              <Button
                className="w-full mt-3"
                onClick={() => onUse(tab.content)}
              >
                Use this explanation
              </Button>
            </TabsContent>
          ))}
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="w-full">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AddQuestionPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { token } = useAuth();
  const location = useLocation();
  const editingQuestion = location.state?.question;
  const isEditMode = !!editingQuestion;

  const [gradeId, setGradeId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState("0");
  const [explanation, setExplanation] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const [grades, setGrades] = useState<{ id: string; name: string }[]>([]);
  type Subject = { id: string; name: string; gradeId: string };
  type Topic = { id: string; name: string; subjectId: string };
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  const [gradeDialog, setGradeDialog] = useState(false);
  const [subjectDialog, setSubjectDialog] = useState(false);
  const [topicDialog, setTopicDialog] = useState(false);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{
    stepByStep: string;
    clear: string;
    simplified: string;
  } | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  // ── Stats state
  const [stats, setStats] = useState<{
    totalAttempts: number;
    correctAnswers: number;
    averageTimeSeconds: number;
    successRate: number;
  } | null>(null);

  // ── Fetch grades on mount
  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const grades = await getGrades(token);
        setGrades(grades);
      } catch {
        toast({
          title: "Error",
          description: "Failed to load grades.",
          variant: "destructive",
        });
      }
    };
    fetchGrades();
  }, [token]);

  // ── Fetch subjects when grade changes
  useEffect(() => {
    if (!gradeId) {
      setSubjects([]);
      if (!isEditMode) {
        setSubjectId("");
        setTopicId("");
      }
      return;
    }
    const fetchSubjects = async () => {
      try {
        const res = await fetch(`${API_URL}/subjects?gradeId=${gradeId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setSubjects(Array.isArray(json) ? json : (json.data ?? []));
        if (!isEditMode || prefilled) {
          setSubjectId("");
          setTopicId("");
        }
      } catch {
        toast({
          title: "Error",
          description: "Failed to load subjects.",
          variant: "destructive",
        });
      }
    };
    fetchSubjects();
  }, [gradeId, token]);

  // ── Fetch topics when subject changes
  useEffect(() => {
    if (!subjectId) {
      setTopics([]);
      if (!isEditMode || prefilled) setTopicId("");
      return;
    }
    const fetchTopics = async () => {
      try {
        const res = await fetch(`${API_URL}/topics?subjectId=${subjectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setTopics(Array.isArray(json) ? json : (json.data ?? []));
        if (!isEditMode || prefilled) setTopicId("");
      } catch {
        toast({
          title: "Error",
          description: "Failed to load topics.",
          variant: "destructive",
        });
      }
    };
    fetchTopics();
  }, [subjectId, token]);

  // ── Prefill text/options/difficulty/explanation immediately
  useEffect(() => {
    if (!isEditMode || !editingQuestion) return;
    setQuestionText(editingQuestion.text ?? "");
    setOptions(
      Array.isArray(editingQuestion.options)
        ? editingQuestion.options
        : ["", "", "", ""],
    );
    setDifficulty(
      editingQuestion.difficulty
        ? editingQuestion.difficulty.charAt(0).toUpperCase() +
            editingQuestion.difficulty.slice(1).toLowerCase()
        : "",
    );
    setExplanation(editingQuestion.explanation ?? "");
    if (Array.isArray(editingQuestion.options)) {
      const idx = editingQuestion.options.indexOf(
        editingQuestion.correctAnswer,
      );
      if (idx >= 0) setCorrectAnswer(String(idx));
    }
  }, [isEditMode, editingQuestion]);

  // ── Resolve grade from grades list
  useEffect(() => {
    if (!isEditMode || !editingQuestion || !grades.length) return;
    const gradeMatch = grades.find((g) => g.name === editingQuestion.gradeName);
    if (gradeMatch) setGradeId(gradeMatch.id);
  }, [grades, isEditMode, editingQuestion]);

  // ── Resolve subject from subjects list
  useEffect(() => {
    if (!isEditMode || !editingQuestion || !subjects.length) return;
    const subjectMatch = subjects.find(
      (s) => s.name === editingQuestion.subjectName,
    );
    if (subjectMatch) setSubjectId(subjectMatch.id);
  }, [subjects, isEditMode, editingQuestion]);

  // ── Resolve topic from topics list
  useEffect(() => {
    if (!isEditMode || !editingQuestion || !topics.length) return;
    const topicMatch = topics.find((t) => t.name === editingQuestion.topicName);
    if (topicMatch) setTopicId(topicMatch.id);
  }, [topics, isEditMode, editingQuestion]);

  // ── Fetch question statistics when editing
  useEffect(() => {
    if (!isEditMode || !editingQuestion?.id) return;
    const fetchStats = async () => {
      try {
        const res = await fetch(
          `${API_URL}/questions/${editingQuestion.id}/statistics`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!res.ok) return;
        const payload = await res.json();
        const result = payload?.data ?? payload;
        if (result && typeof result === "object") {
          setStats({
            totalAttempts: result.totalAttempts ?? 0,
            correctAnswers: result.correctAnswers ?? 0,
            averageTimeSeconds: result.averageTimeSeconds ?? 0,
            successRate: result.successRate ?? 0,
          });
        }
      } catch {
        // Failed to load question statistics
      }
    };
    fetchStats();
  }, [isEditMode, editingQuestion?.id, token]);

  // ── AI Generate
  const handleAIGenerate = async () => {
    const missing: string[] = [];
    if (!questionText.trim()) missing.push("question text");
    if (!options[parseInt(correctAnswer)]?.trim())
      missing.push("correct answer");
    if (!subjectId) missing.push("subject");

    if (missing.length > 0) {
      toast({
        title: "Missing information",
        description: `Please fill in: ${missing.join(", ")} before generating an explanation.`,
        variant: "destructive",
      });
      return;
    }

    const selectedSubject = subjects.find((s) => s.id === subjectId);
    const selectedTopic = topics.find((t) => t.id === topicId);

    setAiLoading(true);
    try {
      const res = await fetch(`${API_URL}/ai/explain`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: questionText,
          correctAnswer: options[parseInt(correctAnswer)],
          subject: selectedSubject?.name ?? "",
          topic: selectedTopic?.name ?? "",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      const result = payload?.data ?? payload;
      const normalized = {
        stepByStep:
          result?.stepByStep ?? result?.steps ?? result?.explanation ?? "",
        clear: result?.clear ?? result?.explanation ?? "",
        simplified: result?.simplified ?? result?.explanation ?? "",
      };
      if (!normalized.stepByStep && !normalized.clear && !normalized.simplified) {
        throw new Error("Invalid AI response");
      }
      setAiResult(normalized);
      setAiDialogOpen(true);
    } catch {
      toast({
        title: "AI Error",
        description: "Failed to generate explanation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  };

  // ── Create handlers
  const handleCreateGrade = async (name: string, description: string) => {
    const exists = grades.find(
      (g) => g.name.toLowerCase() === name.toLowerCase(),
    );
    if (exists) {
      toast({
        title: "Already exists",
        description: `Grade "${name}" already exists. Selecting it.`,
      });
      setGradeId(exists.id);
      setGradeDialog(false);
      return;
    }
    setDialogLoading(true);
    try {
      const res = await fetch(`${API_URL}/grades`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const newGrade = await res.json();
      setGrades((prev) => [...prev, newGrade]);
      setGradeId(newGrade.id);
      setGradeDialog(false);
      toast({
        title: "Created",
        description: `Grade "${name}" created and selected.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to create grade.",
        variant: "destructive",
      });
    } finally {
      setDialogLoading(false);
    }
  };

  const handleCreateSubject = async (name: string, description: string) => {
    const exists = subjects.find(
      (s) => s.name.toLowerCase() === name.toLowerCase(),
    );
    if (exists) {
      toast({
        title: "Already exists",
        description: `Subject "${name}" already exists. Selecting it.`,
      });
      setSubjectId(exists.id);
      setSubjectDialog(false);
      return;
    }
    setDialogLoading(true);
    try {
      const res = await fetch(`${API_URL}/subjects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description, gradeId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const newSubject = await res.json();
      setSubjects((prev) => [...prev, newSubject]);
      setSubjectId(newSubject.id);
      setSubjectDialog(false);
      toast({
        title: "Created",
        description: `Subject "${name}" created and selected.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to create subject.",
        variant: "destructive",
      });
    } finally {
      setDialogLoading(false);
    }
  };

  const handleCreateTopic = async (name: string, description: string) => {
    const exists = topics.find(
      (t) => t.name.toLowerCase() === name.toLowerCase(),
    );
    if (exists) {
      toast({
        title: "Already exists",
        description: `Topic "${name}" already exists. Selecting it.`,
      });
      setTopicId(exists.id);
      setTopicDialog(false);
      return;
    }
    setDialogLoading(true);
    try {
      const res = await fetch(`${API_URL}/topics`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description, subjectId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const newTopic = await res.json();
      setTopics((prev) => [...prev, newTopic]);
      setTopicId(newTopic.id);
      setTopicDialog(false);
      toast({
        title: "Created",
        description: `Topic "${name}" created and selected.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to create topic.",
        variant: "destructive",
      });
    } finally {
      setDialogLoading(false);
    }
  };

  // ── Validate & Save
  const validate = () => {
    const e: Record<string, boolean> = {};
    if (!gradeId) e.grade = true;
    if (!subjectId) e.subject = true;
    if (!difficulty) e.difficulty = true;
    if (!questionText.trim() || questionText.trim().length < 10)
      e.questionText = true;
    if (options.some((o) => !o.trim())) e.options = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const requestBody = {
        subjectId,
        topicId: topicId || null,
        text: questionText,
        options,
        correctAnswer: options[parseInt(correctAnswer)],
        difficulty: difficulty.toLowerCase(),
        explanation,
      };

      const url = isEditMode
        ? `${API_URL}/questions/${editingQuestion.id}`
        : `${API_URL}/questions`;
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          Array.isArray(errorData.message)
            ? errorData.message.join(", ")
            : errorData.message || `HTTP ${res.status}`,
        );
      }

      toast({
        title: "Success",
        description: isEditMode
          ? "Question updated successfully!"
          : "Question saved successfully!",
      });
      navigate("/questions");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save question.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {isEditMode ? "Edit Question" : "Add New Question"}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/questions")}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <Button variant="outline">
            <Eye className="h-4 w-4 mr-1" /> Preview
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                {isEditMode ? "Update" : "Save"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-card rounded-lg border p-6 space-y-4">
        <h3 className="font-medium">Basic Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Grade */}
          <div>
            <Label>Grade *</Label>
            <Select value={gradeId} onValueChange={setGradeId}>
              <SelectTrigger
                className={errors.grade ? "border-destructive" : ""}
              >
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                {grades.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    Grade {g.name}
                  </SelectItem>
                ))}
                <div className="border-t mt-1 pt-1">
                  <button
                    type="button"
                    onClick={() => setGradeDialog(true)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-primary hover:bg-muted rounded-sm"
                  >
                    <Plus className="h-3 w-3" /> Create New Grade
                  </button>
                </div>
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div>
            <Label>Subject *</Label>
            <Select
              value={subjectId}
              onValueChange={setSubjectId}
              disabled={!gradeId}
            >
              <SelectTrigger
                className={errors.subject ? "border-destructive" : ""}
              >
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
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
            {!gradeId && (
              <p className="text-xs text-muted-foreground mt-1">
                Please select a grade first
              </p>
            )}
          </div>

          {/* Difficulty */}
          <div>
            <Label>Difficulty *</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger
                className={errors.difficulty ? "border-destructive" : ""}
              >
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
          <Label>Topic</Label>
          <Select
            value={topicId}
            onValueChange={setTopicId}
            disabled={!subjectId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select topic (optional)" />
            </SelectTrigger>
            <SelectContent>
              {topics.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
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
          {!subjectId && (
            <p className="text-xs text-muted-foreground mt-1">
              Please select a subject first
            </p>
          )}
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
        <p className="text-xs text-muted-foreground">
          Minimum 10 characters required
        </p>
      </div>

      {/* Options */}
      <div className="bg-card rounded-lg border p-6 space-y-4">
        <h3 className="font-medium">Answer Options *</h3>
        <RadioGroup value={correctAnswer} onValueChange={setCorrectAnswer}>
          {["A", "B", "C", "D"].map((label, i) => (
            <div key={label} className="flex items-center gap-3">
              <RadioGroupItem value={String(i)} id={`opt-${i}`} />
              <Label htmlFor={`opt-${i}`} className="font-medium w-6">
                {label}.
              </Label>
              <Input
                placeholder={`Option ${label}`}
                value={options[i]}
                onChange={(e) => {
                  const next = [...options];
                  next[i] = e.target.value;
                  setOptions(next);
                }}
                className={
                  errors.options && !options[i].trim()
                    ? "border-destructive flex-1"
                    : "flex-1"
                }
              />
            </div>
          ))}
        </RadioGroup>
        <p className="text-xs text-muted-foreground">
          Select the radio button next to the correct answer.
        </p>
      </div>

      {/* Explanation */}
      <div className="bg-card rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Explanation</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAIGenerate}
            disabled={aiLoading}
          >
            <Sparkles
              className={`h-4 w-4 mr-1 ${aiLoading ? "animate-pulse" : ""}`}
            />
            {aiLoading ? "Generating..." : "AI Generate"}
          </Button>
        </div>
        <Textarea
          placeholder="Explain why the correct answer is right..."
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={4}
        />
        {explanation && (
          <p className="text-xs text-muted-foreground">
            {explanation.length} characters
          </p>
        )}
      </div>

      {/* Statistics */}
      <div className="bg-card rounded-lg border p-6">
        <h3 className="font-medium mb-4">Statistics</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-card-foreground">
              {stats ? stats.totalAttempts.toLocaleString() : "0"}
            </p>
            <p className="text-xs text-muted-foreground">Attempts</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-card-foreground">
              {stats ? stats.correctAnswers.toLocaleString() : "0"}
            </p>
            <p className="text-xs text-muted-foreground">Correct</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-card-foreground">
              {stats
                ? stats.averageTimeSeconds > 0
                  ? `${stats.averageTimeSeconds}s`
                  : "—"
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Avg Time</p>
          </div>
        </div>
        {stats && stats.totalAttempts > 0 && (
          <div className="mt-4 pt-4 border-t text-center">
            <p className="text-2xl font-bold text-card-foreground">
              {stats.successRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">Success Rate</p>
          </div>
        )}
      </div>

      {/* Create Dialogs */}
      <CreateDialog
        open={gradeDialog}
        title="Create New Grade"
        placeholder="e.g. Grade 10"
        loading={dialogLoading}
        onConfirm={handleCreateGrade}
        onCancel={() => setGradeDialog(false)}
      />
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

      {/* AI Explanation Dialog */}
      <AIExplanationDialog
        open={aiDialogOpen}
        result={aiResult}
        onUse={(text) => {
          setExplanation(text);
          setAiDialogOpen(false);
          toast({
            title: "Applied",
            description: "AI explanation inserted into the field.",
          });
        }}
        onClose={() => setAiDialogOpen(false)}
      />
    </div>
  );
};

export default AddQuestionPage;
