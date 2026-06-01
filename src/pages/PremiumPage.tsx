import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Crown, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type PremiumSettings = {
  premiumPrice?: number;
  durationDays?: number;
  currency?: string;
  telegramSupport?: string;
  benefitsDescription?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
};

// ─── Premium Users Tab ────────────────────────────────────────────────────────

const PremiumUsersTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Revoke dialog
  const [revokeTarget, setRevokeTarget] = useState<PremiumUser | null>(null);

  // Extend dialog
  const [extendTarget, setExtendTarget] = useState<PremiumUser | null>(null);
  const [extendDate, setExtendDate] = useState("");

  const { data: users = [], isLoading } = useQuery<PremiumUser[]>({
    queryKey: ["premium-users"],
    queryFn: ({ signal }) => apiClient.get<PremiumUser[]>("/accounts/premium-users", signal),
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
    const matchStatus =
      statusFilter === "all" || u.status.toLowerCase() === statusFilter;
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
      <div className="bg-card rounded-lg border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {["Student Name", "Phone", "Plan", "Start Date", "End Date", "Status", "Actions"].map(
                (h) => (
                  <th key={h} className="p-3 text-left font-medium text-muted-foreground">
                    {h}
                  </th>
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
                  No premium users found.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
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
                        u.status === "Active"
                          ? "bg-success/10 text-success border-success/20"
                          : "bg-destructive/10 text-destructive border-destructive/20"
                      }
                    >
                      {u.status}
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Revoke Confirm Dialog */}
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
            <Button variant="outline" onClick={() => setExtendTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={!extendDate || extendMutation.isPending}
              onClick={() =>
                extendTarget &&
                extendMutation.mutate({ id: extendTarget.id, endDate: extendDate })
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

// ─── Settings Tab ─────────────────────────────────────────────────────────────

const SettingsTab = () => {
  const { toast } = useToast();

  const [premiumPrice, setPremiumPrice] = useState<number | "">("");
  const [durationDays, setDurationDays] = useState<number | "">("");
  const [currency, setCurrency] = useState("ETB");
  const [telegramSupport, setTelegramSupport] = useState("");
  const [benefitsDescription, setBenefitsDescription] = useState("");
  const [loaded, setLoaded] = useState(false);

  const { isLoading } = useQuery<{ data: PremiumSettings }>({
    queryKey: ["settings-premium"],
    queryFn: ({ signal }) =>
      apiClient.get<{ data: PremiumSettings }>("/settings/premium", signal),
    onSuccess: (res: { data: PremiumSettings }) => {
      if (!loaded && res?.data) {
        const d = res.data;
        setPremiumPrice(d.premiumPrice ?? "");
        setDurationDays(d.durationDays ?? "");
        setCurrency(d.currency ?? "ETB");
        setTelegramSupport(d.telegramSupport ?? "");
        setBenefitsDescription(d.benefitsDescription ?? "");
        setLoaded(true);
      }
    },
  } as any);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiClient.put("/settings/premium", {
        data: {
          premiumPrice: premiumPrice === "" ? null : Number(premiumPrice),
          durationDays: durationDays === "" ? null : Number(durationDays),
          currency,
          telegramSupport,
          benefitsDescription,
        },
      }),
    onSuccess: () => toast({ title: "Success", description: "Premium settings saved." }),
    onError: () =>
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-5">
      <div className="space-y-1">
        <Label htmlFor="premiumPrice">Premium Price (ETB)</Label>
        <Input
          id="premiumPrice"
          type="number"
          min={0}
          placeholder="e.g. 199"
          value={premiumPrice}
          onChange={(e) => setPremiumPrice(e.target.value === "" ? "" : Number(e.target.value))}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="durationDays">Subscription Duration (days)</Label>
        <Input
          id="durationDays"
          type="number"
          min={1}
          placeholder="e.g. 30"
          value={durationDays}
          onChange={(e) => setDurationDays(e.target.value === "" ? "" : Number(e.target.value))}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="currency">Currency</Label>
        <Input
          id="currency"
          placeholder="ETB"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="telegramSupport">Telegram Support Link</Label>
        <Input
          id="telegramSupport"
          placeholder="@LearnovaSupport"
          value={telegramSupport}
          onChange={(e) => setTelegramSupport(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="benefitsDescription">Premium Benefits Description</Label>
        <Textarea
          id="benefitsDescription"
          placeholder="Describe the benefits of premium..."
          rows={4}
          value={benefitsDescription}
          onChange={(e) => setBenefitsDescription(e.target.value)}
        />
      </div>

      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
        {saveMutation.isPending ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const PremiumPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Crown className="h-6 w-6 text-warning" />
        <div>
          <h1 className="text-2xl font-bold">Premium</h1>
          <p className="text-sm text-muted-foreground">
            Manage premium subscriptions and settings
          </p>
        </div>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Premium Users</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-4">
          <PremiumUsersTab />
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PremiumPage;
