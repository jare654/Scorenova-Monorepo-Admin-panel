import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Crown,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/services/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportStatus = "open" | "in_progress" | "resolved" | "closed";
type ReportType =
  | "sign_up_problems"
  | "upload_scan_failed"
  | "app_crashes"
  | "wrong_answer"
  | "subscription_issue"
  | "other"
  | "bug"
  | "question_issue"
  | "content";

type Report = {
  id: string;
  type: ReportType;
  description: string;
  screenshotUrl: string | null;
  questionId: string | null;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  studentName: string;
  studentPhone: string;
  accountId: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  sign_up_problems:  "Sign Up Problems",
  upload_scan_failed: "Upload/Scan Failed",
  app_crashes:       "App Crashes",
  wrong_answer:      "Wrong Answer",
  subscription_issue: "Subscription Issue",
  other:             "Other",
  bug:               "Bug",
  question_issue:    "Question Issue",
  content:           "Content",
};

const STATUS_COLORS: Record<ReportStatus, string> = {
  open:        "bg-destructive/10 text-destructive border-destructive/20",
  in_progress: "bg-warning/10 text-warning border-warning/20",
  resolved:    "bg-success/10 text-success border-success/20",
  closed:      "bg-muted text-muted-foreground",
};

const STATUS_ICONS: Record<ReportStatus, React.ReactNode> = {
  open:        <AlertTriangle className="h-3 w-3" />,
  in_progress: <Clock className="h-3 w-3" />,
  resolved:    <CheckCircle2 className="h-3 w-3" />,
  closed:      <XCircle className="h-3 w-3" />,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const ReportsPage = () => {
  const { toast }        = useToast();
  const queryClient      = useQueryClient();

  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState<string>("all");
  const [typeFilter, setType]       = useState<string>("all");
  const [page, setPage]             = useState(1);
  const [selected, setSelected]     = useState<Report | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const perPage = 20;

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["reports", statusFilter, typeFilter, search, page],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ page: String(page), limit: String(perPage) });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter   !== "all") params.set("type", typeFilter);
      if (search.trim()) params.set("search", search.trim());
      return apiClient.get<any>(`/reports?${params}`, signal);
    },
  });

  const reports: Report[] = data?.data ?? [];
  const total: number     = data?.total ?? 0;
  const totalPages: number = data?.totalPages ?? 1;

  // Server-side filtered data across entire dataset
  const filtered = reports;

  // ── Status mutation ────────────────────────────────────────────────────────

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReportStatus }) =>
      apiClient.patch(`/reports/${id}/status`, { status }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      if (selected?.id === vars.id) {
        setSelected((prev) => prev ? { ...prev, status: vars.status } : prev);
      }
      toast({ title: "Updated", description: `Status changed to ${vars.status}.` });
    },
    onError: () =>
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" }),
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Issue Reports</h2>
          <p className="text-sm text-muted-foreground">
            {total} total report{total !== 1 ? "s" : ""} from students
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone or description..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => { setType(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="sign_up_problems">Sign Up Problems</SelectItem>
            <SelectItem value="upload_scan_failed">Upload/Scan Failed</SelectItem>
            <SelectItem value="app_crashes">App Crashes</SelectItem>
            <SelectItem value="wrong_answer">Wrong Answer</SelectItem>
            <SelectItem value="subscription_issue">Subscription Issue</SelectItem>
            <SelectItem value="bug">Bug</SelectItem>
            <SelectItem value="question_issue">Question Issue</SelectItem>
            <SelectItem value="content">Content</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {["Student", "Type", "Description", "Status", "Date", "Actions"].map((h) => (
                <th key={h} className="p-3 text-left font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No reports found.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <p className="font-medium">{r.studentName}</p>
                    <p className="text-xs text-muted-foreground">{r.studentPhone}</p>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs">
                      {TYPE_LABELS[r.type] ?? r.type}
                    </Badge>
                  </td>
                  <td className="p-3 max-w-[280px]">
                    <p className="truncate text-muted-foreground text-xs">{r.description}</p>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className={`gap-1 text-xs ${STATUS_COLORS[r.status]}`}>
                      {STATUS_ICONS[r.status]}
                      {r.status.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs"
                      onClick={() => setSelected(r)}
                    >
                      <Eye className="h-3.5 w-3.5" /> View
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
          Page {page} of {totalPages} · {total} total
        </p>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Issue Report</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {/* Student */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Student</p>
                  <p className="font-medium">{selected.studentName}</p>
                  <p className="text-xs text-muted-foreground">{selected.studentPhone}</p>
                </div>
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Type</p>
                  <Badge variant="outline" className="text-xs mt-0.5">
                    {TYPE_LABELS[selected.type] ?? selected.type}
                  </Badge>
                </div>
              </div>

              {/* Description */}
              <div className="rounded-md border bg-muted/30 p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Description</p>
                <p className="text-sm">{selected.description}</p>
              </div>

              {/* Screenshot */}
              {selected.screenshotUrl && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Attached Screenshot</p>
                    <button
                      type="button"
                      onClick={() => setPreviewImage(selected.screenshotUrl!)}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      View Full Size
                    </button>
                  </div>
                  <div
                    onClick={() => setPreviewImage(selected.screenshotUrl!)}
                    className="cursor-pointer group relative rounded-md overflow-hidden border bg-muted/30"
                  >
                    <img
                      src={selected.screenshotUrl}
                      alt="screenshot"
                      className="rounded-md max-h-56 object-contain w-full transition-transform group-hover:scale-[1.02]"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                      Click to zoom
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Receipt / Subscription Issue Callout & Quick Approval */}
              {selected.type === "subscription_issue" && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-medium text-sm text-amber-600 dark:text-amber-400">
                      <Crown className="h-4 w-4 text-amber-500" />
                      <span>Payment Verification & Approval</span>
                    </div>
                    <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px]">
                      Auto-Notification
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    When you approve or mark this report as <strong>Resolved</strong>, Scorenova automatically sends a push notification and in-app message to the student notifying them their payment was verified!
                  </p>
                  {selected.studentPhone && selected.studentPhone !== "—" && selected.status !== "resolved" && (
                    <Button
                      size="sm"
                      className="w-full text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                      disabled={statusMutation.isPending}
                      onClick={async () => {
                        try {
                          await apiClient.post("/accounts/direct-grant-premium", {
                            phoneNumber: selected.studentPhone,
                            durationDays: 30,
                            plan: "Monthly",
                          });
                          statusMutation.mutate({ id: selected.id, status: "resolved" });
                          toast({
                            title: "Payment Approved & Granted 🎉",
                            description: `Premium granted and notification dispatched to ${selected.studentName || selected.studentPhone}.`,
                          });
                        } catch (e: any) {
                          toast({
                            title: "Error",
                            description: e?.message || "Failed to grant premium.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approve Payment & Grant 1 Month Access
                    </Button>
                  )}
                </div>
              )}

              {/* Status update */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Update Status</p>
                  {selected.type === "subscription_issue" && (
                    <span className="text-[11px] text-muted-foreground">
                      Resolving sends notification to student
                    </span>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(["open", "in_progress", "resolved", "closed"] as ReportStatus[]).map((s) => (
                    <Button
                      key={s}
                      variant={selected.status === s ? "default" : "outline"}
                      size="sm"
                      className="text-xs"
                      disabled={statusMutation.isPending}
                      onClick={() => statusMutation.mutate({ id: selected.id, status: s })}
                    >
                      {STATUS_ICONS[s]}
                      <span className="ml-1 capitalize">{s.replace("_", " ")}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Reported {new Date(selected.createdAt).toLocaleString()}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Screenshot Lightbox Modal */}
      <Dialog open={!!previewImage} onOpenChange={(v) => !v && setPreviewImage(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] p-2 flex flex-col items-center justify-center">
          <DialogHeader className="sr-only">
            <DialogTitle>Screenshot Preview</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="relative w-full h-full flex items-center justify-center p-2">
              <img
                src={previewImage}
                alt="Report Screenshot"
                className="max-h-[80vh] w-auto max-w-full rounded-md object-contain shadow-md"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportsPage;
