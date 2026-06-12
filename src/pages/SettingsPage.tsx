import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  Calendar,
  BarChart2,
  Crown,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/services/api/client";
import { useQuery, useMutation } from "@tanstack/react-query";

// ─── Types ────────────────────────────────────────────────────────────────────

type PremiumSettings = {
  monthlyPrice?: number;
  monthlyDurationDays?: number;
  quarterlyPrice?: number;
  quarterlyDurationDays?: number;
  annualPrice?: number;
  annualDurationDays?: number;
  currency?: string;
  telegramSupport?: string;
  benefitsDescription?: string;
};

// ─── Plan Accordion Item ──────────────────────────────────────────────────────

type PlanAccordionItemProps = {
  id: string;
  label: string;
  icon: React.ReactNode;
  period: string;
  badge?: string;
  price: number | "";
  durationDays: number | "";
  currency: string;
  isOpen: boolean;
  onToggle: () => void;
  onPriceChange: (v: number | "") => void;
  onDaysChange: (v: number | "") => void;
  iconBg: string;
  iconColor: string;
};

const PlanAccordionItem = ({
  label,
  icon,
  period,
  badge,
  price,
  durationDays,
  currency,
  isOpen,
  onToggle,
  onPriceChange,
  onDaysChange,
  iconBg,
  iconColor,
}: PlanAccordionItemProps) => {
  const curr = currency || "ETB";

  return (
    <div
      className={cn(
        "rounded-lg border transition-colors duration-150",
        isOpen ? "border-border" : "border-border/60",
      )}
    >
      {/* Header — click to expand */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/40 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* Icon */}
        <div
          className="h-9 w-9 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {icon}
        </div>

        {/* Meta */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
          <p className="text-lg font-medium leading-tight">
            {price !== "" && price != null
              ? Number(price).toLocaleString()
              : "—"}
            <span className="text-sm font-normal text-muted-foreground ml-1.5">
              {curr} {period}
            </span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {durationDays !== "" && durationDays != null
              ? `${durationDays} days`
              : "— days"}
          </p>
        </div>

        {/* Badge + chevron */}
        {badge && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 mr-1 whitespace-nowrap">
            {badge}
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {/* Divider */}
      {isOpen && <div className="h-px bg-border mx-4" />}

      {/* Expandable fields */}
      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-3 grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{`Price (${curr})`}</Label>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 199"
                value={price}
                onChange={(e) =>
                  onPriceChange(e.target.value === "" ? "" : Number(e.target.value))
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Duration (days)</Label>
              <Input
                type="number"
                min={1}
                placeholder="e.g. 30"
                value={durationDays}
                onChange={(e) =>
                  onDaysChange(e.target.value === "" ? "" : Number(e.target.value))
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Premium Settings Section ─────────────────────────────────────────────────

const PremiumSettingsSection = () => {
  const { toast } = useToast();

  const [openPlan, setOpenPlan] = useState<string | null>(null);

  const [monthlyPrice, setMonthlyPrice]                   = useState<number | "">("");
  const [monthlyDurationDays, setMonthlyDurationDays]     = useState<number | "">("");
  const [quarterlyPrice, setQuarterlyPrice]               = useState<number | "">("");
  const [quarterlyDurationDays, setQuarterlyDurationDays] = useState<number | "">("");
  const [annualPrice, setAnnualPrice]                     = useState<number | "">("");
  const [annualDurationDays, setAnnualDurationDays]       = useState<number | "">("");
  const [currency, setCurrency]                           = useState("ETB");
  const [telegramSupport, setTelegramSupport]             = useState("");
  const [benefitsDescription, setBenefitsDescription]     = useState("");
  const [freeSubjectId, setFreeSubjectId]                 = useState<string>("");

  // Fetch settings
  const { data: settingsRaw, isLoading } = useQuery({
    queryKey: ["settings-premium"],
    queryFn: ({ signal }) => apiClient.get<any>("/settings/premium", signal),
  });

  // Fetch all subjects for the free subject picker
  const { data: allSubjects = [] } = useQuery<{ id: string; name: string; streamId?: string }[]>({
    queryKey: ["subjects-for-settings"],
    queryFn: async ({ signal }) => {
      const json = await apiClient.get<any>("/subjects", signal);
      return Array.isArray(json) ? json : (json.data ?? []);
    },
  });

  const dbSettings = settingsRaw?.data ?? settingsRaw ?? {};

  useEffect(() => {
    if (!isLoading && settingsRaw) {
      const d = dbSettings;
      // Support both old field names (premiumPrice/durationDays) and new per-plan names
      setMonthlyPrice(d.monthlyPrice ?? d.premiumPrice ?? "");
      setMonthlyDurationDays(d.monthlyDurationDays ?? d.durationDays ?? "");
      setQuarterlyPrice(d.quarterlyPrice ?? "");
      setQuarterlyDurationDays(d.quarterlyDurationDays ?? "");
      setAnnualPrice(d.annualPrice ?? "");
      setAnnualDurationDays(d.annualDurationDays ?? "");
      setCurrency(d.currency ?? "ETB");
      setTelegramSupport(d.telegramSupport ?? "");
      setBenefitsDescription(d.benefitsDescription ?? "");
      setFreeSubjectId(d.freeSubjectId ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, settingsRaw]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiClient.put("/settings/premium", {
        data: {
          monthlyPrice:          monthlyPrice          === "" ? null : Number(monthlyPrice),
          monthlyDurationDays:   monthlyDurationDays   === "" ? null : Number(monthlyDurationDays),
          quarterlyPrice:        quarterlyPrice        === "" ? null : Number(quarterlyPrice),
          quarterlyDurationDays: quarterlyDurationDays === "" ? null : Number(quarterlyDurationDays),
          annualPrice:           annualPrice           === "" ? null : Number(annualPrice),
          annualDurationDays:    annualDurationDays    === "" ? null : Number(annualDurationDays),
          currency,
          telegramSupport,
          benefitsDescription,
          freeSubjectId: freeSubjectId || null,
        },
      }),
    onSuccess: () => toast({ title: "Success", description: "Premium settings saved." }),
    onError: () =>
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedSubjectName = allSubjects.find((s) => s.id === freeSubjectId)?.name;

  const plans = [
    {
      id:          "monthly",
      label:       "Monthly",
      icon:        <Calendar className="h-4 w-4" />,
      period:      "/ mo",
      badge:       undefined,
      price:       monthlyPrice,
      durationDays: monthlyDurationDays,
      onPriceChange: setMonthlyPrice,
      onDaysChange:  setMonthlyDurationDays,
      iconBg:      "hsl(var(--muted))",
      iconColor:   "hsl(var(--muted-foreground))",
    },
    {
      id:          "quarterly",
      label:       "Quarterly",
      icon:        <BarChart2 className="h-4 w-4" />,
      period:      "/ 3 mo",
      badge:       undefined,
      price:       quarterlyPrice,
      durationDays: quarterlyDurationDays,
      onPriceChange: setQuarterlyPrice,
      onDaysChange:  setQuarterlyDurationDays,
      iconBg:      "#eaf3de",
      iconColor:   "#3b6d11",
    },
    {
      id:          "annual",
      label:       "Annual",
      icon:        <Crown className="h-4 w-4" />,
      period:      "/ yr",
      badge:       "Best value",
      price:       annualPrice,
      durationDays: annualDurationDays,
      onPriceChange: setAnnualPrice,
      onDaysChange:  setAnnualDurationDays,
      iconBg:      "#e6f1fb",
      iconColor:   "#185fa5",
    },
  ];

  return (
    <div className="bg-card rounded-lg border p-6 space-y-5">
      <h3 className="font-semibold">Premium Subscription Settings</h3>

      {/* Live plan summary — read-only overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Monthly",   price: monthlyPrice,   days: monthlyDurationDays,   savings: 0 },
          {
            label: "Quarterly", price: quarterlyPrice, days: quarterlyDurationDays,
            savings: (monthlyPrice && quarterlyPrice)
              ? Math.round(100 - (Number(quarterlyPrice) / (Number(monthlyPrice) * 3)) * 100)
              : 0,
          },
          {
            label: "Annual",    price: annualPrice,    days: annualDurationDays,
            savings: (monthlyPrice && annualPrice)
              ? Math.round(100 - (Number(annualPrice) / (Number(monthlyPrice) * 12)) * 100)
              : 0,
            badge: "Best value",
          },
        ].map((p) => (
          <div key={p.label} className="rounded-lg border bg-muted/30 p-3 text-center space-y-0.5">
            <div className="flex items-center justify-center gap-1.5">
              <p className="text-xs text-muted-foreground font-medium">{p.label}</p>
              {p.badge && (
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                  {p.badge}
                </span>
              )}
            </div>
            <p className="text-xl font-bold text-primary">
              {p.price !== "" && p.price != null ? Number(p.price).toLocaleString() : "—"}
              <span className="text-xs font-normal text-muted-foreground ml-1">{currency}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {p.days !== "" && p.days != null ? `${p.days} days` : "— days"}
            </p>
            {p.savings > 0 && (
              <p className="text-[11px] text-success font-medium">Save {p.savings}%</p>
            )}
          </div>
        ))}
      </div>

      {/* Plan accordion — click to edit */}
      <div className="space-y-2">
        {plans.map((plan) => (
          <PlanAccordionItem
            key={plan.id}
            {...plan}
            currency={currency}
            isOpen={openPlan === plan.id}
            onToggle={() => setOpenPlan(openPlan === plan.id ? null : plan.id)}
          />
        ))}
      </div>

      {/* Shared settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        <div className="space-y-1">
          <Label htmlFor="sp-currency">Currency</Label>
          <Input
            id="sp-currency"
            placeholder="ETB"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="sp-telegram">Telegram Support Link</Label>
          <Input
            id="sp-telegram"
            placeholder="@LearnovaSupport"
            value={telegramSupport}
            onChange={(e) => setTelegramSupport(e.target.value)}
          />
        </div>
      </div>

      {/* Free subject selector */}
      <div className="space-y-1.5 rounded-lg border bg-muted/30 p-4">
        <Label htmlFor="sp-free-subject" className="text-sm font-medium">
          Free Subject (for non-premium users)
        </Label>
        <p className="text-xs text-muted-foreground pb-1">
          Free users get full access to all questions and mock exams for this subject only.
          All other subjects require a premium subscription.
        </p>
        <Select
          value={freeSubjectId || "__none__"}
          onValueChange={(v) => setFreeSubjectId(v === "__none__" ? "" : v)}
        >
          <SelectTrigger id="sp-free-subject">
            <SelectValue placeholder="Select a free subject…">
              {freeSubjectId
                ? (selectedSubjectName ?? "Loading…")
                : "None — all subjects require premium"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None — all subjects require premium</SelectItem>
            {allSubjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="sp-benefits">Premium Benefits Description</Label>
        <Textarea
          id="sp-benefits"
          placeholder="Describe the benefits of premium..."
          rows={3}
          value={benefitsDescription}
          onChange={(e) => setBenefitsDescription(e.target.value)}
        />
      </div>

      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
        {saveMutation.isPending ? "Saving..." : "Save Premium Settings"}
      </Button>
    </div>
  );
};

// ─── Settings Page ─────────────────────────────────────────────────────────────

const SettingsPage = () => {
  const { toast } = useToast();

  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const [admins, setAdmins]               = useState<any[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  const [addAdminOpen, setAddAdminOpen]   = useState(false);
  const [adminName, setAdminName]         = useState("");
  const [adminPhone, setAdminPhone]       = useState("+251");
  const [adminEmail, setAdminEmail]       = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminRole, setAdminRole]         = useState("admin");
  const [showPassword, setShowPassword]   = useState(false);
  const [addLoading, setAddLoading]       = useState(false);
  const [formErrors, setFormErrors]       = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchAdmins = async () => {
      setLoadingAdmins(true);
      try {
        const json = await apiClient.get<any>("/accounts/get-accounts");
        const adminList = (json?.data || []).filter((u: any) => u.type !== "student");
        setAdmins(adminList);
      } catch {
        // Failed to fetch admins
      } finally {
        setLoadingAdmins(false);
      }
    };
    fetchAdmins();
  }, []);

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your changes have been saved successfully.",
    });
  };

  const resetAddAdminForm = () => {
    setAdminName("");
    setAdminPhone("+251");
    setAdminEmail("");
    setAdminPassword("");
    setAdminRole("admin");
    setShowPassword(false);
    setFormErrors({});
  };

  const validateAdminForm = () => {
    const errors: Record<string, boolean> = {};
    if (!adminName.trim()) errors.name = true;
    if (!adminPhone.trim() || adminPhone === "+251") errors.phone = true;
    if (!adminPassword.trim() || adminPassword.length < 8) errors.password = true;
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddAdmin = async () => {
    if (!validateAdminForm()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly.",
        variant: "destructive",
      });
      return;
    }
    setAddLoading(true);
    try {
      const phoneDigits = adminPhone.replace("+251", "");
      const data = await apiClient.post<any>("/accounts/create-admin", {
        name: adminName,
        phoneNumber: phoneDigits,
        password: adminPassword,
        email: adminEmail || undefined,
      });

      toast({
        title: "Admin Created",
        description: `${adminName} has been added as an admin successfully.`,
      });

      setAdmins((prev) => [data, ...prev]);
      setAddAdminOpen(false);
      resetAddAdminForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create admin.",
        variant: "destructive",
      });
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <Tabs defaultValue="general">
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="roles">Admin Roles</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general" className="space-y-6">
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <h3 className="font-semibold">General Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>App Name</Label>
                <Input defaultValue="AI Exam Prep Ethiopia" />
              </div>
              <div>
                <Label>Support Email</Label>
                <Input defaultValue="support@aiexamprep.et" />
              </div>
              <div>
                <Label>Force App Update Version</Label>
                <Input defaultValue="2.1.0" />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Maintenance Mode</p>
                <p className="text-xs text-muted-foreground">
                  Temporarily disable the app for all users
                </p>
              </div>
              <div className="flex items-center gap-2">
                {maintenanceMode && <AlertTriangle className="h-4 w-4 text-warning" />}
                <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
              </div>
            </div>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments" className="space-y-6">
          <PremiumSettingsSection />
        </TabsContent>

        {/* Admin Roles */}
        <TabsContent value="roles" className="space-y-6">
          <div className="bg-card rounded-lg border shadow-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Admin Users</h3>
              <Button
                size="sm"
                onClick={() => {
                  resetAddAdminForm();
                  setAddAdminOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Admin
              </Button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Email</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Role</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {loadingAdmins ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center">Loading...</td>
                  </tr>
                ) : admins.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted-foreground">
                      No admins found
                    </td>
                  </tr>
                ) : (
                  admins.map((admin) => (
                    <tr key={admin.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{admin.name}</td>
                      <td className="p-3 text-muted-foreground">{admin.email}</td>
                      <td className="p-3">
                        <Badge variant="outline">{admin.type}</Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {admin.lastActiveAt
                          ? new Date(admin.lastActiveAt).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Admin Dialog */}
      <Dialog
        open={addAdminOpen}
        onOpenChange={(v) => {
          if (!v) {
            setAddAdminOpen(false);
            resetAddAdminForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Admin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Full Name *</Label>
              <Input
                placeholder="e.g. John Doe"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className={formErrors.name ? "border-destructive" : ""}
              />
              {formErrors.name && (
                <p className="text-xs text-destructive mt-1">Name is required</p>
              )}
            </div>
            <div>
              <Label>Phone Number *</Label>
              <Input
                type="tel"
                placeholder="+251XXXXXXXXX"
                value={adminPhone}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (!raw.startsWith("+251")) {
                    setAdminPhone("+251");
                    return;
                  }
                  const afterPrefix = raw.slice(4).replace(/\D/g, "");
                  setAdminPhone("+251" + afterPrefix);
                }}
                className={formErrors.phone ? "border-destructive" : ""}
              />
              {formErrors.phone && (
                <p className="text-xs text-destructive mt-1">
                  Valid phone number is required
                </p>
              )}
            </div>
            <div>
              <Label>
                Email{" "}
                <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                type="email"
                placeholder="admin@example.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>Role *</Label>
              <Select value={adminRole} onValueChange={setAdminRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="content_manager">Content Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Password *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className={`pr-10 ${formErrors.password ? "border-destructive" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formErrors.password && (
                <p className="text-xs text-destructive mt-1">
                  Password must be at least 8 characters
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddAdminOpen(false);
                resetAddAdminForm();
              }}
              disabled={addLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleAddAdmin} disabled={addLoading}>
              {addLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Admin"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;