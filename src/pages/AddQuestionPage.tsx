import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save, X, Sparkles, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

const AddQuestionPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState("0");
  const [explanation, setExplanation] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const validate = () => {
    const e: Record<string, boolean> = {};
    if (!grade) e.grade = true;
    if (!subject) e.subject = true;
    if (!difficulty) e.difficulty = true;
    if (!questionText.trim()) e.questionText = true;
    if (options.some((o) => !o.trim())) e.options = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      toast({ title: "Validation Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    toast({ title: "Question Saved", description: "The question has been saved successfully." });
    navigate("/questions");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Add New Question</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/questions")}><X className="h-4 w-4 mr-1" /> Cancel</Button>
          <Button variant="outline"><Eye className="h-4 w-4 mr-1" /> Preview</Button>
          <Button onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Save</Button>
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-card rounded-lg border p-6 space-y-4">
        <h3 className="font-medium">Basic Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Grade *</Label>
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger className={errors.grade ? "border-destructive" : ""}><SelectValue placeholder="Select grade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="6">Grade 6</SelectItem>
                <SelectItem value="8">Grade 8</SelectItem>
                <SelectItem value="12">Grade 12</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Subject *</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger className={errors.subject ? "border-destructive" : ""}><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>
                {["Mathematics","Physics","English","Biology","Chemistry","History","Geography"].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Difficulty *</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className={errors.difficulty ? "border-destructive" : ""}><SelectValue placeholder="Difficulty" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Topic</Label>
          <Input placeholder="Enter topic" value={topic} onChange={(e) => setTopic(e.target.value)} />
        </div>
      </div>

      {/* Question Text */}
      <div className="bg-card rounded-lg border p-6 space-y-4">
        <h3 className="font-medium">Question Text *</h3>
        <Textarea
          placeholder="Enter the question text..."
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          rows={4}
          className={errors.questionText ? "border-destructive" : ""}
        />
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
          <Button variant="outline" size="sm"><Sparkles className="h-4 w-4 mr-1" /> AI Generate</Button>
        </div>
        <Textarea
          placeholder="Explain why the correct answer is right..."
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={4}
        />
      </div>

      {/* Statistics (read-only) */}
      <div className="bg-card rounded-lg border p-6">
        <h3 className="font-medium mb-4">Statistics</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div><p className="text-2xl font-bold text-card-foreground">0</p><p className="text-xs text-muted-foreground">Attempts</p></div>
          <div><p className="text-2xl font-bold text-card-foreground">0</p><p className="text-xs text-muted-foreground">Correct</p></div>
          <div><p className="text-2xl font-bold text-card-foreground">—</p><p className="text-xs text-muted-foreground">Avg Time</p></div>
        </div>
      </div>
    </div>
  );
};

export default AddQuestionPage;
