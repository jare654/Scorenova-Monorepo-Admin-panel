import { useState, useEffect } from "react";
import { Search, Eye, X, Crown, Key, Mail, Ban, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/components/auth/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const API_URL = "https://learnova-backen.onrender.com/api/v1";

type AccountUser = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  type: string;
  isActive: boolean;
  gender: string;
  status: string;
  address: string | null;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
  gradeId?: string;
};

type UserProgress = {
  totalQuestionsAttempted: number;
  correctAnswers: number;
  incorrectAnswers: number;
  overallAccuracy: number;
  currentStreak: number;
  totalStudyTimeHours: number;
  progressBySubject: {
    subjectId: string;
    subjectName: string;
    accuracy: number;
    totalAttempted: number;
  }[];
};

const UsersPage = () => {
  const { token } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [grades, setGrades] = useState<{ id: string; name: string }[]>([]);
  const [gradeFilter, setGradeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<AccountUser | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const perPage = 10;

  useEffect(() => {
    if (!token) return;
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/accounts/get-accounts`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const arr: AccountUser[] = Array.isArray(json.data) ? json.data : [];
        const studentsOnly = arr.filter((u) => u.type === "student");
        setUsers(studentsOnly);
        setTotal(studentsOnly.length);
      } catch {
        toast({
          title: "Error",
          description: "Failed to load users.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [token]);

  useEffect(() => {
    if (!token) return;
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

  // Fetch user progress when a user is selected
  useEffect(() => {
    if (!selectedUser || !token) return;
    setUserProgress(null);
    const fetchProgress = async () => {
      setProgressLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/progress/dashboard/user/${selectedUser.id}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setUserProgress(json);
      } catch {
        console.error("Failed to load user progress");
      } finally {
        setProgressLoading(false);
      }
    };
    fetchProgress();
  }, [selectedUser?.id, token]);

  const filtered = users.filter((u: any) => {
    if (
      search &&
      !u.name.toLowerCase().includes(search.toLowerCase()) &&
      !u.email.toLowerCase().includes(search.toLowerCase()) &&
      !u.phoneNumber.includes(search)
    )
      return false;
    if (statusFilter !== "all" && u.status !== statusFilter) return false;
    if (gradeFilter !== "all" && u.gradeId !== gradeFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const getGradeName = (gradeId?: string) => {
    if (!gradeId) return "—";
    const found = grades.find((g) => g.id === gradeId);
    return found ? `Grade ${found.name}` : "—";
  };

  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-4 min-w-0">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
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
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {grades.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  Grade {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium text-muted-foreground">
                  User
                </th>
                <th className="p-3 text-left font-medium text-muted-foreground">
                  Grade
                </th>
                <th className="p-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="p-3 text-left font-medium text-muted-foreground">
                  Joined
                </th>
                <th className="p-3 text-left font-medium text-muted-foreground">
                  Last Active
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
              ) : paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-muted-foreground"
                  >
                    {gradeFilter !== "all"
                      ? `No Grade ${grades.find((g) => g.id === gradeFilter)?.name ?? ""} users found.`
                      : "No users found."}
                  </td>
                </tr>
              ) : (
                paginated.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedUser(u)}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                          {u.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {u.email || "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    {/* ✅ Grade from gradeId */}
                    <td className="p-3 text-sm">{getGradeName(u.gradeId)}</td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={
                          u.status === "premium"
                            ? "bg-warning/10 text-warning border-warning/20"
                            : u.status === "trial"
                              ? "bg-accent/10 text-accent border-accent/20"
                              : "bg-muted text-muted-foreground"
                        }
                      >
                        {u.status?.toUpperCase() || "FREE"}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {u.lastActiveAt
                        ? new Date(u.lastActiveAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">—</td>
                    <td className="p-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUser(u);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filtered.length === 0 ? 0 : (page - 1) * perPage + 1}-
            {Math.min(page * perPage, filtered.length)} of {filtered.length}
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
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages || totalPages === 0}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* User Detail Panel */}
      {selectedUser && (
        <div className="w-96 bg-card border rounded-lg shadow-lg animate-slide-in overflow-y-auto max-h-[calc(100vh-8rem)] shrink-0 hidden lg:block">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                  {selectedUser.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold">{selectedUser.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.email || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedUser.phoneNumber}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSelectedUser(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Grade & Status */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted rounded-lg p-3">
                <p className="text-muted-foreground text-xs">Grade</p>
                <p className="font-semibold">
                  {getGradeName(selectedUser.gradeId)}
                </p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-muted-foreground text-xs">Status</p>
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-1",
                    selectedUser.status === "premium"
                      ? "bg-warning/10 text-warning border-warning/20"
                      : selectedUser.status === "trial"
                        ? "bg-accent/10 text-accent border-accent/20"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {selectedUser.status?.toUpperCase() || "FREE"}
                </Badge>
              </div>
            </div>

            {/* Progress Stats */}
            {progressLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : userProgress ? (
              <>
                {/* Overall Stats */}
                <div>
                  <h4 className="text-sm font-medium mb-3">
                    Overall Statistics
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted rounded-lg p-3 text-center">
                      <p className="text-lg font-bold">
                        {userProgress.totalQuestionsAttempted}
                      </p>
                      <p className="text-xs text-muted-foreground">Questions</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-success">
                        {userProgress.correctAnswers}
                      </p>
                      <p className="text-xs text-muted-foreground">Correct</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-primary">
                        {userProgress.overallAccuracy.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">Accuracy</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-warning">
                        {userProgress.currentStreak}
                      </p>
                      <p className="text-xs text-muted-foreground">Streak</p>
                    </div>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center mt-2">
                    <p className="text-lg font-bold">
                      {userProgress.totalStudyTimeHours.toFixed(1)}h
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total Study Time
                    </p>
                  </div>
                </div>

                {/* Subject Performance */}
                <div>
                  <h4 className="text-sm font-medium mb-3">
                    Subject Performance
                  </h4>
                  {userProgress.progressBySubject.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No subject data available.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {userProgress.progressBySubject.map((s) => (
                        <div key={s.subjectId}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">
                              {s.subjectName}
                            </span>
                            <span className="font-medium">
                              {s.accuracy.toFixed(1)}%
                            </span>
                          </div>
                          <Progress value={s.accuracy} className="h-2" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : null}

            {/* Weak Topics */}
            <div>
              <h4 className="text-sm font-medium mb-2">Weak Topics</h4>
              <p className="text-xs text-muted-foreground">
                No data available.
              </p>
            </div>

            {/* Recent Activity */}
            <div>
              <h4 className="text-sm font-medium mb-3">Recent Activity</h4>
              <p className="text-xs text-muted-foreground">
                No data available.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" className="text-xs">
                <Crown className="h-3 w-3 mr-1" /> Grant Premium
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                <Key className="h-3 w-3 mr-1" /> Reset Password
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                <Mail className="h-3 w-3 mr-1" /> Send Message
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-destructive"
              >
                <Ban className="h-3 w-3 mr-1" /> Suspend
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
