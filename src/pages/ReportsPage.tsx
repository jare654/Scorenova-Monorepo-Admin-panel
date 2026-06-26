import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
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
  const perPage = 20;

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["reports", statusFilter, typeFilter, page],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ page: String(page), limit: String(perPage) });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter   !== "all") params.set("type", typeFilter);
      return apiClient.get<any>(`/reports?${params}`, signal);
    },
  });

  const reports: Report[] = data?.data ?? [];
  const total: number     = data?.total ?? 0;
  const totalPages: number = data?.totalPages ?? 1;

  // ── Search filter (client-side on current page) ────────────────────────────
  const filtered = search
    ? reports.filter(
        (r) =>
          r.studentName.toLowerCase().includes(search.toLowerCase()) ||
          r.studentPhone.includes(search) ||
          r.description.toLowerCase().includes(search.toLowerCase()),
      )
    : reports;

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
                  <p className="text-xs font-medium text-muted-foreground">Screenshot</p>
                  <a
                    href={selected.screenshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={selected.screenshotUrl}
                      alt="screenshot"
                      className="rounded-md border max-h-48 object-contain w-full bg-muted"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </a>
                </div>
              )}

              {/* Status update */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Update Status</p>
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
    </div>
  );
};

export default ReportsPage;
