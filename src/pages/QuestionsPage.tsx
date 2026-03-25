import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Upload, Pencil, Trash2, Copy, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { mockQuestions } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

const difficultyColors: Record<string, string> = {
  Easy: "bg-success/10 text-success border-success/20",
  Medium: "bg-warning/10 text-warning border-warning/20",
  Hard: "bg-destructive/10 text-destructive border-destructive/20",
};

const QuestionsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = useMemo(() => {
    return mockQuestions.filter((q) => {
      if (search && !q.text.toLowerCase().includes(search.toLowerCase())) return false;
      if (gradeFilter !== "all" && q.grade !== Number(gradeFilter)) return false;
      if (subjectFilter !== "all" && q.subject !== subjectFilter) return false;
      if (difficultyFilter !== "all" && q.difficulty !== difficultyFilter) return false;
      return true;
    });
  }, [search, gradeFilter, subjectFilter, difficultyFilter]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === paginated.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginated.map((q) => q.id)));
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search questions..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <Select value={gradeFilter} onValueChange={(v) => { setGradeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Grade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            <SelectItem value="6">Grade 6</SelectItem>
            <SelectItem value="8">Grade 8</SelectItem>
            <SelectItem value="12">Grade 12</SelectItem>
          </SelectContent>
        </Select>
        <Select value={subjectFilter} onValueChange={(v) => { setSubjectFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {["Mathematics","Physics","English","Biology","Chemistry","History","Geography"].map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={difficultyFilter} onValueChange={(v) => { setDifficultyFilter(v); setPage(1); }}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Difficulty" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Easy">Easy</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Hard">Hard</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => navigate("/questions/new")}><Plus className="h-4 w-4 mr-1" /> Add New</Button>
        <Button variant="outline"><Upload className="h-4 w-4 mr-1" /> Import CSV</Button>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-muted p-3 rounded-lg">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button variant="destructive" size="sm" onClick={() => {
            toast({ title: "Deleted", description: `${selected.size} questions deleted.` });
            setSelected(new Set());
          }}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
          <Button variant="outline" size="sm">Export Selected</Button>
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-lg border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left w-10">
                <Checkbox checked={selected.size === paginated.length && paginated.length > 0} onCheckedChange={toggleAll} />
              </th>
              <th className="p-3 text-left font-medium text-muted-foreground">ID</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Question</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Grade / Subject</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Difficulty</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Accuracy</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((q) => (
              <tr key={q.id} className="border-b hover:bg-muted/30 transition-colors">
                <td className="p-3"><Checkbox checked={selected.has(q.id)} onCheckedChange={() => toggleSelect(q.id)} /></td>
                <td className="p-3 font-mono text-xs text-muted-foreground">{q.id}</td>
                <td className="p-3 max-w-xs truncate">{q.text}</td>
                <td className="p-3">
                  <div className="text-xs"><span className="font-medium">Grade {q.grade}</span> · {q.subject}</div>
                </td>
                <td className="p-3">
                  <Badge variant="outline" className={difficultyColors[q.difficulty]}>{q.difficulty}</Badge>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <Progress value={q.accuracy} className="w-16 h-2" />
                    <span className="text-xs text-muted-foreground">{q.accuracy}%</span>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/questions/new")}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Showing {(page - 1) * perPage + 1}-{Math.min(page * perPage, filtered.length)} of {filtered.length}</p>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = page <= 3 ? i + 1 : page - 2 + i;
            if (p > totalPages) return null;
            return (
              <Button key={p} variant={p === page ? "default" : "outline"} size="sm" onClick={() => setPage(p)}>
                {p}
              </Button>
            );
          })}
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
};

export default QuestionsPage;
