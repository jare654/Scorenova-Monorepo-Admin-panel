import { useState, useMemo } from "react";
import {
  Bell,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  Smartphone,
  Users,
  AlertTriangle,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/services/api/client";
import { useQuery } from "@tanstack/react-query";
import { fetchStreams, type Stream } from "@/services/api/questions";

// ─── Types ────────────────────────────────────────────────────────────────────

type User = {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  fcmId?: string | null;
  isPremium?: boolean;
  type: string;
  streamId?: string | null;
};

type SendResult = {
  userId: string;
  name: string;
  status: "success" | "error" | "no_token";
  message: string;
};

// ─── Shared stats bar ─────────────────────────────────────────────────────────

const StatsBar = ({ allUsers }: { allUsers: User[] }) => {
  const withToken    = allUsers.filter((u) => !!u.fcmId).length;
  const withoutToken = allUsers.length - withToken;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="rounded-lg border bg-card p-4 space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <Users className="h-3.5 w-3.5" /> Total users
        </div>
        <p className="text-2xl font-bold">{allUsers.length}</p>
      </div>
      <div className="rounded-lg border bg-card p-4 space-y-1">
        <div className="flex items-center gap-2 text-xs text-success">
          <Smartphone className="h-3.5 w-3.5" /> Have FCM token
        </div>
        <p className="text-2xl font-bold text-success">{withToken}</p>
        <p className="text-xs text-muted-foreground">can receive push notifications</p>
      </div>
      <div className="rounded-lg border bg-card p-4 space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5" /> No token
        </div>
        <p className="text-2xl font-bold">{withoutToken}</p>
        <p className="text-xs text-muted-foreground">haven't logged in on device</p>
      </div>
    </div>
  );
};

// ─── Results list ─────────────────────────────────────────────────────────────

const ResultsList = ({ results }: { results: SendResult[] }) => {
  if (results.length === 0) return null;
  return (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <h3 className="font-semibold text-sm">Results</h3>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {results.map((r) => (
          <div
            key={r.userId}
            className="flex items-start gap-2 text-sm rounded-md p-2 bg-muted/40"
          >
            {r.status === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
            ) : r.status === "error" ? (
              <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{r.name}</p>
              <p className="text-xs text-muted-foreground">{r.message}</p>
            </div>
            <Badge
              variant="outline"
              className={
                r.status === "success"
                  ? "bg-success/10 text-success border-success/20 text-[10px]"
                  : r.status === "error"
                    ? "bg-destructive/10 text-destructive border-destructive/20 text-[10px]"
                    : "bg-warning/10 text-warning border-warning/20 text-[10px]"
              }
            >
              {r.status === "success" ? "Sent" : r.status === "error" ? "Failed" : "No token"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Individual tab ───────────────────────────────────────────────────────────

const IndividualTab = ({ allUsers, isLoading }: { allUsers: User[]; isLoading: boolean }) => {
  const { toast } = useToast();

  const [title, setTitle]             = useState("Test Notification");
  const [body, setBody]               = useState("This is a test push notification from the admin panel.");
  const [search, setSearch]           = useState("");
  const [streamFilter, setStreamFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending]         = useState(false);
  const [results, setResults]         = useState<SendResult[]>([]);

  const { data: streams = [] } = useQuery<Stream[]>({
    queryKey: ["streams"],
    queryFn: () => fetchStreams(),
  });

  const streamNameById = useMemo(
    () => new Map(streams.map((s) => [s.id, s.name])),
    [streams],
  );

  const withToken = allUsers.filter((u) => !!u.fcmId);

  const filtered = allUsers.filter((u) => {
    if (streamFilter !== "all" && u.streamId !== streamFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.phoneNumber.includes(q) ||
      (u.email ?? "").toLowerCase().includes(q)
    );
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast({ title: "Validation", description: "Title and body are required.", variant: "destructive" });
      return;
    }
    if (selectedIds.size === 0) {
      toast({ title: "Validation", description: "Select at least one recipient.", variant: "destructive" });
      return;
    }

    setSending(true);
    setResults([]);

    const targets = allUsers.filter((u) => selectedIds.has(u.id));
    const newResults: SendResult[] = [];

    for (const user of targets) {
      if (!user.fcmId) {
        newResults.push({ userId: user.id, name: user.name, status: "no_token", message: "No FCM token" });
        continue;
      }
      try {
        await apiClient.post(`/accounts/${user.id}/notify`, { title: title.trim(), body: body.trim() });
        newResults.push({ userId: user.id, name: user.name, status: "success", message: "Push notification sent" });
      } catch (err: any) {
        newResults.push({ userId: user.id, name: user.name, status: "error", message: err?.message ?? "Request failed" });
      }
    }

    setResults(newResults);
    setSending(false);

    const s = newResults.filter((r) => r.status === "success").length;
    const f = newResults.filter((r) => r.status === "error").length;
    const n = newResults.filter((r) => r.status === "no_token").length;
    toast({ title: "Done", description: `${s} sent · ${n} no token · ${f} failed` });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Compose */}
      <div className="space-y-5">
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h3 className="font-semibold text-sm">Compose Notification</h3>
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" />
          </div>
          <div className="space-y-1.5">
            <Label>Message *</Label>
            <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Notification body..." />
          </div>
          {/* Preview */}
          <div className="rounded-lg border bg-muted/40 p-3 space-y-0.5">
            <p className="text-xs text-muted-foreground mb-1">Preview</p>
            <p className="text-sm font-semibold">{title || "—"}</p>
            <p className="text-xs text-muted-foreground">{body || "—"}</p>
          </div>
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-muted-foreground">
              {selectedIds.size} recipient{selectedIds.size !== 1 ? "s" : ""} selected
            </p>
            <Button
              onClick={handleSend}
              disabled={sending || selectedIds.size === 0 || !title.trim() || !body.trim()}
              className="gap-2"
            >
              {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : <><Send className="h-4 w-4" /> Send</>}
            </Button>
          </div>
        </div>
        <ResultsList results={results} />
      </div>

      {/* Recipient picker */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="font-semibold text-sm">Select Recipients</h3>
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => {
                const targetsWithToken = filtered.filter((u) => !!u.fcmId).map((u) => u.id);
                setSelectedIds(new Set(targetsWithToken));
              }}
            >
              Select Filtered ({filtered.filter((u) => !!u.fcmId).length})
            </Button>
            {selectedIds.size > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Select value={streamFilter} onValueChange={setStreamFilter}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="All Streams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Streams</SelectItem>
              {streams.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No users found</p>
          ) : (
            filtered.map((user) => {
              const selected = selectedIds.has(user.id);
              const hasToken = !!user.fcmId;
              const streamName = user.streamId ? streamNameById.get(user.streamId) : null;
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleSelect(user.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors text-sm ${
                    selected
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-muted/50 border border-transparent"
                  }`}
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                    {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                      <span>{user.phoneNumber}</span>
                      {streamName && (
                        <span className="text-[10px] bg-muted px-1.5 py-0.2 rounded font-medium text-foreground/80">
                          {streamName}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {hasToken ? (
                      <span className="flex items-center gap-1 text-[10px] text-success font-medium">
                        <Smartphone className="h-3 w-3" /> token
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">no token</span>
                    )}
                    <Badge variant="outline" className="text-[10px] py-0">{user.type}</Badge>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Broadcast tab ────────────────────────────────────────────────────────────

const BroadcastTab = () => {
  const { toast } = useToast();

  const [title, setTitle]   = useState("");
  const [body, setBody]     = useState("");
  const [target, setTarget] = useState<"all" | "premium" | "free">("all");
  const [sending, setSending] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{
    sent: number; failed: number; noToken: number; total: number;
  } | null>(null);

  const TARGET_LABELS: Record<string, string> = {
    all:     "All Students",
    premium: "Premium Students only",
    free:    "Free (non-premium) Students only",
  };

  const handleBroadcast = async () => {
    if (!title.trim() || !body.trim()) {
      toast({ title: "Validation", description: "Title and body are required.", variant: "destructive" });
      return;
    }

    setSending(true);
    setBroadcastResult(null);
    try {
      const res = await apiClient.post<any>("/notifications/broadcast", {
        title: title.trim(),
        body: body.trim(),
        target,
      });
      setBroadcastResult({ sent: res.sent, failed: res.failed, noToken: res.noToken, total: res.total });
      toast({ title: "Broadcast complete", description: `${res.sent} sent · ${res.failed} failed · ${res.noToken} no token` });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Broadcast failed.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-lg space-y-5">
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-sm">Broadcast to Group</h3>
        <p className="text-xs text-muted-foreground">
          Sends a push notification to every user in the selected group that has an FCM token registered.
        </p>

        <div className="space-y-1.5">
          <Label>Audience</Label>
          <Select value={target} onValueChange={(v) => setTarget(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              <SelectItem value="premium">Premium Students only</SelectItem>
              <SelectItem value="free">Free Students only</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Target: {TARGET_LABELS[target]}</p>
        </div>

        <div className="space-y-1.5">
          <Label>Title *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" />
        </div>

        <div className="space-y-1.5">
          <Label>Message *</Label>
          <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Notification body..." />
        </div>

        {/* Preview */}
        {(title || body) && (
          <div className="rounded-lg border bg-muted/40 p-3 space-y-0.5">
            <p className="text-xs text-muted-foreground mb-1">Preview</p>
            <p className="text-sm font-semibold">{title || "—"}</p>
            <p className="text-xs text-muted-foreground">{body || "—"}</p>
          </div>
        )}

        <Button
          onClick={handleBroadcast}
          disabled={sending || !title.trim() || !body.trim()}
          className="w-full gap-2"
        >
          {sending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Broadcasting...</>
          ) : (
            <><Radio className="h-4 w-4" /> Broadcast Notification</>
          )}
        </Button>
      </div>

      {/* Broadcast result */}
      {broadcastResult && (
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <h3 className="font-semibold text-sm">Broadcast Result</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md bg-success/10 p-3 text-center">
              <p className="text-2xl font-bold text-success">{broadcastResult.sent}</p>
              <p className="text-xs text-muted-foreground">Sent</p>
            </div>
            <div className="rounded-md bg-muted p-3 text-center">
              <p className="text-2xl font-bold">{broadcastResult.total}</p>
              <p className="text-xs text-muted-foreground">Total targeted</p>
            </div>
            <div className="rounded-md bg-warning/10 p-3 text-center">
              <p className="text-2xl font-bold text-warning">{broadcastResult.noToken}</p>
              <p className="text-xs text-muted-foreground">No token</p>
            </div>
            <div className="rounded-md bg-destructive/10 p-3 text-center">
              <p className="text-2xl font-bold text-destructive">{broadcastResult.failed}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const NotificationTestPage = () => {
  const { data: allUsers = [], isLoading } = useQuery<User[]>({
    queryKey: ["notify-test-users"],
    queryFn: async ({ signal }) => {
      const json = await apiClient.get<any>("/accounts/get-accounts", signal);
      return Array.isArray(json.data) ? json.data : [];
    },
  });

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Push Notifications</h2>
          <p className="text-sm text-muted-foreground">
            Send individual or broadcast push notifications via Firebase
          </p>
        </div>
      </div>

      <StatsBar allUsers={allUsers} />

      <Tabs defaultValue="individual">
        <TabsList>
          <TabsTrigger value="individual">
            <Send className="h-3.5 w-3.5 mr-1.5" /> Individual
          </TabsTrigger>
          <TabsTrigger value="broadcast">
            <Radio className="h-3.5 w-3.5 mr-1.5" /> Broadcast
          </TabsTrigger>
        </TabsList>
        <TabsContent value="individual" className="mt-4">
          <IndividualTab allUsers={allUsers} isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="broadcast" className="mt-4">
          <BroadcastTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationTestPage;
