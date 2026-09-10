import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus, Pencil, Trash2, Search, Loader2, ChevronRight,
  ChevronLeft, BookOpen, Hash, FileQuestion, Lock, Globe,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/context/AuthContext";
import {
  fetchSubjects, createSubject, updateSubject, deleteSubject, updateSubjectAccess,
  fetchTopics,   createTopic,   updateTopic,   deleteTopic,
  fetchStreams,
  type Subject, type Topic, type Stream,
} from "@/services/api/content";
import { fetchPracticeQuestions, type PracticeQuestion } from "@/services/api/practice";
import { MathText } from "@/components/MathText";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

// ─── Difficulty colours ───────────────────────────────────────────────────────
const diffClass: Record<string, string> = {
  easy:   "bg-success/10 text-success border-success/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  hard:   "bg-destructive/10 text-destructive border-destructive/20",
};

type View = "subjects" | "topics" | "questions";

// ─── Subject Form Dialog ──────────────────────────────────────────────────────
interface SubjectFormProps {
  open: boolean;
  onClose: () => void;
  streams: Stream[];
  initial?: Subject | null;
  onSave: (data: { name: string; description: string; streamId: string; isFree?: boolean; accessType?: "free" | "paid" }) => void;
  saving: boolean;
}
const SubjectFormDialog = ({ open, onClose, streams, initial, onSave, saving }: SubjectFormProps) => {
  const [name, setName]         = useState(initial?.name ?? "");
  const [desc, setDesc]         = useState(initial?.description ?? "");
  const [streamId, setStreamId] = useState(initial?.streamId ?? "");
  const [isFree, setIsFree]     = useState(initial?.isFree ?? false);

  // reset when dialog opens
  const handleOpen = (v: boolean) => {
    if (v) {
      setName(initial?.name ?? "");
      setDesc(initial?.description ?? "");
      setStreamId(initial?.streamId ?? "");
      setIsFree(initial?.isFree ?? false);
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Subject" : "New Subject"}</DialogTitle>
          <DialogDescription>
            {initial ? "Update subject details." : "Add a new subject to the curriculum."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="s-name">Name *</Label>
            <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mathematics" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-stream">Stream *</Label>
            <Select value={streamId} onValueChange={setStreamId}>
              <SelectTrigger id="s-stream"><SelectValue placeholder="Select stream" /></SelectTrigger>
              <SelectContent>
                {streams.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-desc">Description</Label>
            <Textarea id="s-desc" value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="Optional description" />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Free Access</Label>
              <p className="text-xs text-muted-foreground">Allow students to practice this subject without a paid subscription</p>
            </div>
            <Switch checked={isFree} onCheckedChange={setIsFree} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            onClick={() => onSave({
              name: name.trim(),
              description: desc.trim(),
              streamId,
              isFree,
              accessType: isFree ? "free" : "paid",
            })}
            disabled={!name.trim() || !streamId || saving}
          >
            {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Saving…</> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Topic Form Dialog ────────────────────────────────────────────────────────
interface TopicFormProps {
  open: boolean;
  onClose: () => void;
  subjectName: string;
  initial?: Topic | null;
  onSave: (data: { name: string; description: string }) => void;
  saving: boolean;
}
const TopicFormDialog = ({ open, onClose, subjectName, initial, onSave, saving }: TopicFormProps) => {
  const [name, setName] = useState(initial?.name ?? "");
  const [desc, setDesc] = useState(initial?.description ?? "");

  const handleOpen = (v: boolean) => {
    if (v) { setName(initial?.name ?? ""); setDesc(initial?.description ?? ""); }
    else onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Topic" : "New Topic"}</DialogTitle>
          <DialogDescription>
            {initial ? `Update topic in ${subjectName}.` : `Add a new topic to ${subjectName}.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="t-name">Name *</Label>
            <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Algebra" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-desc">Description</Label>
            <Textarea id="t-desc" value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="Optional description" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => onSave({ name: name.trim(), description: desc.trim() })} disabled={!name.trim() || saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Saving…</> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const PracticePage = () => {
  const { token, initialized } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  // URL search params for state synchronization and deep linking
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get("view") as View | null;
  const subjectIdParam = searchParams.get("subjectId");
  const topicIdParam = searchParams.get("topicId");
  const pageParam = parseInt(searchParams.get("page") || "1", 10) || 1;

  const view: View = viewParam || (topicIdParam ? "questions" : subjectIdParam ? "topics" : "subjects");
  const qPage = pageParam;

  const [search, setSearch] = useState("");

  // dialogs
  const [subjectForm, setSubjectForm]   = useState<{ open: boolean; edit: Subject | null }>({ open: false, edit: null });
  const [topicForm, setTopicForm]       = useState<{ open: boolean; edit: Topic | null }>({ open: false, edit: null });
  const [deleteTarget, setDeleteTarget] = useState<{ type: "subject" | "topic"; id: string; name: string } | null>(null);

  const perPage = 10;

  // ── Streams
  const { data: streams = [] } = useQuery<Stream[], Error>({
    queryKey: ["streams"],
    queryFn: ({ signal }) => fetchStreams(signal),
    enabled: initialized && !!token,
    staleTime: 10 * 60 * 1000,
  });
  const streamNameById = useMemo(() => new Map(streams.map((s) => [s.id, s.name])), [streams]);

  // ── Subjects
  const { data: subjects = [], isLoading: subjectsLoading } = useQuery<Subject[], Error>({
    queryKey: ["subjects", "all"],
    queryFn: ({ signal }) => fetchSubjects(undefined, signal),
    enabled: initialized && !!token,
    staleTime: 5 * 60 * 1000,
  });

  const selectedSubject = useMemo(
    () => (subjectIdParam ? subjects.find((s) => s.id === subjectIdParam) ?? null : null),
    [subjects, subjectIdParam]
  );

  // ── Topics
  const { data: topics = [], isLoading: topicsLoading } = useQuery<Topic[], Error>({
    queryKey: ["topics", subjectIdParam],
    queryFn: ({ signal }) => fetchTopics(subjectIdParam!, signal),
    enabled: initialized && !!token && !!subjectIdParam,
    staleTime: 5 * 60 * 1000,
  });

  const selectedTopic = useMemo(
    () => (topicIdParam ? topics.find((t) => t.id === topicIdParam) ?? null : null),
    [topics, topicIdParam]
  );

  // ── Questions
  const { data: questionsData, isLoading: questionsLoading } = useQuery({
    queryKey: ["practice-questions", topicIdParam, qPage],
    queryFn: ({ signal }) => fetchPracticeQuestions(topicIdParam!, qPage, perPage, signal),
    enabled: initialized && !!token && view === "questions" && !!topicIdParam,
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
  const questions: PracticeQuestion[] = questionsData?.data ?? [];
  const qTotal      = questionsData?.total ?? 0;
  const qTotalPages = questionsData?.totalPages ?? 1;

  // ── Subject mutations
  const createSubjectMutation = useMutation({
    mutationFn: (d: { name: string; description: string; streamId: string; isFree?: boolean; accessType?: string }) => createSubject(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      toast({ title: "Subject created" });
      setSubjectForm({ open: false, edit: null });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateSubjectMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; description: string; streamId: string; isFree?: boolean; accessType?: string } }) =>
      updateSubject(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      toast({ title: "Subject updated" });
      setSubjectForm({ open: false, edit: null });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleAccessMutation = useMutation({
    mutationFn: ({ id, isFree, accessType }: { id: string; isFree: boolean; accessType: "free" | "paid" }) =>
      updateSubjectAccess(id, { isFree, accessType }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      toast({
        title: "Access Updated",
        description: `Subject marked as ${vars.isFree ? "Free for all students" : "Paid subscription required"}.`,
      });
    },
    onError: (e: Error) => toast({ title: "Failed to update access", description: e.message, variant: "destructive" }),
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: (id: string) => deleteSubject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      toast({ title: "Subject deleted" });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ── Topic mutations
  const createTopicMutation = useMutation({
    mutationFn: (d: { name: string; description: string }) => createTopic({ ...d, subjectId: subjectIdParam! }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["topics", subjectIdParam] });
      toast({ title: "Topic created" });
      setTopicForm({ open: false, edit: null });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateTopicMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; description: string } }) => updateTopic(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["topics", subjectIdParam] });
      toast({ title: "Topic updated" });
      setTopicForm({ open: false, edit: null });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteTopicMutation = useMutation({
    mutationFn: (id: string) => deleteTopic(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["topics", subjectIdParam] });
      toast({ title: "Topic deleted" });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ── Navigation helpers
  const goToSubjects = () => {
    setSearchParams({});
    setSearch("");
  };

  const goToTopics = (subject: Subject) => {
    setSearchParams({ view: "topics", subjectId: subject.id });
    setSearch("");
  };

  const goToQuestions = (topic: Topic) => {
    setSearchParams({
      view: "questions",
      subjectId: topic.subjectId || subjectIdParam || "",
      topicId: topic.id,
      page: "1",
    });
    setSearch("");
  };

  const goBack = () => {
    if (view === "questions") {
      setSearchParams({ view: "topics", subjectId: subjectIdParam || "" });
      setSearch("");
    } else if (view === "topics") {
      goToSubjects();
    }
  };

  const setQPage = (newPage: number) => {
    setSearchParams({
      view: "questions",
      subjectId: subjectIdParam || "",
      topicId: topicIdParam || "",
      page: String(newPage),
    });
  };

  const filteredSubjects = subjects.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
  const filteredTopics   = topics.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

  const isSavingSubject = createSubjectMutation.isPending || updateSubjectMutation.isPending;
  const isSavingTopic   = createTopicMutation.isPending   || updateTopicMutation.isPending;
  const isDeleting      = deleteSubjectMutation.isPending  || deleteTopicMutation.isPending;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Practice Curriculum</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage subjects, topics, and practice questions for students.</p>
        </div>
        {view === "subjects" && (
          <Button onClick={() => setSubjectForm({ open: true, edit: null })}>
            <Plus className="h-4 w-4 mr-1" /> New Subject
          </Button>
        )}
        {view === "topics" && selectedSubject && (
          <Button onClick={() => setTopicForm({ open: true, edit: null })}>
            <Plus className="h-4 w-4 mr-1" /> New Topic
          </Button>
        )}
      </div>

      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {view !== "subjects" && (
          <Button variant="ghost" size="sm" onClick={goBack} className="h-8 px-2">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        )}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <button
            onClick={goToSubjects}
            className={`hover:text-foreground transition-colors ${view === "subjects" ? "text-foreground font-semibold" : ""}`}
          >
            Subjects
          </button>
          {selectedSubject && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <button
                onClick={() => goToTopics(selectedSubject)}
                className={`hover:text-foreground transition-colors ${view === "topics" ? "text-foreground font-semibold" : ""}`}
              >
                {selectedSubject.name}
              </button>
            </>
          )}
          {selectedTopic && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-foreground font-semibold">{selectedTopic.name}</span>
            </>
          )}
        </div>
      </div>

      {/* ── Search ── */}
      {view !== "questions" && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={view === "subjects" ? "Search subjects…" : "Search topics…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* ══ SUBJECTS ══════════════════════════════════════════════════════════ */}
      {view === "subjects" && (
        subjectsLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filteredSubjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <BookOpen className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">{search ? "No subjects match your search." : "No subjects yet. Create one to get started."}</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium text-muted-foreground">Subject</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Stream</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Access</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Description</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubjects.map((subject) => {
                  const isFree = Boolean(subject.isFree || subject.accessType === "free");
                  return (
                    <tr key={subject.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <button onClick={() => goToTopics(subject)} className="font-medium hover:text-primary transition-colors text-left">
                          {subject.name}
                        </button>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          {subject.streamId ? (streamNameById.get(subject.streamId) ?? "—") : "All Streams"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={isFree}
                            disabled={toggleAccessMutation.isPending}
                            onCheckedChange={(checked) => {
                              toggleAccessMutation.mutate({
                                id: subject.id,
                                isFree: checked,
                                accessType: checked ? "free" : "paid",
                              });
                            }}
                          />
                          <Badge
                            variant="outline"
                            className={`text-xs flex items-center gap-1 ${
                              isFree
                                ? "bg-success/10 text-success border-success/30"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isFree ? (
                              <><Globe className="h-3 w-3" /> Free</>
                            ) : (
                              <><Lock className="h-3 w-3" /> Premium</>
                            )}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground max-w-xs truncate">{subject.description || "—"}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSubjectForm({ open: true, edit: subject })}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget({ type: "subject", id: subject.id, name: subject.name })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => goToTopics(subject)}>
                            Topics <ChevronRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ══ TOPICS ════════════════════════════════════════════════════════════ */}
      {view === "topics" && (
        topicsLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filteredTopics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Hash className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">{search ? "No topics match your search." : "No topics yet in this subject. Create one to get started."}</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium text-muted-foreground">Topic</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Description</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTopics.map((topic) => (
                  <tr key={topic.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <button onClick={() => goToQuestions(topic)} className="font-medium hover:text-primary transition-colors text-left">
                        {topic.name}
                      </button>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground max-w-xs truncate">{topic.description || "—"}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTopicForm({ open: true, edit: topic })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget({ type: "topic", id: topic.id, name: topic.name })}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => goToQuestions(topic)}>
                          Questions <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ══ QUESTIONS ═════════════════════════════════════════════════════════ */}
      {view === "questions" && (
        questionsLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <FileQuestion className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">No practice questions found for this topic.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {questions.map((q, i) => (
                <div key={q.id} className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground font-mono shrink-0 pt-0.5">{(qPage - 1) * perPage + i + 1}.</span>
                      <div className="text-sm font-medium flex-1">
                        <MathText text={q.questionText} />
                      </div>
                    </div>
                    <Badge variant="outline" className={`shrink-0 text-xs ${diffClass[q.difficulty] ?? ""}`}>{q.difficulty || "—"}</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-5">
                    {q.choices.map((choice, ci) => (
                      <div key={ci} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm border ${ci === q.correctIndex ? "bg-success/10 border-success/30 text-success font-medium" : "bg-muted/40 border-transparent text-muted-foreground"}`}>
                        <span className="text-xs font-mono shrink-0">{String.fromCharCode(65 + ci)}.</span>
                        <div className="flex-1">
                          <MathText text={choice} />
                        </div>
                        {ci === q.correctIndex && <span className="ml-auto text-xs font-medium">✓</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {qTotal === 0 ? "No results" : `Showing ${(qPage - 1) * perPage + 1}–${Math.min(qPage * perPage, qTotal)} of ${qTotal}`}
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={qPage === 1} onClick={() => setQPage(qPage - 1)}>Previous</Button>
                {Array.from({ length: Math.min(5, qTotalPages) }, (_, i) => {
                  const p = qPage <= 3 ? i + 1 : qPage - 2 + i;
                  if (p > qTotalPages) return null;
                  return <Button key={p} variant={p === qPage ? "default" : "outline"} size="sm" onClick={() => setQPage(p)}>{p}</Button>;
                })}
                <Button variant="outline" size="sm" disabled={qPage >= qTotalPages} onClick={() => setQPage(qPage + 1)}>Next</Button>
              </div>
            </div>
          </>
        )
      )}

      {/* ── Subject Form ── */}
      <SubjectFormDialog
        open={subjectForm.open}
        onClose={() => setSubjectForm({ open: false, edit: null })}
        streams={streams}
        initial={subjectForm.edit}
        saving={isSavingSubject}
        onSave={(data) => {
          if (subjectForm.edit) updateSubjectMutation.mutate({ id: subjectForm.edit.id, data });
          else createSubjectMutation.mutate(data);
        }}
      />

      {/* ── Topic Form ── */}
      <TopicFormDialog
        open={topicForm.open}
        onClose={() => setTopicForm({ open: false, edit: null })}
        subjectName={selectedSubject?.name ?? ""}
        initial={topicForm.edit}
        saving={isSavingTopic}
        onSave={(data) => {
          if (topicForm.edit) updateTopicMutation.mutate({ id: topicForm.edit.id, data });
          else createTopicMutation.mutate(data);
        }}
      />

      {/* ── Delete Confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === "subject" ? "Subject" : "Topic"}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deleteTarget?.name}"</strong>?
              {deleteTarget?.type === "subject" && " This will also delete all topics and questions under it."}
              {" "}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={() => {
                if (!deleteTarget) return;
                if (deleteTarget.type === "subject") deleteSubjectMutation.mutate(deleteTarget.id);
                else deleteTopicMutation.mutate(deleteTarget.id);
              }}
            >
              {isDeleting ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Deleting…</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PracticePage;
