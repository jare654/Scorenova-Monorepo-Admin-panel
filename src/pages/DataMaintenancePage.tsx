import { useState } from "react";
import {
  Wrench,
  Database,
  RefreshCw,
  GitMerge,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ShieldAlert,
  Sliders,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import { fetchSubjects, type Subject } from "@/services/api/content";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";

export default function DataMaintenancePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reassignment state
  const [sourceSubjectId, setSourceSubjectId] = useState("");
  const [targetSubjectId, setTargetSubjectId] = useState("");
  const [confirmReassignOpen, setConfirmReassignOpen] = useState(false);

  // ── Subjects list for dropdowns
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["subjects", "all"],
    queryFn: ({ signal }) => fetchSubjects(undefined, signal),
  });

  // ── Mutations
  const fixOrphanedMutation = useMutation({
    mutationFn: () => apiClient.post<any>("/questions/fix-orphaned-topics"),
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      toast({
        title: "Orphaned Topics Fixed",
        description: data?.message || "Successfully scanned and repaired orphaned question topics.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Repair Failed",
        description: err.message || "Failed to fix orphaned topics.",
        variant: "destructive",
      });
    },
  });

  const fixAllAssignmentsMutation = useMutation({
    mutationFn: () => apiClient.post<any>("/subjects/fix-all-assignments"),
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      toast({
        title: "Assignments Synchronized",
        description: data?.message || "Successfully re-synced all subject stream associations.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Synchronization Failed",
        description: err.message || "Failed to fix assignments.",
        variant: "destructive",
      });
    },
  });

  const fixStreamAssignmentsMutation = useMutation({
    mutationFn: () => apiClient.post<any>("/subjects/fix-stream-assignments"),
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      toast({
        title: "Stream Linkages Fixed",
        description: data?.message || "Stream mappings verified and updated.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Stream Repair Failed",
        description: err.message || "Failed to fix stream assignments.",
        variant: "destructive",
      });
    },
  });

  const reassignMutation = useMutation({
    mutationFn: () =>
      apiClient.post<any>("/subjects/reassign-questions", {
        sourceSubjectId,
        targetSubjectId,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      toast({
        title: "Questions Reassigned",
        description: data?.message || "All questions moved to the target subject successfully.",
      });
      setConfirmReassignOpen(false);
      setSourceSubjectId("");
      setTargetSubjectId("");
    },
    onError: (err: any) => {
      toast({
        title: "Reassignment Failed",
        description: err.message || "Failed to reassign questions.",
        variant: "destructive",
      });
    },
  });

  const sourceName = subjects.find((s) => s.id === sourceSubjectId)?.name;
  const targetName = subjects.find((s) => s.id === targetSubjectId)?.name;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">Data Maintenance & Repairs</h1>
        <p className="text-sm text-muted-foreground">
          Perform administrative database repairs, topic reconciliation, and bulk question reassignments.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tool 1: Fix Orphaned Topics */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-warning/10 text-warning">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Repair Orphaned Topics</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Questions pointing to missing or unlinked topics
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Scans all questions across the database for topic IDs that were previously deleted or
              orphaned during bulk imports, restoring consistency with their parent subjects.
            </p>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => fixOrphanedMutation.mutate()}
              disabled={fixOrphanedMutation.isPending}
            >
              {fixOrphanedMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Repairing Orphaned Topics…
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" /> Run Orphaned Topics Repair
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Tool 2: Subject & Stream Linkage Fix */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Stream & Subject Alignments</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Verify Natural/Social stream curriculum assignments
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ensures curriculum subjects (e.g. Physics to Natural Science, History to Social Science,
              English to Common) are properly mapped so mobile apps display the correct course listings.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => fixAllAssignmentsMutation.mutate()}
                disabled={fixAllAssignmentsMutation.isPending}
              >
                {fixAllAssignmentsMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Fix All Assignments
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => fixStreamAssignmentsMutation.mutate()}
                disabled={fixStreamAssignmentsMutation.isPending}
              >
                {fixStreamAssignmentsMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Fix Streams
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tool 3: Bulk Question Reassignment */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <GitMerge className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Bulk Question Reassignment</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Migrate all questions from one subject into another
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Use this tool if two subjects were created redundantly (e.g. "Math" and "Mathematics") and
            you need to safely consolidate all questions and attempts under a single target subject.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center">
            {/* Source Subject */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Source Subject (From)</label>
              <Select value={sourceSubjectId} onValueChange={setSourceSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id} disabled={s.id === targetSubjectId}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Indicator */}
            <div className="flex justify-center pt-5 sm:pt-0 text-muted-foreground">
              <ArrowRight className="h-5 w-5" />
            </div>

            {/* Target Subject */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Target Subject (To)</label>
              <Select value={targetSubjectId} onValueChange={setTargetSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id} disabled={s.id === sourceSubjectId}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="destructive"
              className="gap-2"
              onClick={() => setConfirmReassignOpen(true)}
              disabled={!sourceSubjectId || !targetSubjectId || sourceSubjectId === targetSubjectId}
            >
              <GitMerge className="h-4 w-4" /> Reassign Questions…
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reassignment Confirmation Dialog */}
      <AlertDialog open={confirmReassignOpen} onOpenChange={setConfirmReassignOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Confirm Bulk Question Reassignment
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to move all questions from <strong>"{sourceName}"</strong> to{" "}
                <strong>"{targetName}"</strong>?
              </p>
              <p className="text-xs text-muted-foreground">
                All associated topics, practice questions, and exam sessions will point to the target
                subject. This bulk database operation cannot be undone automatically.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reassignMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={reassignMutation.isPending}
              onClick={() => reassignMutation.mutate()}
            >
              {reassignMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" /> Reassigning…
                </>
              ) : (
                "Confirm Reassign"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
