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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/context/AuthContext";
import { useLocation } from "react-router-dom";

const API_URL = "https://learnova-backen.onrender.com/api/v1";

// ─── Reusable Create Dialog ───────────────────────────────────────────────────
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

// ─── Main Page ────────────────────────────────────────────────────────────────
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
  const [subjects, setSubjects] = useState<
    { id: string; name: string; gradeId: string }[]
  >([]);
  const [topics, setTopics] = useState<
    { id: string; name: string; subjectId: string }[]
  >([]);

  const [gradeDialog, setGradeDialog] = useState(false);
  const [subjectDialog, setSubjectDialog] = useState(false);
  const [topicDialog, setTopicDialog] = useState(false);
  const [dialogLoading, setDialogLoading] = useState(false);

  // ── Fetch grades on mount
  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const res = await fetch(`${API_URL}/grades`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setGrades(Array.isArray(json) ? json : (json.data ?? []));
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
      setSubjectId("");
      setTopicId("");
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
        setSubjectId("");
        setTopicId("");
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
      setTopicId("");
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
        setTopicId("");
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

  useEffect(() => {
    if (!editingQuestion) return;

    const fetchFullQuestion = async () => {
      try {
        const res = await fetch(
          `${API_URL}/questions/${editingQuestion.id}/edit`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!res.ok) throw new Error();

        const data = await res.json();

        // Fill form
        setQuestionText(data.text);
        setOptions(data.options);
        setExplanation(data.explanation || "");
        setDifficulty(data.difficulty);
        setSubjectId(data.subjectId);
        setTopicId(data.topicId || "");

        // set correct answer index
        const correctIndex = data.options.findIndex(
          (opt: string) => opt === data.correctAnswer,
        );
        setCorrectAnswer(String(correctIndex));
      } catch {
        toast({
          title: "Error",
          description: "Failed to load question details.",
          variant: "destructive",
        });
      }
    };

    fetchFullQuestion();
  }, [editingQuestion, token]);

  useEffect(() => {
    if (!editingQuestion || !subjects.length) return;

    const subject = subjects.find((s) => s.id === editingQuestion.subjectId);

    if (subject) {
      setGradeId(subject.gradeId);
    }
  }, [subjects, editingQuestion]);

  // ── Create Grade
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

  // ── Create Subject
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

  // ── Create Topic
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

      const method = isEditMode ? "PATCH" : "POST";

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
        throw new Error(errorData.message || `HTTP ${res.status}`);
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
                <Save className="h-4 w-4 mr-1" /> Save
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
          <Button variant="outline" size="sm">
            <Sparkles className="h-4 w-4 mr-1" /> AI Generate
          </Button>
        </div>
        <Textarea
          placeholder="Explain why the correct answer is right..."
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={4}
        />
      </div>

      {/* Statistics */}
      <div className="bg-card rounded-lg border p-6">
        <h3 className="font-medium mb-4">Statistics</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-card-foreground">0</p>
            <p className="text-xs text-muted-foreground">Attempts</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-card-foreground">0</p>
            <p className="text-xs text-muted-foreground">Correct</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-card-foreground">—</p>
            <p className="text-xs text-muted-foreground">Avg Time</p>
          </div>
        </div>
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
    </div>
  );
};

export default AddQuestionPage;
