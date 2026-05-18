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
import { apiClient } from "@/services/api/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<AccountUser | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Real API Actions State
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyBody, setNotifyBody] = useState("");
  const [notifyLoading, setNotifyLoading] = useState(false);

  // 1. Fetch Users Query
  const { data: users = [], isLoading: loading } = useQuery<AccountUser[], Error>({
    queryKey: ["users"],
    queryFn: async ({ signal }) => {
      const json = await apiClient.get<any>("/accounts/get-accounts", signal);
      const arr: AccountUser[] = Array.isArray(json.data) ? json.data : [];
      return arr.filter((u) => u.type === "student");
    },
    enabled: !!token,
  });

  // 2. Fetch Grades Query
  const { data: grades = [] } = useQuery<{ id: string; name: string }[], Error>({
    queryKey: ["grades"],
    queryFn: async ({ signal }) => {
      const json = await apiClient.get<any>("/grades", signal);
      return Array.isArray(json) ? json : (json.data ?? []);
    },
    enabled: !!token,
  });

  // 3. Fetch User Progress Query
  const { data: userProgress = null, isLoading: progressLoading } = useQuery<UserProgress | null, Error>({
    queryKey: ["user-progress", selectedUser?.id],
    queryFn: async ({ signal }) => {
      if (!selectedUser) return null;
      return apiClient.get<UserProgress>(`/progress/dashboard/user/${selectedUser.id}`, signal);
    },
    enabled: !!selectedUser && !!token,
  });

  // Actions Mutations
  const togglePremiumMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.post(`/accounts/${userId}/premium`);
    },
    onMutate: () => {
      setActionLoading("premium");
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      if (selectedUser && selectedUser.id === userId) {
        const newStatus = selectedUser.status === "premium" ? "free" : "premium";
        setSelectedUser({ ...selectedUser, status: newStatus });
      }
      toast({
        title: "Success",
        description: "Premium status toggled successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to toggle premium status.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setActionLoading(null);
    }
  });

  const handleTogglePremium = () => {
    if (selectedUser) togglePremiumMutation.mutate(selectedUser.id);
  };

  const toggleSuspendMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.post(`/accounts/${userId}/suspend`);
    },
    onMutate: () => {
      setActionLoading("suspend");
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, isActive: !selectedUser.isActive });
      }
      toast({
        title: "Success",
        description: "Suspension status updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update suspension status.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setActionLoading(null);
    }
  });

  const handleToggleSuspend = () => {
    if (selectedUser) toggleSuspendMutation.mutate(selectedUser.id);
  };

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiClient.post<{ password?: string }>(`/accounts/${userId}/reset-password`);
    },
    onMutate: () => {
      setActionLoading("password");
    },
    onSuccess: (data) => {
      if (data && data.password) {
        setNewPassword(data.password);
      } else {
        toast({
          title: "Success",
          description: "Password reset successfully.",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reset password.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setActionLoading(null);
    }
  });

  const handleResetPassword = () => {
    if (selectedUser) resetPasswordMutation.mutate(selectedUser.id);
  };

  const sendNotificationMutation = useMutation({
    mutationFn: async ({ userId, title, body }: { userId: string; title: string; body: string }) => {
      await apiClient.post(`/accounts/${userId}/notify`, { title, body });
    },
    onMutate: () => {
      setNotifyLoading(true);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Push notification sent successfully.",
      });
      setNotifyDialogOpen(false);
      setNotifyTitle("");
      setNotifyBody("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send push notification.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setNotifyLoading(false);
    }
  });

  const handleSendNotification = () => {
    if (selectedUser && notifyTitle.trim() && notifyBody.trim()) {
      sendNotificationMutation.mutate({
        userId: selectedUser.id,
        title: notifyTitle,
        body: notifyBody,
      });
    }
  };

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
              <Button
                size="sm"
                className="text-xs"
                onClick={handleTogglePremium}
                disabled={actionLoading === "premium"}
              >
                <Crown className="h-3 w-3 mr-1" />
                {actionLoading === "premium" ? "Updating..." : selectedUser.status === "premium" ? "Revoke Premium" : "Grant Premium"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={handleResetPassword}
                disabled={actionLoading === "password"}
              >
                <Key className="h-3 w-3 mr-1" />
                {actionLoading === "password" ? "Resetting..." : "Reset Password"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setNotifyDialogOpen(true)}
              >
                <Mail className="h-3 w-3 mr-1" /> Send Message
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "text-xs",
                  selectedUser.isActive
                    ? "text-destructive hover:bg-destructive/5"
                    : "text-success border-success/30 hover:bg-success/5"
                )}
                onClick={handleToggleSuspend}
                disabled={actionLoading === "suspend"}
              >
                <Ban className="h-3 w-3 mr-1" />
                {actionLoading === "suspend" ? "Updating..." : selectedUser.isActive ? "Suspend" : "Unsuspend"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      <Dialog open={!!newPassword} onOpenChange={(v) => !v && setNewPassword(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Password Reset Successful</DialogTitle>
            <DialogDescription>
              A new random password has been generated for <strong>{selectedUser?.name}</strong>. Please copy it and share it with the user securely.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border font-mono text-center justify-center text-lg font-bold select-all">
            {newPassword}
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={() => setNewPassword(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Notification Modal */}
      <Dialog open={notifyDialogOpen} onOpenChange={setNotifyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Push Notification</DialogTitle>
            <DialogDescription>
              This message will be sent directly to <strong>{selectedUser?.name}</strong>'s device as a push notification.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="title">Notification Title *</Label>
              <Input
                id="title"
                placeholder="Enter title..."
                value={notifyTitle}
                onChange={(e) => setNotifyTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="body">Message Body *</Label>
              <Textarea
                id="body"
                placeholder="Enter message text..."
                value={notifyBody}
                onChange={(e) => setNotifyBody(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNotifyDialogOpen(false)}
              disabled={notifyLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendNotification}
              disabled={notifyLoading || !notifyTitle.trim() || !notifyBody.trim()}
            >
              {notifyLoading ? "Sending..." : "Send Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;
