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
import { Plus, AlertTriangle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/services/api/client";
import { useQuery, useMutation } from "@tanstack/react-query";

// ─── Premium Settings Section ─────────────────────────────────────────────────

type PremiumSettings = {
  premiumPrice?: number;
  durationDays?: number;
  currency?: string;
  telegramSupport?: string;
  benefitsDescription?: string;
};

const PremiumSettingsSection = () => {
  const { toast } = useToast();
  const [premiumPrice, setPremiumPrice]               = useState<number | "">("");
  const [durationDays, setDurationDays]               = useState<number | "">("");
  const [currency, setCurrency]                       = useState("ETB");
  const [telegramSupport, setTelegramSupport]         = useState("");
  const [benefitsDescription, setBenefitsDescription] = useState("");
  const [loaded, setLoaded]                           = useState(false);

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
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border p-6 space-y-4">
      <h3 className="font-semibold">Premium Subscription Settings</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="sp-price">Premium Price (ETB)</Label>
          <Input
            id="sp-price"
            type="number"
            min={0}
            placeholder="e.g. 199"
            value={premiumPrice}
            onChange={(e) => setPremiumPrice(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="sp-duration">Subscription Duration (days)</Label>
          <Input
            id="sp-duration"
            type="number"
            min={1}
            placeholder="e.g. 30"
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </div>
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

const SettingsPage = () => {
  const { toast } = useToast();

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [aiScanner, setAiScanner] = useState(true);

  // ── Feature toggles — from backend
  const [mockExams, setMockExams] = useState(false);
  const [shortAnswer, setShortAnswer] = useState(false);
  const [contentModeration, setContentModeration] = useState(false);

  // ── Milestone notification — from backend
  const [userMilestones, setUserMilestones] = useState(false);
  const [milestoneLoading, setMilestoneLoading] = useState(false);

  // ── Other notification toggles — local only
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [dailyReports, setDailyReports] = useState(true);
  const [paymentAlerts, setPaymentAlerts] = useState(true);

  const [admins, setAdmins] = useState<any[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  // Add Admin dialog state
  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminPhone, setAdminPhone] = useState("+251");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminRole, setAdminRole] = useState("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});

  // ── Fetch admins
  useEffect(() => {
    const fetchAdmins = async () => {
      setLoadingAdmins(true);
      try {
        const json = await apiClient.get<any>("/accounts/get-accounts");
        const adminList = (json?.data || []).filter(
          (u: any) => u.type !== "student",
        );
        setAdmins(adminList);
      } catch {
        // Failed to fetch admins
      } finally {
        setLoadingAdmins(false);
      }
    };
    fetchAdmins();
  }, []);

  // ── Fetch feature toggles on mount
  useEffect(() => {
    const fetchToggles = async () => {
      try {
        const json = await apiClient.get<any>("/admin/feature-toggles/status");
        setMockExams(json.mockExams ?? false);
        setShortAnswer(json.shortAnswerQuestions ?? false);
        setContentModeration(json.contentModeration ?? false);
      } catch {
        // Endpoint may not exist on this deployment — silently ignore
      }
    };
    fetchToggles();
  }, []);

  // ── Fetch milestone notification status on mount
  useEffect(() => {
    const fetchMilestoneStatus = async () => {
      try {
        const json = await apiClient.get<any>("/notifications/admin/milestone-notifications/status");
        setUserMilestones(json.isEnabled ?? false);
      } catch {
        // Endpoint may not exist on this deployment — silently ignore
      }
    };
    fetchMilestoneStatus();
  }, []);

  // ── Toggle feature handler
  const handleToggleFeature = async (
    feature: "mockExams" | "shortAnswerQuestions" | "contentModeration",
    newValue: boolean,
    setter: (v: boolean) => void,
  ) => {
    setter(newValue); // optimistic
    try {
      const json = await apiClient.post<any>("/admin/feature-toggles/toggle", {
        feature,
        isEnabled: newValue,
      });
      setMockExams(json.mockExams ?? false);
      setShortAnswer(json.shortAnswerQuestions ?? false);
      setContentModeration(json.contentModeration ?? false);
      toast({
        title: "Updated",
        description: `Feature ${newValue ? "enabled" : "disabled"} successfully.`,
      });
    } catch {
      setter(!newValue); // revert
      toast({
        title: "Error",
        description: "Failed to update feature. Please try again.",
        variant: "destructive",
      });
    }
  };

  // ── Toggle milestone notification handler
  const handleToggleMilestone = async (newValue: boolean) => {
    setUserMilestones(newValue); // optimistic
    setMilestoneLoading(true);
    try {
      const json = await apiClient.post<any>(
        "/notifications/admin/milestone-notifications/toggle",
      );
      setUserMilestones(json.isEnabled ?? newValue);
      toast({
        title: "Updated",
        description:
          json.message ||
          `Milestone notifications ${json.isEnabled ? "enabled" : "disabled"}.`,
      });
    } catch {
      setUserMilestones(!newValue); // revert
      toast({
        title: "Error",
        description: "Failed to update milestone notifications.",
        variant: "destructive",
      });
    } finally {
      setMilestoneLoading(false);
    }
  };

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
    if (!adminPassword.trim() || adminPassword.length < 8)
      errors.password = true;
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

      // Update state locally
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
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
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
                {maintenanceMode && (
                  <AlertTriangle className="h-4 w-4 text-warning" />
                )}
                <Switch
                  checked={maintenanceMode}
                  onCheckedChange={setMaintenanceMode}
                />
              </div>
            </div>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </TabsContent>

        {/* Content */}
        <TabsContent value="content" className="space-y-6">
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <h3 className="font-semibold">Feature Toggles</h3>
            {[
              {
                label: "Enable AI Scanner",
                desc: "Allow users to scan questions using camera",
                state: aiScanner,
                set: setAiScanner,
                feature: null,
              },
              {
                label: "Enable Mock Exams",
                desc: "Enable timed mock exam functionality",
                state: mockExams,
                set: setMockExams,
                feature: "mockExams" as const,
              },
              {
                label: "Enable Short Answer Questions",
                desc: "Allow open-ended question types",
                state: shortAnswer,
                set: setShortAnswer,
                feature: "shortAnswerQuestions" as const,
              },
              {
                label: "Content Moderation",
                desc: "Auto-review user-generated content",
                state: contentModeration,
                set: setContentModeration,
                feature: "contentModeration" as const,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between p-4 bg-muted rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={item.state}
                  onCheckedChange={(v) => {
                    if (item.feature) {
                      handleToggleFeature(item.feature, v, item.set);
                    } else {
                      item.set(v);
                    }
                  }}
                />
              </div>
            ))}
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </TabsContent>

        {/* AI */}
        <TabsContent value="ai" className="space-y-6">
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <h3 className="font-semibold">AI Configuration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Free User Daily Limit</Label>
                <Input type="number" defaultValue="10" />
              </div>
              <div>
                <Label>Premium User Daily Limit</Label>
                <Input defaultValue="Unlimited" />
              </div>
              <div>
                <Label>Primary Model</Label>
                <Select defaultValue="mistral">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mistral">Mistral 7B</SelectItem>
                    <SelectItem value="llama">Llama 3</SelectItem>
                    <SelectItem value="gpt4">GPT-4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>OCR Model</Label>
                <Select defaultValue="paddle">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paddle">PaddleOCR</SelectItem>
                    <SelectItem value="tesseract">Tesseract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments" className="space-y-6">
        
          <PremiumSettingsSection />
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <h3 className="font-semibold">Notification Settings</h3>
            {/* Local-only toggles */}
            {[
              {
                label: "Email Notifications",
                desc: "Receive email alerts for important events",
                state: emailNotifications,
                set: setEmailNotifications,
              },
              {
                label: "Daily Reports",
                desc: "Get daily summary emails",
                state: dailyReports,
                set: setDailyReports,
              },
              {
                label: "Payment Alerts",
                desc: "Notify on failed payments",
                state: paymentAlerts,
                set: setPaymentAlerts,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between p-4 bg-muted rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch checked={item.state} onCheckedChange={item.set} />
              </div>
            ))}

            {/* User Milestones — connected to backend */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">User Milestones</p>
                <p className="text-xs text-muted-foreground">
                  Alert when users hit 1000 questions
                </p>
              </div>
              <Switch
                checked={userMilestones}
                disabled={milestoneLoading}
                onCheckedChange={handleToggleMilestone}
              />
            </div>

            <Button onClick={handleSave}>Save Changes</Button>
          </div>
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
                  <th className="p-3 text-left font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="p-3 text-left font-medium text-muted-foreground">
                    Email
                  </th>
                  <th className="p-3 text-left font-medium text-muted-foreground">
                    Role
                  </th>
                  <th className="p-3 text-left font-medium text-muted-foreground">
                    Last Login
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingAdmins ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center">
                      Loading...
                    </td>
                  </tr>
                ) : admins.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-6 text-center text-muted-foreground"
                    >
                      No admins found
                    </td>
                  </tr>
                ) : (
                  admins.map((admin) => (
                    <tr
                      key={admin.id}
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-3 font-medium">{admin.name}</td>
                      <td className="p-3 text-muted-foreground">
                        {admin.email}
                      </td>
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
                <p className="text-xs text-destructive mt-1">
                  Name is required
                </p>
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
                <span className="text-muted-foreground text-xs">
                  (optional)
                </span>
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
                  <SelectItem value="content_manager">
                    Content Manager
                  </SelectItem>
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
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
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
