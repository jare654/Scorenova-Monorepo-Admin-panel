import { useState, useMemo } from "react";
import { Search, Eye, X, Crown, Key, Mail, Ban, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { mockUsers } from "@/data/mockData";
import type { User } from "@/types";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  premium: "bg-warning/10 text-warning border-warning/20",
  free: "bg-muted text-muted-foreground",
  trial: "bg-primary-light/10 text-primary-light border-primary-light/20",
};

const UsersPage = () => {
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = useMemo(() => {
    return mockUsers.filter((u) => {
      if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
      if (gradeFilter !== "all" && u.grade !== Number(gradeFilter)) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      return true;
    });
  }, [search, gradeFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-4 min-w-0">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name or email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
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
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium text-muted-foreground">User</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Grade</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Joined</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Last Active</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Accuracy</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((u) => (
                <tr key={u.id} className="border-b hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedUser(u)}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                        {u.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">Grade {u.grade}</td>
                  <td className="p-3">
                    <Badge variant="outline" className={statusStyles[u.status]}>{u.status}</Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">{new Date(u.joinDate).toLocaleDateString()}</td>
                  <td className="p-3 text-muted-foreground">{new Date(u.lastActive).toLocaleDateString()}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span>{u.accuracy}%</span>
                      {u.accuracyTrend > 0 ? (
                        <TrendingUp className="h-3 w-3 text-success" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-destructive" />
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setSelectedUser(u); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
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
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      </div>

      {/* User Detail Panel */}
      {selectedUser && (
        <div className="w-96 bg-card border rounded-lg shadow-lg animate-slide-in overflow-y-auto max-h-[calc(100vh-8rem)] shrink-0 hidden lg:block">
          <div className="p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                  {selectedUser.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <h3 className="font-semibold">{selectedUser.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  <p className="text-xs text-muted-foreground">{selectedUser.phone}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedUser(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted rounded-lg p-3"><p className="text-muted-foreground text-xs">Grade</p><p className="font-semibold">Grade {selectedUser.grade}</p></div>
              <div className="bg-muted rounded-lg p-3"><p className="text-muted-foreground text-xs">Status</p><Badge variant="outline" className={cn("mt-1", statusStyles[selectedUser.status])}>{selectedUser.status}</Badge></div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">Subject Performance</h4>
              <div className="space-y-2">
                {Object.entries(selectedUser.subjectAccuracy).map(([subj, acc]) => (
                  <div key={subj} className="flex items-center gap-2">
                    <span className="text-xs w-20 text-muted-foreground">{subj}</span>
                    <Progress value={acc} className="flex-1 h-2" />
                    <span className="text-xs font-medium w-10 text-right">{acc}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Weak Topics</h4>
              <div className="flex flex-wrap gap-1">
                {selectedUser.weakTopics.map(t => (
                  <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">Recent Activity</h4>
              <div className="space-y-2">
                {selectedUser.activityLog.map(a => (
                  <div key={a.id} className="text-xs">
                    <p className="text-card-foreground">{a.message}</p>
                    <p className="text-muted-foreground">{a.time}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" className="text-xs"><Crown className="h-3 w-3 mr-1" /> Grant Premium</Button>
              <Button variant="outline" size="sm" className="text-xs"><Key className="h-3 w-3 mr-1" /> Reset Password</Button>
              <Button variant="outline" size="sm" className="text-xs"><Mail className="h-3 w-3 mr-1" /> Send Message</Button>
              <Button variant="outline" size="sm" className="text-xs text-destructive"><Ban className="h-3 w-3 mr-1" /> Suspend</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
