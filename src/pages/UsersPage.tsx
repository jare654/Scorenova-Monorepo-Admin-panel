import { useState, useMemo } from "react";
import {
  Search,
  Eye,
  X,
  Crown,
  Key,
  Mail,
  Ban,
  Loader2,
  Edit,
  Trash2,
  MoreHorizontal,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Calendar,
  Phone,
  BookOpen,
  TrendingUp,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  Users as UsersIcon,
  Atom,
  Scale,
} from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  streamId?: string;
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
  const [sheetOpen, setSheetOpen]       = useState(false);
  const [page, setPage]                 = useState(1);
  const perPage = 10;

  // Action state
  const [actionLoading, setActionLoading]       = useState<string | null>(null);
  const [newPassword, setNewPassword]           = useState<string | null>(null);
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [notifyChannel, setNotifyChannel]       = useState<"notification" | "sms" | "both">("notification");
  const [notifyTitle, setNotifyTitle]           = useState("");
  const [notifyBody, setNotifyBody]             = useState("");
  const [notifyLoading, setNotifyLoading]       = useState(false);

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

  // Grant Premium state
  const [grantPremiumDialogOpen, setGrantPremiumDialogOpen] = useState(false);
  const [grantConfirmText, setGrantConfirmText]             = useState("");
  const [grantPlan, setGrantPlan]                           = useState("Monthly");

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
      const json = await apiClient.get<any>("/accounts/get-accounts?orderBy=created_at&direction=DESC", signal);
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
    enabled: !!selectedUser && !!token && sheetOpen,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const togglePremiumMutation = useMutation({
    mutationFn: (userId: string) => apiClient.post(`/accounts/${userId}/premium`),
    onMutate:   () => setActionLoading("premium"),
    onSuccess:  (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      if (selectedUser?.id === userId) {
        const newIsPremium = !selectedUser.isPremium;
        setSelectedUser({ ...selectedUser, isPremium: newIsPremium });
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
      phoneNumber: string; gender: string; streamId: string;
    }) =>
      apiClient.post(`/accounts/${d.id}/update`, {
        name: d.name,
        email: d.email,
        phoneNumber: d.phoneNumber,
        gender: d.gender,
        streamId: d.streamId || null,
        gradeId: d.streamId || null,
        isActive: selectedUser?.isActive ?? true,
        isPremium: selectedUser?.isPremium || selectedUser?.status === "premium",
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
          streamId: editStreamId || undefined,
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
      setSheetOpen(false);
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
    setSelectedUser(u);
    setEditName(u.name);
    setEditEmail(u.email || "");
    setEditPhone(u.phoneNumber);
    setEditGender(u.gender || "male");
    setEditStreamId(u.streamId || u.gradeId || "");
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
        streamId: editStreamId,
      });
    }
  };

  const handleOpenDetails = (u: AccountUser) => {
    setSelectedUser(u);
    setSheetOpen(true);
  };

  // ── Derived & Filtering ───────────────────────────────────────────────────────

  // STREAM FILTERING BUG FIX: match u.streamId OR u.gradeId against the selected streamId
  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (
        search &&
        !u.name.toLowerCase().includes(search.toLowerCase()) &&
        !(u.email ?? "").toLowerCase().includes(search.toLowerCase()) &&
        !u.phoneNumber.includes(search)
      ) {
        return false;
      }

      if (statusFilter === "premium" && !u.isPremium && u.status !== "premium") return false;
      if (statusFilter === "free" && (u.isPremium || u.status === "premium")) return false;
      if (statusFilter === "trial" && u.status !== "trial") return false;

      // Stream matching: compare either streamId or gradeId against selected streamFilter UUID
      if (streamFilter !== "all" && u.streamId !== streamFilter && u.gradeId !== streamFilter) {
        return false;
      }

      if (activityFilter === "active" && !u.isActive) return false;
      if (activityFilter === "suspended" && u.isActive) return false;

      return true;
    });
  }, [users, search, statusFilter, streamFilter, activityFilter]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated  = filtered.slice((page - 1) * perPage, page * perPage);

  const getStreamName = (userOrStreamId?: AccountUser | string) => {
    if (!userOrStreamId) return "—";
    const sId = typeof userOrStreamId === "string"
      ? userOrStreamId
      : (userOrStreamId.streamId || userOrStreamId.gradeId);
    if (!sId) return "—";
    return streams.find((s) => s.id === sId)?.name ?? "—";
  };

  const initials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  // Metrics summary counts
  const naturalScienceCount = useMemo(() => {
    return users.filter((u) => {
      const sId = u.streamId || u.gradeId;
      const sName = streams.find((s) => s.id === sId)?.name?.toLowerCase() ?? "";
      return sName.includes("natural");
    }).length;
  }, [users, streams]);

  const socialScienceCount = useMemo(() => {
    return users.filter((u) => {
      const sId = u.streamId || u.gradeId;
      const sName = streams.find((s) => s.id === sId)?.name?.toLowerCase() ?? "";
      return sName.includes("social");
    }).length;
  }, [users, streams]);

  const premiumCount = useMemo(() => {
    return users.filter((u) => u.isPremium || u.status === "premium").length;
  }, [users]);

  return (
    <div className="space-y-6">

      {/* ── 1. Top Metrics Summary Ribbon ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Students</span>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <UsersIcon className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{loading ? "—" : users.length}</p>
          <span className="text-[11px] text-muted-foreground">Registered on platform</span>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Natural Science</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <Atom className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{loading ? "—" : naturalScienceCount}</p>
          <span className="text-[11px] text-muted-foreground">STEM Curriculum</span>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Social Science</span>
            <div className="rounded-lg bg-violet-500/10 p-2 text-violet-600 dark:text-violet-400">
              <Scale className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{loading ? "—" : socialScienceCount}</p>
          <span className="text-[11px] text-muted-foreground">Humanities & Business</span>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Premium Paid</span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500">
              <Crown className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{loading ? "—" : premiumCount}</p>
          <span className="text-[11px] text-muted-foreground">Active subscriptions</span>
        </div>
      </div>

      {/* ── 2. Filters & Actions Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-3 sm:p-4 shadow-xs">
        <div className="flex flex-1 flex-wrap items-center gap-2.5 min-w-[240px]">
          {/* Search input */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name, phone or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 pr-8 h-9 text-xs"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Stream Filter */}
          <Select value={streamFilter} onValueChange={(v) => { setStreamFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40 h-9 text-xs font-medium">
              <SelectValue placeholder="All Streams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Streams</SelectItem>
              {streams.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Subscription Status Filter */}
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-32 h-9 text-xs font-medium">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Access</SelectItem>
              <SelectItem value="free">Free Only</SelectItem>
              <SelectItem value="premium">Premium Only</SelectItem>
            </SelectContent>
          </Select>

          {/* Activity Status Filter */}
          <Select value={activityFilter} onValueChange={(v) => { setActivityFilter(v); setPage(1); }}>
            <SelectTrigger className="w-32 h-9 text-xs font-medium">
              <SelectValue placeholder="Activity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
            Showing <strong className="text-foreground">{filtered.length}</strong> students
          </span>
        </div>
      </div>

      {/* ── 3. Production Data Table ── */}
      <div className="rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Stream</th>
                <th className="py-3 px-4">Subscription</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Enrolled</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    <p className="text-xs text-muted-foreground mt-2">Loading students directory...</p>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <GraduationCap className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                      <p className="text-sm font-semibold text-foreground">No students found</p>
                      <p className="text-xs text-muted-foreground">
                        {streamFilter !== "all"
                          ? `No students found matching the selected stream.`
                          : "Try adjusting your search terms or filters."}
                      </p>
                      {(search || streamFilter !== "all" || statusFilter !== "all" || activityFilter !== "all") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearch("");
                            setStreamFilter("all");
                            setStatusFilter("all");
                            setActivityFilter("all");
                          }}
                          className="mt-2 text-xs"
                        >
                          Clear all filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((u) => {
                  const sName = getStreamName(u);
                  const isNatural = sName.toLowerCase().includes("natural");
                  const isSocial = sName.toLowerCase().includes("social");

                  return (
                    <tr
                      key={u.id}
                      onClick={() => handleOpenDetails(u)}
                      className="group hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      {/* Student info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/15 to-primary/30 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            {initials(u.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground text-xs group-hover:text-primary transition-colors truncate">
                              {u.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate font-mono">
                              {u.phoneNumber} {u.email ? `• ${u.email}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Stream */}
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                            isNatural
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : isSocial
                                ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
                          )}
                        >
                          {isNatural ? (
                            <Atom className="h-3 w-3" />
                          ) : isSocial ? (
                            <Scale className="h-3 w-3" />
                          ) : (
                            <GraduationCap className="h-3 w-3" />
                          )}
                          {sName}
                        </span>
                      </td>

                      {/* Payment Status */}
                      <td className="py-3.5 px-4">
                        {u.isPremium || u.status === "premium" ? (
                          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                            <Crown className="h-3 w-3 text-amber-500" />
                            PREMIUM
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground border border-border/50">
                            FREE
                          </span>
                        )}
                      </td>

                      {/* Student Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
                            u.isActive
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400",
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              u.isActive ? "bg-emerald-500 animate-pulse" : "bg-rose-500",
                            )}
                          />
                          {u.isActive ? "Active" : "Suspended"}
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenDetails(u)}
                            title="Inspect Student"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs">
                              <DropdownMenuLabel>Student Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleOpenDetails(u)}>
                                <Eye className="h-3.5 w-3.5 mr-2 text-muted-foreground" /> View Profile & Stats
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenEditDialog(u)}>
                                <Edit className="h-3.5 w-3.5 mr-2 text-muted-foreground" /> Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(u);
                                  if (u.isPremium) {
                                    togglePremiumMutation.mutate(u.id);
                                  } else {
                                    setGrantPremiumDialogOpen(true);
                                  }
                                }}
                              >
                                <Crown className="h-3.5 w-3.5 mr-2 text-amber-500" />
                                {u.isPremium ? "Revoke Premium" : "Grant Premium"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(u);
                                  resetPasswordMutation.mutate(u.id);
                                }}
                              >
                                <Key className="h-3.5 w-3.5 mr-2 text-muted-foreground" /> Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(u);
                                  setNotifyDialogOpen(true);
                                }}
                              >
                                <Mail className="h-3.5 w-3.5 mr-2 text-muted-foreground" /> Send Push / SMS
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(u);
                                  toggleSuspendMutation.mutate(u.id);
                                }}
                              >
                                <Ban className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                                {u.isActive ? "Suspend Student" : "Activate Student"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  setSelectedUser(u);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Account
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-border/60 px-4 py-3 bg-card">
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length === 0 ? 0 : (page - 1) * perPage + 1}–
            {Math.min(page * perPage, filtered.length)} of {filtered.length} students
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              Page {totalPages === 0 ? 0 : page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={page === totalPages || totalPages === 0}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* ── 4. Slide-Over Student Detail Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 overflow-y-auto">
          {selectedUser && (
            <div className="flex flex-col h-full">
              {/* Sheet Header */}
              <div className="p-6 border-b border-border/70 bg-muted/20">
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/40 border border-primary/30 text-primary flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                    {initials(selectedUser.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-foreground truncate leading-tight">
                      {selectedUser.name}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      {selectedUser.phoneNumber}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs font-semibold">
                        {getStreamName(selectedUser)}
                      </Badge>
                      {selectedUser.isPremium ? (
                        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          <Crown className="h-3 w-3" /> PREMIUM
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
                          FREE
                        </span>
                      )}
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                          selectedUser.isActive ? "text-emerald-600" : "text-rose-600",
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", selectedUser.isActive ? "bg-emerald-500" : "bg-rose-500")} />
                        {selectedUser.isActive ? "Active" : "Suspended"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fast Action Buttons Bar */}
                <div className="grid grid-cols-3 gap-2 mt-5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => handleOpenEditDialog(selectedUser)}
                  >
                    <Edit className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => setNotifyDialogOpen(true)}
                  >
                    <Mail className="h-3.5 w-3.5" /> Message
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => {
                      if (selectedUser.isPremium) {
                        togglePremiumMutation.mutate(selectedUser.id);
                      } else {
                        setGrantPremiumDialogOpen(true);
                      }
                    }}
                  >
                    <Crown className="h-3.5 w-3.5 text-amber-500" />
                    {selectedUser.isPremium ? "Revoke" : "Premium"}
                  </Button>
                </div>
              </div>

              {/* Sheet Body Tabs */}
              <div className="flex-1 p-6 space-y-6">
                <Tabs defaultValue="progress" className="w-full">
                  <TabsList className="grid grid-cols-2 w-full mb-4">
                    <TabsTrigger value="progress" className="text-xs">
                      Exam Progress
                    </TabsTrigger>
                    <TabsTrigger value="profile" className="text-xs">
                      Account Details
                    </TabsTrigger>
                  </TabsList>

                  {/* ── Tab 1: Exam Progress & Analytics ── */}
                  <TabsContent value="progress" className="space-y-4">
                    {progressLoading ? (
                      <div className="py-12 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                        <p className="text-xs text-muted-foreground mt-2">Loading academic history...</p>
                      </div>
                    ) : userProgress ? (
                      <>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="rounded-xl border border-border/70 bg-card p-3 text-center shadow-xs">
                            <p className="text-xl font-bold text-foreground">{userProgress.totalQuestionsAttempted}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Attempted</p>
                          </div>
                          <div className="rounded-xl border border-border/70 bg-card p-3 text-center shadow-xs">
                            <p className="text-xl font-bold text-emerald-600">{userProgress.correctAnswers}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Correct</p>
                          </div>
                          <div className="rounded-xl border border-border/70 bg-card p-3 text-center shadow-xs">
                            <p className="text-xl font-bold text-primary">{userProgress.overallAccuracy.toFixed(1)}%</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Accuracy</p>
                          </div>
                          <div className="rounded-xl border border-border/70 bg-card p-3 text-center shadow-xs">
                            <p className="text-xl font-bold text-amber-500">{userProgress.currentStreak}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Daily Streak</p>
                          </div>
                        </div>

                        {/* Subject breakdown */}
                        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs space-y-3">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                            Subject Accuracy
                          </h4>
                          {userProgress.progressBySubject.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-2 text-center">
                              No subject quiz data recorded yet.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {userProgress.progressBySubject.map((s) => (
                                <div key={s.subjectId} className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground font-medium">{s.subjectName}</span>
                                    <span className="font-semibold text-foreground">{s.accuracy.toFixed(1)}%</span>
                                  </div>
                                  <Progress value={s.accuracy} className="h-1.5" />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground space-y-1">
                        <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="text-xs font-semibold text-foreground">No practice data yet</p>
                        <p className="text-[11px]">This student has not completed any exams or practice sets.</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* ── Tab 2: Profile & Account Details ── */}
                  <TabsContent value="profile" className="space-y-4">
                    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs space-y-3 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-border/50">
                        <span className="text-muted-foreground">Full Name</span>
                        <span className="font-semibold text-foreground">{selectedUser.name}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-border/50">
                        <span className="text-muted-foreground">Phone Number</span>
                        <span className="font-mono text-foreground">{selectedUser.phoneNumber}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-border/50">
                        <span className="text-muted-foreground">Email Address</span>
                        <span className="text-foreground">{selectedUser.email || "Not specified"}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-border/50">
                        <span className="text-muted-foreground">Gender</span>
                        <span className="capitalize text-foreground">{selectedUser.gender || "male"}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-border/50">
                        <span className="text-muted-foreground">Curriculum Stream</span>
                        <span className="font-medium text-foreground">{getStreamName(selectedUser)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-border/50">
                        <span className="text-muted-foreground">Registered Date</span>
                        <span className="text-foreground">
                          {new Date(selectedUser.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-muted-foreground">Account Role</span>
                        <span className="text-foreground">Student</span>
                      </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-3">
                      <h4 className="text-xs font-semibold text-destructive">Account Management</h4>
                      <p className="text-[11px] text-muted-foreground">
                        Administrative actions for password resetting, suspension, or deletion.
                      </p>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs justify-start gap-2"
                          onClick={handleResetPassword}
                          disabled={actionLoading === "password"}
                        >
                          <Key className="h-3.5 w-3.5" />
                          {actionLoading === "password" ? "Generating..." : "Generate New Temporary Password"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs justify-start gap-2"
                          onClick={handleToggleSuspend}
                          disabled={actionLoading === "suspend"}
                        >
                          <Ban className="h-3.5 w-3.5" />
                          {selectedUser.isActive ? "Suspend Student Access" : "Reinstate Student Access"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full text-xs justify-start gap-2"
                          onClick={() => setDeleteDialogOpen(true)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Permanently Delete Account
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── 5. Modals (Edit, Grant Premium, Message, Reset Password, Delete) ── */}

      {/* Edit Student Modal */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Student Details</DialogTitle>
            <DialogDescription>
              Modify profile and stream registration for <strong>{selectedUser?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
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
                <Label>Curriculum Stream *</Label>
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

      {/* Grant Premium Modal */}
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
              <Crown className="h-4 w-4 text-amber-500" />
              Grant Premium Access
            </DialogTitle>
            <DialogDescription>
              Provide premium exam subscription to <strong>{selectedUser?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <Label>Subscription Plan</Label>
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
            <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Access Dates</p>
              <p>Start: <span className="font-medium text-foreground">{getGrantDates(grantPlan).startDate}</span></p>
              <p>End: <span className="font-medium text-foreground">{getGrantDates(grantPlan).endDate}</span></p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="grant-confirm">
                Type <strong className="text-foreground">GRANT</strong> to confirm
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
              disabled={grantConfirmText !== "GRANT" || actionLoading === "premium"}
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

      {/* Send Message Modal */}
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
              Send Alert to {selectedUser?.name}
            </DialogTitle>
            <DialogDescription>
              Dispatch notification to this student's mobile device or SMS.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1 text-xs">
            <div className="space-y-2">
              <Label>Channel *</Label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { value: "notification", label: "Push Notification", icon: "🔔" },
                    { value: "sms",          label: "SMS Text",          icon: "💬" },
                    { value: "both",         label: "Both Channels",     icon: "📣" },
                  ] as const
                ).map((ch) => (
                  <button
                    key={ch.value}
                    type="button"
                    onClick={() => setNotifyChannel(ch.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border-2 py-2.5 px-2 text-xs font-semibold transition-all",
                      notifyChannel === ch.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 hover:border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span className="text-base">{ch.icon}</span>
                    <span className="text-[11px]">{ch.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="notify-title">Title / Label *</Label>
              <Input
                id="notify-title"
                placeholder={notifyChannel === "sms" ? "e.g. Scorenova" : "Enter alert title..."}
                value={notifyTitle}
                onChange={(e) => setNotifyTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="notify-body">Message Body *</Label>
              <Textarea
                id="notify-body"
                placeholder="Compose message..."
                value={notifyBody}
                onChange={(e) => setNotifyBody(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyDialogOpen(false)} disabled={notifyLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSendNotification}
              disabled={notifyLoading || !notifyTitle.trim() || !notifyBody.trim()}
            >
              {notifyLoading ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Sending…</>
              ) : (
                <>Send Message</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={!!newPassword} onOpenChange={(v) => !v && setNewPassword(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Password Reset Successful</DialogTitle>
            <DialogDescription>
              A new temporary password has been generated for{" "}
              <strong>{selectedUser?.name}</strong>. Share it with the student.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-xl border font-mono text-center justify-center text-lg font-bold select-all tracking-widest text-primary">
            {newPassword}
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={() => setNewPassword(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-1.5">
              <Trash2 className="h-5 w-5" /> Delete Student Account
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong>{selectedUser?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-xs text-muted-foreground space-y-2">
            <p>This action is irreversible and will permanently purge this student's exam history, attempts, and profile records.</p>
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

    </div>
  );
};

export default UsersPage;
