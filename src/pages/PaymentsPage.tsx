import { useState } from "react";
import { Crown, Search, Loader2, TrendingUp, Users, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type PremiumUser = {
  id: string;
  name: string;
  phoneNumber: string;
  premiumPlan: string;
  premiumStartDate: string | null;
  premiumEndDate: string | null;
  isActive: boolean;
  status: "Active" | "Expired";
};

const formatDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
};

// ─── Premium Subscriptions Tab ────────────────────────────────────────────────

const PremiumSubscriptionsTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [revokeTarget, setRevokeTarget] = useState<PremiumUser | null>(null);
  const [extendTarget, setExtendTarget] = useState<PremiumUser | null>(null);
  const [extendDate, setExtendDate]     = useState("");

  const { data: users = [], isLoading } = useQuery<PremiumUser[]>({
    queryKey: ["premium-users"],
    queryFn: async ({ signal }) => {
      const payload = await apiClient.get<any>("/accounts/premium-users", signal);
      // Normalize: API may return array directly or wrapped in { data: [...] }
      if (Array.isArray(payload)) return payload as PremiumUser[];
      if (Array.isArray(payload?.data)) return payload.data as PremiumUser[];
      return [];
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/accounts/${id}/revoke-premium`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["premium-users"] });
      toast({ title: "Success", description: "Premium access revoked." });
      setRevokeTarget(null);
    },
    onError: () =>
      toast({ title: "Error", description: "Failed to revoke premium.", variant: "destructive" }),
  });

  const extendMutation = useMutation({
    mutationFn: ({ id, endDate }: { id: string; endDate: string }) =>
      apiClient.post(`/accounts/${id}/extend-premium`, { endDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["premium-users"] });
      toast({ title: "Success", description: "Premium end date extended." });
      setExtendTarget(null);
      setExtendDate("");
    },
    onError: () =>
      toast({ title: "Error", description: "Failed to extend premium.", variant: "destructive" }),
  });

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.phoneNumber.includes(search);
    // Compute status from actual dates
    const isActive = u.premiumEndDate ? new Date(u.premiumEndDate) > new Date() : true;
    const computedStatus = isActive ? "active" : "expired";
    const matchStatus = statusFilter === "all" || computedStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border bg-card shadow-sm overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {["Student Name", "Phone", "Plan", "Start Date", "End Date", "Status", "Actions"].map(
                (h) => (
                  <th key={h} className="p-3 text-left font-medium text-muted-foreground">{h}</th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  No premium subscribers found.
                </td>
              </tr>
            ) : (
              filtered.map((u) => {
                // Compute status from actual dates — don't trust the backend status field
                const isActive = u.premiumEndDate
                  ? new Date(u.premiumEndDate) > new Date()
                  : true; // no end date = active
                const displayStatus = isActive ? "Active" : "Expired";
                return (
                <tr key={u.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-medium">{u.name}</td>
                  <td className="p-3 text-muted-foreground">{u.phoneNumber}</td>
                  <td className="p-3">{u.premiumPlan}</td>
                  <td className="p-3 text-muted-foreground">{formatDate(u.premiumStartDate)}</td>
                  <td className="p-3 text-muted-foreground">{formatDate(u.premiumEndDate)}</td>
                  <td className="p-3">
                    <Badge
                      variant="outline"
                      className={
                        isActive
                          ? "bg-success/10 text-success border-success/20"
                          : "bg-destructive/10 text-destructive border-destructive/20"
                      }
                    >
                      {displayStatus}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          setExtendTarget(u);
                          setExtendDate(u.premiumEndDate ? u.premiumEndDate.slice(0, 10) : "");
                        }}
                      >
                        Extend
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => setRevokeTarget(u)}
                      >
                        Revoke
                      </Button>
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Revoke Confirm */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(v) => !v && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Premium Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke premium access for{" "}
              <strong>{revokeTarget?.name}</strong>? This will immediately remove their premium
              benefits.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => revokeTarget && revokeMutation.mutate(revokeTarget.id)}
              disabled={revokeMutation.isPending}
            >
              {revokeMutation.isPending ? "Revoking..." : "Revoke"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Extend Dialog */}
      <Dialog open={!!extendTarget} onOpenChange={(v) => !v && setExtendTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Extend Premium</DialogTitle>
            <DialogDescription>
              Set a new end date for <strong>{extendTarget?.name}</strong>'s premium subscription.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>New End Date</Label>
              <Input
                type="date"
                value={extendDate}
                onChange={(e) => setExtendDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendTarget(null)}>Cancel</Button>
            <Button
              disabled={!extendDate || extendMutation.isPending}
              onClick={() =>
                extendTarget && extendMutation.mutate({ id: extendTarget.id, endDate: extendDate })
              }
            >
              {extendMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

// ─── Charts ────────────────────────────────────────────────────────────────────

const CHART_COLORS = {
  active: "#22c55e",
  expired: "#ef4444",
  monthly: "#6366f1",
  quarterly: "#f59e0b",
  annual: "#10b981",
};

type ChartEntry = { name: string; value: number; fill: string };

const StatusBarChart = ({ active, expired }: { active: number; expired: number }) => {
  const data: ChartEntry[] = [
    { name: "Active", value: active, fill: CHART_COLORS.active },
    { name: "Expired", value: expired, fill: CHART_COLORS.expired },
  ];
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm space-y-3">
      <p className="text-sm font-medium">Subscription Status</p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} barCategoryGap="40%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
            cursor={{ fill: "hsl(var(--muted))" }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const PlanBreakdownChart = ({ planCounts }: { planCounts: Record<string, number> }) => {
  const data: ChartEntry[] = [
    { name: "Monthly", value: planCounts["monthly"] ?? planCounts["Monthly"] ?? 0, fill: CHART_COLORS.monthly },
    { name: "Quarterly", value: planCounts["quarterly"] ?? planCounts["Quarterly"] ?? 0, fill: CHART_COLORS.quarterly },
    { name: "Annual", value: planCounts["annual"] ?? planCounts["Annual"] ?? 0, fill: CHART_COLORS.annual },
  ];
  const hasData = data.some((d) => d.value > 0);
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm space-y-3">
      <p className="text-sm font-medium">Subscribers by Plan</p>
      {hasData ? (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} barCategoryGap="40%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
              cursor={{ fill: "hsl(var(--muted))" }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[160px] flex items-center justify-center text-sm text-muted-foreground">
          No plan data available
        </div>
      )}
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const PaymentsPage = () => {
  // Fetch premium users for real stats
  const { data: premiumUsersRaw = [] } = useQuery<any[]>({
    queryKey: ["premium-users"],
    queryFn: async ({ signal }) => {
      const payload = await apiClient.get<any>("/accounts/premium-users", signal);
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.data)) return payload.data;
      return [];
    },
  });

  // Fetch premium settings for price info and plans
  const { data: settingsRaw } = useQuery({
    queryKey: ["settings-premium"],
    queryFn: ({ signal }) => apiClient.get<any>("/settings/premium", signal),
  });

  const { data: plansData } = useQuery({
    queryKey: ["settings-plans"],
    queryFn: ({ signal }) => apiClient.get<any>("/settings/plans", signal),
  });

  const settings = settingsRaw?.data ?? settingsRaw ?? {};
  const currency = plansData?.currency ?? settings.currency ?? "ETB";
  const monthlyPrice = Number(settings.monthlyPrice ?? settings.premiumPrice ?? 0);

  const planPriceMap: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    (plansData?.plans ?? []).forEach((p: any) => {
      map[p.id.toLowerCase()] = Number(p.price) || 0;
    });
    return map;
  }, [plansData]);

  const now = new Date();
  const activeCount  = premiumUsersRaw.filter((u) =>
    u.premiumEndDate ? new Date(u.premiumEndDate) > now : true,
  ).length;
  const expiredCount = premiumUsersRaw.length - activeCount;

  // Real estimated revenue based on live backend configured plan pricing
  const totalRevenue = premiumUsersRaw.reduce((sum, u) => {
    const planKey = (u.premiumPlan ?? "").toLowerCase();
    const price = planPriceMap[planKey] ?? (planKey.includes("annual") ? 3000 : planKey.includes("quarter") ? 900 : monthlyPrice);
    return sum + price;
  }, 0);

  // Count by plan
  const planCounts: Record<string, number> = {};
  for (const u of premiumUsersRaw) {
    const plan = u.premiumPlan ?? "Unknown";
    planCounts[plan] = (planCounts[plan] ?? 0) + 1;
  }

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-5 shadow-sm space-y-1">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-success" />
            <p className="text-xs text-muted-foreground">Active Subscribers</p>
          </div>
          <p className="text-3xl font-bold text-success">{activeCount}</p>
          <p className="text-xs text-muted-foreground">currently active premium</p>
        </div>
        <div className="rounded-lg border bg-card p-5 shadow-sm space-y-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Total Subscribers</p>
          </div>
          <p className="text-3xl font-bold">{premiumUsersRaw.length}</p>
          <p className="text-xs text-muted-foreground">{expiredCount} expired</p>
        </div>
        <div className="rounded-lg border bg-card p-5 shadow-sm space-y-1">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <p className="text-xs text-muted-foreground">Estimated Revenue</p>
          </div>
          <p className="text-3xl font-bold text-primary">
            {totalRevenue > 0 ? `${totalRevenue.toLocaleString()} ${currency}` : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            based on {monthlyPrice} {currency}/month
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatusBarChart active={activeCount} expired={expiredCount} />
        <PlanBreakdownChart planCounts={planCounts} />
      </div>

      {/* Subscriptions Table */}
      <Tabs defaultValue="premium">
        <TabsList>
          <TabsTrigger value="premium">
            <Crown className="h-3.5 w-3.5 mr-1.5" />
            Premium Subscriptions
          </TabsTrigger>
        </TabsList>
        <TabsContent value="premium" className="mt-4">
          <PremiumSubscriptionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PaymentsPage;
