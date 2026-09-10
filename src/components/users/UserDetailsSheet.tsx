import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Crown,
  Edit,
  Mail,
  Key,
  Ban,
  Trash2,
  Loader2,
  BookOpen,
  Flame,
  Clock,
  BarChart3,
} from "lucide-react";

export type AccountUser = {
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

export type UserProgress = {
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

interface UserDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUser: AccountUser | null;
  getStreamName: (user: AccountUser) => string;
  userProgress: UserProgress | null;
  progressLoading: boolean;
  actionLoading: string | null;
  onEdit: (user: AccountUser) => void;
  onNotify: () => void;
  onTogglePremium: (user: AccountUser) => void;
  onResetPassword: () => void;
  onToggleSuspend: () => void;
  onDelete: () => void;
}

export const UserDetailsSheet = ({
  open,
  onOpenChange,
  selectedUser,
  getStreamName,
  userProgress,
  progressLoading,
  actionLoading,
  onEdit,
  onNotify,
  onTogglePremium,
  onResetPassword,
  onToggleSuspend,
  onDelete,
}: UserDetailsSheetProps) => {
  if (!selectedUser) return null;

  const initials = (name: string) => {
    if (!name) return "ST";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 overflow-y-auto">
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
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        selectedUser.isActive ? "bg-emerald-500" : "bg-rose-500",
                      )}
                    />
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
                onClick={() => onEdit(selectedUser)}
              >
                <Edit className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={onNotify}
              >
                <Mail className="h-3.5 w-3.5" /> Message
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => onTogglePremium(selectedUser)}
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
                <TabsTrigger value="progress" className="text-xs gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" />
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
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
                        <div className="flex items-center justify-center gap-1 text-amber-500 font-bold text-xl">
                          <Flame className="h-4 w-4" />
                          <span>{userProgress.currentStreak}d</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Study Streak</p>
                      </div>
                      <div className="rounded-xl border border-border/70 bg-card p-3 text-center shadow-xs col-span-2 sm:col-span-2">
                        <div className="flex items-center justify-center gap-1 text-foreground font-bold text-xl">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <span>{userProgress.totalStudyTimeHours ?? 0} hrs</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Total Study Time</p>
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
                      onClick={onResetPassword}
                      disabled={actionLoading === "password"}
                    >
                      <Key className="h-3.5 w-3.5" />
                      {actionLoading === "password" ? "Generating..." : "Generate New Temporary Password"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs justify-start gap-2"
                      onClick={onToggleSuspend}
                      disabled={actionLoading === "suspend"}
                    >
                      <Ban className="h-3.5 w-3.5" />
                      {selectedUser.isActive ? "Suspend Student Access" : "Reinstate Student Access"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full text-xs justify-start gap-2"
                      onClick={onDelete}
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
      </SheetContent>
    </Sheet>
  );
};
