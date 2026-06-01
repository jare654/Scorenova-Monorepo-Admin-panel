import { useState } from "react";
import { Search, Eye, X, Crown, Key, Mail, Ban, Loader2, Edit, Trash2 } from "lucide-react";
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

// ─── Types ────────────────────────────────────────────────────────────────────

type AccountUser = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  type: string;
  isActive: boolean;
  isPremium: boolean;
  gender: string;
  status: string;
  address: string | null;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
  gradeId?: string;
  premiumStartDate?: string | null;
  premiumEndDate?: string | null;
  premiumPlan?: string | null;
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

// ─── Page ─────────────────────────────────────────────────────────────────────

const UsersPage = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch]             = useState("");
  const [streamFilter, setStreamFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<AccountUser | null>(null);
  const [page, setPage]                 = useState(1);
  const perPage = 10;

  // Action state
  const [actionLoading, setActionLoading]   = useState<string | null>(null);
  const [newPassword, setNewPassword]       = useState<string | null>(null);
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [notifyChannel, setNotifyChannel]   = useState<"notification" | "sms" | "both">("notification");
  const [notifyTitle, setNotifyTitle]       = useState("");
  const [notifyBody, setNotifyBody]         = useState("");
  const [notifyLoading, setNotifyLoading]   = useState(false);

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName]             = useState("");
  const [editEmail, setEditEmail]           = useState("");
  const [editPhone, setEditPhone]           = useState("");
  const [editGender, setEditGender]         = useState("");
  const [editStreamId, setEditStreamId]     = useState("");
  const [editLoading, setEditLoading]       = useState(false);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading]       = useState(false);

  // Grant Premium state — dates auto-calculated from plan, no manual date pickers
  const [grantPremiumDialogOpen, setGrantPremiumDialogOpen] = useState(false);
  const [grantConfirmText, setGrantConfirmText]             = useState("");
  const [grantPlan, setGrantPlan]                           = useState("Monthly");

  // Plan → duration in days
  const PLAN_DAYS: Record<string, number> = {
    Monthly:   30,
    Quarterly: 90,
    Annual:    365,
  };

  const getGrantDates = (plan: string) => {
    const start = new Date();
    const end   = new Date(start);
    end.setDate(end.getDate() + (PLAN_DAYS[plan] ?? 30));
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate:   end.toISOString().slice(0, 10),
    };
  };

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: users = [], isLoading: loading } = useQuery<AccountUser[], Error>({
    queryKey: ["users"],
    queryFn: async ({ signal }) => {
      const json = await apiClient.get<any>("/accounts/get-accounts", signal);
      const arr: AccountUser[] = Array.isArray(json.data) ? json.data : [];
      return arr.filter((u) => u.type === "student");
    },
    enabled: !!token,
  });

  const { data: streams = [] } = useQuery<{ id: string; name: string }[], Error>({
    queryKey: ["streams"],
    queryFn: async ({ signal }) => {
      const json = await apiClient.get<any>("/streams", signal);
      return Array.isArray(json) ? json : (json.data ?? []);
    },
    enabled: !!token,
  });

  const { data: userProgress = null, isLoading: progressLoading } = useQuery<
    UserProgress | null,
    Error
  >({
    queryKey: ["user-progress", selectedUser?.id],
    queryFn: async ({ signal }) => {
      if (!selectedUser) return null;
      return apiClient.get<UserProgress>(
        `/progress/dashboard/user/${selectedUser.id}`,
        signal,
      );
    },
    enabled: !!selectedUser && !!token,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const togglePremiumMutation = useMutation({
    mutationFn: (userId: string) => apiClient.post(`/accounts/${userId}/premium`),
    onMutate:   () => setActionLoading("premium"),
    onSuccess:  (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      if (selectedUser?.id === userId) {
        const newStatus = selectedUser.status === "premium" ? "free" : "premium";
        setSelectedUser({ ...selectedUser, status: newStatus });
      }
      toast({ title: "Success", description: "Premium status toggled successfully." });
    },
    onError:    () => toast({ title: "Error", description: "Failed to toggle premium status.", variant: "destructive" }),
    onSettled:  () => setActionLoading(null),
  });

  const grantPremiumMutation = useMutation({
    mutationFn: ({ id, startDate, endDate, plan }: {
      id: string; startDate: string; endDate: string; plan: string;
    }) => apiClient.post(`/accounts/${id}/grant-premium`, { startDate, endDate, plan }),
    onMutate:  () => setActionLoading("premium"),
    onSuccess: (_, vars) => {
      // Clear the GET cache so the refetch returns fresh data (not the 30s cached version)
      apiClient.clearCache("/accounts/get-accounts");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      if (selectedUser?.id === vars.id) {
        setSelectedUser({
          ...selectedUser,
          status: "premium",
          isPremium: true,
          premiumStartDate: vars.startDate,
          premiumEndDate: vars.endDate,
          premiumPlan: vars.plan,
        });
      }
      toast({ title: "Success", description: "Premium access granted successfully." });
      setGrantPremiumDialogOpen(false);
      setGrantConfirmText("");
      setGrantPlan("Monthly");
    },
    onError:   () => toast({ title: "Error", description: "Failed to grant premium.", variant: "destructive" }),
    onSettled: () => setActionLoading(null),
  });

  const toggleSuspendMutation = useMutation({
    mutationFn: (userId: string) => apiClient.post(`/accounts/${userId}/suspend`),
    onMutate:   () => setActionLoading("suspend"),
    onSuccess:  (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, isActive: !selectedUser.isActive });
      }
      toast({ title: "Success", description: "Suspension status updated." });
    },
    onError:    () => toast({ title: "Error", description: "Failed to update suspension status.", variant: "destructive" }),
    onSettled:  () => setActionLoading(null),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) =>
      apiClient.post<{ password?: string }>(`/accounts/${userId}/reset-password`),
    onMutate:  () => setActionLoading("password"),
    onSuccess: (data) => {
      if (data?.password) setNewPassword(data.password);
      else toast({ title: "Success", description: "Password reset successfully." });
    },
    onError:   () => toast({ title: "Error", description: "Failed to reset password.", variant: "destructive" }),
    onSettled: () => setActionLoading(null),
  });

  const sendNotificationMutation = useMutation({
    mutationFn: ({ userId, title, body, channel }: {
      userId: string; title: string; body: string;
      channel: "notification" | "sms" | "both";
    }) => apiClient.post(`/accounts/${userId}/notify`, { title, body, channel }),
    onMutate:  () => setNotifyLoading(true),
    onSuccess: () => {
      toast({ title: "Success", description: "Message sent successfully." });
      setNotifyDialogOpen(false);
      setNotifyTitle("");
      setNotifyBody("");
      setNotifyChannel("notification");
    },
    onError:   () => toast({ title: "Error", description: "Failed to send message.", variant: "destructive" }),
    onSettled: () => setNotifyLoading(false),
  });

  const updateUserMutation = useMutation({
    mutationFn: (d: {
      id: string; name: string; email: string;
      phoneNumber: string; gender: string; gradeId: string;
    }) =>
      apiClient.post(`/accounts/${d.id}/update`, {
        name: d.name,
        email: d.email,
        phoneNumber: d.phoneNumber,
        gender: d.gender,
        gradeId: d.gradeId || null,
        isActive: selectedUser?.isActive ?? true,
        isPremium: selectedUser?.status === "premium",
      }),
    onMutate:  () => setEditLoading(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      if (selectedUser) {
        setSelectedUser({
          ...selectedUser,
          name: editName,
          email: editEmail,
          phoneNumber: editPhone,
          gender: editGender,
          gradeId: editStreamId || undefined,
        });
      }
      toast({ title: "Success", description: "Student details updated successfully." });
      setEditDialogOpen(false);
    },
    onError:   (err: any) => toast({ title: "Error", description: err.message || "Failed to update student details.", variant: "destructive" }),
    onSettled: () => setEditLoading(false),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => apiClient.delete(`/accounts/${userId}`),
    onMutate:  () => setDeleteLoading(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setSelectedUser(null);
      toast({ title: "Account Deleted", description: "The student account has been permanently deleted." });
      setDeleteDialogOpen(false);
    },
    onError:   (err: any) => toast({ title: "Error Deleting Account", description: err.message || "Failed to delete the student account.", variant: "destructive" }),
    onSettled: () => setDeleteLoading(false),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleTogglePremium  = () => selectedUser && togglePremiumMutation.mutate(selectedUser.id);
  const handleToggleSuspend  = () => selectedUser && toggleSuspendMutation.mutate(selectedUser.id);
  const handleResetPassword  = () => selectedUser && resetPasswordMutation.mutate(selectedUser.id);
  const handleConfirmDelete  = () => selectedUser && deleteUserMutation.mutate(selectedUser.id);

  const handleSendNotification = () => {
    if (selectedUser && notifyTitle.trim() && notifyBody.trim()) {
      sendNotificationMutation.mutate({
        userId: selectedUser.id,
        title: notifyTitle,
        body: notifyBody,
        channel: notifyChannel,
      });
    }
  };

  const handleOpenEditDialog = (u: AccountUser) => {
    setEditName(u.name);
    setEditEmail(u.email || "");
    setEditPhone(u.phoneNumber);
    setEditGender(u.gender || "male");
    setEditStreamId(u.gradeId || "");
    setEditDialogOpen(true);
  };

  const handleSaveUserEdit = () => {
    if (selectedUser && editName.trim() && editPhone.trim()) {
      updateUserMutation.mutate({
        id: selectedUser.id,
        name: editName.trim(),
        email: editEmail.trim(),
        phoneNumber: editPhone.trim(),
        gender: editGender,
        gradeId: editStreamId,
      });
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────────

  const filtered = users.filter((u) => {
    if (
      search &&
      !u.name.toLowerCase().includes(search.toLowerCase()) &&
      !u.email.toLowerCase().includes(search.toLowerCase()) &&
      !u.phoneNumber.includes(search)
    )
      return false;
    // statusFilter: "premium" checks isPremium boolean; "free"/"trial" check the status string
    if (statusFilter === "premium" && !u.isPremium) return false;
    if (statusFilter === "free" && (u.isPremium || u.status === "trial")) return false;
    if (statusFilter === "trial" && u.status !== "trial") return false;
    if (streamFilter !== "all" && u.gradeId !== streamFilter) return false;
    if (activityFilter === "active" && !u.isActive) return false;
    if (activityFilter === "suspended" && u.isActive) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated  = filtered.slice((page - 1) * perPage, page * perPage);

  const getStreamName = (streamId?: string) => {
    if (!streamId) return "—";
    return streams.find((s) => s.id === streamId)?.name ?? "—";
  };

  const initials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex gap-6">

      {/* ── Left: Table ── */}
      <div className="flex-1 space-y-4 min-w-0">

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>

          <Select value={streamFilter} onValueChange={(v) => { setStreamFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Stream" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Streams</SelectItem>
              {streams.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
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

          <Select value={activityFilter} onValueChange={(v) => { setActivityFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Activity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activity</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {["Student", "Stream", "Payment Status", "Joined", "Student Status", "Actions"].map(
                  (h) => (
                    <th key={h} className="p-3 text-left font-medium text-muted-foreground">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    {streamFilter !== "all"
                      ? `No ${streams.find((s) => s.id === streamFilter)?.name ?? ""} students found.`
                      : "No students found."}
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
                          {initials(u.name)}
                        </div>
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-sm">{getStreamName(u.gradeId)}</td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={
                          u.isPremium
                            ? "bg-warning/10 text-warning border-warning/20"
                            : u.status === "trial"
                              ? "bg-accent/10 text-accent border-accent/20"
                              : "bg-muted text-muted-foreground"
                        }
                      >
                        {u.isPremium ? "PREMIUM" : u.status?.toUpperCase() || "FREE"}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={
                          u.isActive
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                        }
                      >
                        {u.isActive ? "ACTIVE" : "SUSPENDED"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); setSelectedUser(u); }}
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
            Showing {filtered.length === 0 ? 0 : (page - 1) * perPage + 1}–
            {Math.min(page * perPage, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages || totalPages === 0} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* ── Right: Detail Panel ── */}
      {selectedUser && (
        <div className="w-96 bg-card border rounded-lg shadow-lg overflow-y-auto max-h-[calc(100vh-8rem)] shrink-0 hidden lg:block">
          <div className="p-6 space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                  {initials(selectedUser.name)}
                </div>
                <div>
                  <h3 className="font-semibold">{selectedUser.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedUser.email || "—"}</p>
                  <p className="text-xs text-muted-foreground">{selectedUser.phoneNumber}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedUser(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Stream & Status */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted rounded-lg p-3">
                <p className="text-muted-foreground text-xs">Stream</p>
                <p className="font-semibold">{getStreamName(selectedUser.gradeId)}</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-muted-foreground text-xs">Status</p>
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-1",
                    selectedUser.isPremium
                      ? "bg-warning/10 text-warning border-warning/20"
                      : selectedUser.status === "trial"
                        ? "bg-accent/10 text-accent border-accent/20"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {selectedUser.isPremium ? "PREMIUM" : selectedUser.status?.toUpperCase() || "FREE"}
                </Badge>
              </div>
            </div>

            {/* Premium Status */}
            <div className="bg-muted rounded-lg p-3 space-y-1">
              <p className="text-muted-foreground text-xs font-medium">Premium Status</p>
              {selectedUser.status === "premium" && selectedUser.premiumEndDate && new Date(selectedUser.premiumEndDate) > new Date() ? (
                <div className="flex flex-col gap-1">
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20 w-fit">
                    Premium Active
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Expires: {new Date(selectedUser.premiumEndDate).toLocaleDateString()}
                  </p>
                  {selectedUser.premiumPlan && (
                    <p className="text-xs text-muted-foreground">Plan: {selectedUser.premiumPlan}</p>
                  )}
                </div>
              ) : selectedUser.status === "premium" && selectedUser.premiumEndDate && new Date(selectedUser.premiumEndDate) <= new Date() ? (
                <div className="flex flex-col gap-1">
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 w-fit">
                    Premium Expired
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Expired: {new Date(selectedUser.premiumEndDate).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <Badge variant="outline" className="bg-muted text-muted-foreground w-fit">
                  Free
                </Badge>
              )}
            </div>

            {/* Progress */}
            {progressLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : userProgress ? (
              <>
                <div>
                  <h4 className="text-sm font-medium mb-3">Overall Statistics</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted rounded-lg p-3 text-center">
                      <p className="text-lg font-bold">{userProgress.totalQuestionsAttempted}</p>
                      <p className="text-xs text-muted-foreground">Questions</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-success">{userProgress.correctAnswers}</p>
                      <p className="text-xs text-muted-foreground">Correct</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-primary">
                        {userProgress.overallAccuracy.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">Accuracy</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-warning">{userProgress.currentStreak}</p>
                      <p className="text-xs text-muted-foreground">Streak</p>
                    </div>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center mt-2">
                    <p className="text-lg font-bold">{userProgress.totalStudyTimeHours.toFixed(1)}h</p>
                    <p className="text-xs text-muted-foreground">Total Study Time</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-3">Subject Performance</h4>
                  {userProgress.progressBySubject.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No subject data available.</p>
                  ) : (
                    <div className="space-y-2">
                      {userProgress.progressBySubject.map((s) => (
                        <div key={s.subjectId}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">{s.subjectName}</span>
                            <span className="font-medium">{s.accuracy.toFixed(1)}%</span>
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
              <p className="text-xs text-muted-foreground">No data available.</p>
            </div>

            {/* ── Action Buttons — all uniform outline style ── */}
            <div className="grid grid-cols-2 gap-2">

              {/* Edit Details */}
              <Button
                variant="outline"
                size="sm"
                className="text-xs w-full"
                onClick={() => handleOpenEditDialog(selectedUser)}
              >
                <Edit className="h-3.5 w-3.5 mr-1" /> Edit Details
              </Button>

              {/* Delete Account */}
              <Button
                variant="outline"
                size="sm"
                className="text-xs w-full"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Account
              </Button>

              {/* Grant / Revoke Premium — solid primary, stands out intentionally */}
              <Button
                size="sm"
                className="text-xs w-full"
                onClick={() => {
                  if (selectedUser.status === "premium") {
                    togglePremiumMutation.mutate(selectedUser.id);
                  } else {
                    setGrantPremiumDialogOpen(true);
                  }
                }}
                disabled={actionLoading === "premium"}
              >
                <Crown className="h-3 w-3 mr-1" />
                {actionLoading === "premium"
                  ? "Updating..."
                  : selectedUser.status === "premium"
                    ? "Revoke Premium"
                    : "Grant Premium"}
              </Button>

              {/* Reset Password */}
              <Button
                variant="outline"
                size="sm"
                className="text-xs w-full"
                onClick={handleResetPassword}
                disabled={actionLoading === "password"}
              >
                <Key className="h-3 w-3 mr-1" />
                {actionLoading === "password" ? "Resetting..." : "Reset Password"}
              </Button>

              {/* Send Message */}
              <Button
                variant="outline"
                size="sm"
                className="text-xs w-full"
                onClick={() => setNotifyDialogOpen(true)}
              >
                <Mail className="h-3 w-3 mr-1" /> Send Message
              </Button>

              {/* Suspend / Unsuspend */}
              <Button
                variant="outline"
                size="sm"
                className="text-xs w-full"
                onClick={handleToggleSuspend}
                disabled={actionLoading === "suspend"}
              >
                <Ban className="h-3 w-3 mr-1" />
                {actionLoading === "suspend"
                  ? "Updating..."
                  : selectedUser.isActive
                    ? "Suspend"
                    : "Unsuspend"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ── */}
      <Dialog open={!!newPassword} onOpenChange={(v) => !v && setNewPassword(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Password Reset Successful</DialogTitle>
            <DialogDescription>
              A new random password has been generated for{" "}
              <strong>{selectedUser?.name}</strong>. Share it with the student securely.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border font-mono text-center justify-center text-lg font-bold select-all">
            {newPassword}
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={() => setNewPassword(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Send Message Modal — channel selector ── */}
      <Dialog
        open={notifyDialogOpen}
        onOpenChange={(v) => {
          if (!v) {
            setNotifyDialogOpen(false);
            setNotifyTitle("");
            setNotifyBody("");
            setNotifyChannel("notification");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Send Message to {selectedUser?.name}
            </DialogTitle>
            <DialogDescription>
              Choose how to reach this student, then compose your message.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* ── Channel selector ── */}
            <div className="space-y-2">
              <Label>Send via *</Label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { value: "notification", label: "Notification", icon: "🔔" },
                    { value: "sms",          label: "SMS",          icon: "💬" },
                    { value: "both",         label: "Both",         icon: "📣" },
                  ] as const
                ).map((ch) => (
                  <button
                    key={ch.value}
                    type="button"
                    onClick={() => setNotifyChannel(ch.value)}
                    className={`flex flex-col items-center gap-1 rounded-lg border-2 py-3 px-2 text-xs font-medium transition-colors
                      ${notifyChannel === ch.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-muted hover:border-primary/40 text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    <span className="text-lg">{ch.icon}</span>
                    {ch.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {notifyChannel === "notification" && "Sends a push notification to the student's device via Firebase."}
                {notifyChannel === "sms"          && "Sends an SMS to the student's registered phone number."}
                {notifyChannel === "both"         && "Sends both a push notification and an SMS simultaneously."}
              </p>
            </div>

            {/* ── Title ── */}
            <div className="space-y-1">
              <Label htmlFor="notify-title">
                {notifyChannel === "sms" ? "SMS Sender Label" : "Notification Title"} *
              </Label>
              <Input
                id="notify-title"
                placeholder={notifyChannel === "sms" ? "e.g. Learnova" : "Enter title..."}
                value={notifyTitle}
                onChange={(e) => setNotifyTitle(e.target.value)}
              />
            </div>

            {/* ── Body ── */}
            <div className="space-y-1">
              <Label htmlFor="notify-body">Message *</Label>
              <Textarea
                id="notify-body"
                placeholder="Enter your message..."
                value={notifyBody}
                onChange={(e) => setNotifyBody(e.target.value)}
                rows={3}
              />
              {notifyChannel !== "notification" && (
                <p className="text-xs text-muted-foreground">
                  SMS: {notifyBody.length}/160 characters
                  {notifyBody.length > 160 && " — will be split into multiple messages"}
                </p>
              )}
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
              {notifyLoading ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Sending…</>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-1" />
                  Send {notifyChannel === "both" ? "Both" : notifyChannel === "sms" ? "SMS" : "Notification"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit User Modal ── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Student Details</DialogTitle>
            <DialogDescription>
              Modify registration details for <strong>{selectedUser?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="edit-name">Full Name *</Label>
              <Input
                id="edit-name"
                placeholder="Enter full name..."
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="edit-phone">Phone Number *</Label>
                <Input
                  id="edit-phone"
                  placeholder="Enter phone..."
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-email">Email Address</Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="Enter email..."
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Gender</Label>
                <Select value={editGender} onValueChange={setEditGender}>
                  <SelectTrigger>
                    <SelectValue placeholder="Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Stream</Label>
                <Select value={editStreamId} onValueChange={setEditStreamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Stream" />
                  </SelectTrigger>
                  <SelectContent>
                    {streams.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={editLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveUserEdit}
              disabled={editLoading || !editName.trim() || !editPhone.trim()}
            >
              {editLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Modal ── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-1.5">
              <Trash2 className="h-5 w-5" /> Delete Student Account
            </DialogTitle>
            <DialogDescription>
              Are you absolutely sure you want to permanently delete the account for{" "}
              <strong>{selectedUser?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground space-y-2">
            <p>
              This action is{" "}
              <strong className="text-destructive font-semibold">irreversible</strong> and will
              permanently remove:
            </p>
            <ul className="list-disc pl-5 space-y-1 font-medium">
              <li>Student profile and academic registration info</li>
              <li>Exam scores, course sessions, and subject progress</li>
              <li>All historical attempt and answering records</li>
            </ul>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleteLoading}>
              {deleteLoading ? "Deleting..." : "Permanently Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Grant Premium Modal ── */}
      <Dialog
        open={grantPremiumDialogOpen}
        onOpenChange={(v) => {
          if (!v) {
            setGrantPremiumDialogOpen(false);
            setGrantConfirmText("");
            setGrantPlan("Monthly");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-warning" />
              Grant Premium Access
            </DialogTitle>
            <DialogDescription>
              Grant premium subscription to <strong>{selectedUser?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Plan</Label>
              <Select value={grantPlan} onValueChange={setGrantPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monthly">Monthly (30 days)</SelectItem>
                  <SelectItem value="Quarterly">Quarterly (90 days)</SelectItem>
                  <SelectItem value="Annual">Annual (365 days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Auto-calculated date preview */}
            <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Subscription Period</p>
              <p>Start: <span className="font-medium text-foreground">{getGrantDates(grantPlan).startDate}</span></p>
              <p>End: <span className="font-medium text-foreground">{getGrantDates(grantPlan).endDate}</span></p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="grant-confirm">
                Type <strong>GRANT</strong> to confirm
              </Label>
              <Input
                id="grant-confirm"
                placeholder="GRANT"
                value={grantConfirmText}
                onChange={(e) => setGrantConfirmText(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantPremiumDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                grantConfirmText !== "GRANT" ||
                actionLoading === "premium"
              }
              onClick={() => {
                if (selectedUser) {
                  const { startDate, endDate } = getGrantDates(grantPlan);
                  grantPremiumMutation.mutate({
                    id: selectedUser.id,
                    startDate,
                    endDate,
                    plan: grantPlan,
                  });
                }
              }}
            >
              {actionLoading === "premium" ? "Granting..." : "Grant Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;
