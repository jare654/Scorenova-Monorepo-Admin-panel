import { useState } from "react";
import {
  ScanText,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Play,
  Copy,
  Check,
  Search,
  RefreshCw,
  Cpu,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Sliders,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
} from "@/components/ui/dialog";
import KPICard from "@/components/KPICard";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/services/api/client";
import { cn } from "@/lib/utils";

// ─── Mock 14-day Telemetry Data ───────────────────────────────────────────────
const scanTimelineData = [
  { date: "Aug 28", success: 120, nonQuestion: 14, failed: 3 },
  { date: "Aug 29", success: 145, nonQuestion: 18, failed: 5 },
  { date: "Aug 30", success: 160, nonQuestion: 12, failed: 2 },
  { date: "Aug 31", success: 190, nonQuestion: 22, failed: 4 },
  { date: "Sep 01", success: 210, nonQuestion: 19, failed: 6 },
  { date: "Sep 02", success: 240, nonQuestion: 25, failed: 3 },
  { date: "Sep 03", success: 290, nonQuestion: 31, failed: 7 },
  { date: "Sep 04", success: 310, nonQuestion: 28, failed: 4 },
  { date: "Sep 05", success: 280, nonQuestion: 20, failed: 2 },
  { date: "Sep 06", success: 330, nonQuestion: 34, failed: 5 },
  { date: "Sep 07", success: 380, nonQuestion: 40, failed: 6 },
  { date: "Sep 08", success: 420, nonQuestion: 36, failed: 4 },
  { date: "Sep 09", success: 450, nonQuestion: 42, failed: 8 },
  { date: "Sep 10", success: 490, nonQuestion: 45, failed: 5 },
];

const subjectDistribution = [
  { subject: "Mathematics", scans: 1420 },
  { subject: "Physics", scans: 980 },
  { subject: "Chemistry", scans: 840 },
  { subject: "Biology", scans: 610 },
  { subject: "Economics", scans: 390 },
  { subject: "Aptitude", scans: 280 },
];

interface ScanLog {
  id: string;
  studentName: string;
  studentPhone: string;
  timestamp: string;
  stream: "Natural Science" | "Social Science";
  rawTextPreview: string;
  questionType: "mcq" | "open" | "rejected";
  status: "success" | "rejected" | "error";
  latencyMs: number;
  tokensUsed: number;
  extractedQuestion?: string;
  extractedAnswer?: string;
}

const recentScanLogs: ScanLog[] = [
  {
    id: "scan-9021",
    studentName: "Abebe Kebede",
    studentPhone: "+251911445566",
    timestamp: "2 mins ago",
    stream: "Natural Science",
    rawTextPreview: "14. A projectile is launched at an angle of 30 degrees with velocity 40m/s...",
    questionType: "mcq",
    status: "success",
    latencyMs: 1120,
    tokensUsed: 340,
    extractedQuestion: "A projectile is launched at an angle of 30° with an initial velocity of 40 m/s. What is the maximum height?",
    extractedAnswer: "Option B: 20.4 m",
  },
  {
    id: "scan-9020",
    studentName: "Hiwot Tadesse",
    studentPhone: "+251922334455",
    timestamp: "5 mins ago",
    stream: "Social Science",
    rawTextPreview: "Total payment receipt for Commercial Bank of Ethiopia Ref 98213...",
    questionType: "rejected",
    status: "rejected",
    latencyMs: 420,
    tokensUsed: 0,
    extractedQuestion: "Rejected: Scanned image was classified as a payment receipt, not an academic exam question.",
  },
  {
    id: "scan-9019",
    studentName: "Yonas Alemu",
    studentPhone: "+251933778899",
    timestamp: "12 mins ago",
    stream: "Natural Science",
    rawTextPreview: "Find the derivative of f(x) = ln(3x^2 + 5x) with respect to x.",
    questionType: "open",
    status: "success",
    latencyMs: 1450,
    tokensUsed: 420,
    extractedQuestion: "Find the derivative of f(x) = ln(3x^2 + 5x) with respect to x.",
    extractedAnswer: "(6x + 5) / (3x^2 + 5x)",
  },
  {
    id: "scan-9018",
    studentName: "Marta Tesfaye",
    studentPhone: "+251944556677",
    timestamp: "18 mins ago",
    stream: "Natural Science",
    rawTextPreview: "Which of the following organic compounds decolorizes bromine water in CCl4?",
    questionType: "mcq",
    status: "success",
    latencyMs: 980,
    tokensUsed: 310,
    extractedQuestion: "Which of the following organic compounds decolorizes bromine water in CCl4?",
    extractedAnswer: "Option C: Ethene (C2H4)",
  },
  {
    id: "scan-9017",
    studentName: "Dawit Bekele",
    studentPhone: "+251955112233",
    timestamp: "24 mins ago",
    stream: "Social Science",
    rawTextPreview: "Photo too blurry: blur_index=0.88, insufficient contrast...",
    questionType: "rejected",
    status: "error",
    latencyMs: 890,
    tokensUsed: 120,
    extractedQuestion: "Failed: Image blur exceeds tolerance. Student prompted to rescan with steady light.",
  },
];

export default function AIScannerPage() {
  const { toast } = useToast();

  // Test bench state
  const [rawText, setRawText] = useState(
    "15. What is the derivative of f(x) = 3x^3 - 4x^2 + 7x - 2?\nA. 9x^2 - 8x + 7\nB. 3x^2 - 8x + 7\nC. 9x^2 - 4x + 7\nD. 9x - 8",
  );
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Inspector modal
  const [inspectLog, setInspectLog] = useState<ScanLog | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Telemetry toggles
  const [scannerEnabled, setScannerEnabled] = useState(true);
  const [modelChoice, setModelChoice] = useState("mistral-large-2411");
  const [freeUserLimit, setFreeUserLimit] = useState("5");

  const runTestBench = async () => {
    if (!rawText.trim()) return;
    setTesting(true);
    setTestResult(null);

    try {
      // Call live backend scan-question endpoint
      const res = await apiClient.post<any>("/ai/scan-question", {
        rawText: rawText.trim(),
      });
      setTestResult(res?.data ?? res);
      toast({
        title: "Scan Parsed Successfully",
        description: "Mistral AI successfully extracted the question.",
      });
    } catch (err: any) {
      setTestResult({
        error: err.message || "Failed to parse question",
        isQuestion: false,
      });
      toast({
        title: "Scan Completed with Notice",
        description: err.message || "Non-question or OCR error encountered.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleCopyJson = () => {
    if (!testResult) return;
    navigator.clipboard.writeText(JSON.stringify(testResult, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const filteredLogs = recentScanLogs.filter((log) => {
    const matchesSearch =
      log.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.studentPhone.includes(searchQuery) ||
      log.rawTextPreview.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* ── Top Header Ribbon ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-border/70 bg-gradient-to-r from-card via-card to-blue-500/5 p-5 sm:p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              AI Question Scanner Telemetry
            </h2>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[11px] font-semibold gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Mistral OCR Engine
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time monitoring for mobile camera scans, OCR recognition rates, and LLM question extraction.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/80 px-3 py-1.5">
            <Label htmlFor="scanner-toggle" className="text-xs font-medium cursor-pointer">
              Scanner Active
            </Label>
            <Switch
              id="scanner-toggle"
              checked={scannerEnabled}
              onCheckedChange={(v) => {
                setScannerEnabled(v);
                toast({
                  title: v ? "AI Scanner Online" : "AI Scanner Paused",
                  description: v
                    ? "Students can scan questions freely."
                    : "Mobile app will show temporary maintenance mode.",
                });
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Metric Ribbon ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Scans (30d)"
          value="18,420"
          icon={ScanText}
          iconColor="text-blue-500"
          change="+18.4% vs last month"
          changeType="positive"
        />
        <KPICard
          title="Recognition Accuracy"
          value="95.8%"
          icon={CheckCircle2}
          iconColor="text-emerald-500"
          badge="High Fidelity"
        />
        <KPICard
          title="Average Latency"
          value="1.18s"
          icon={Clock}
          iconColor="text-amber-500"
          badge="P95: 1.84s"
        />
        <KPICard
          title="Rejected / Receipts"
          value="3.8%"
          icon={ShieldCheck}
          iconColor="text-primary"
          badge="Auto-Filtered"
        />
      </div>

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scan Activity Area Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-border/70 bg-card p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Scan Volume & Success Trend</h3>
              <p className="text-xs text-muted-foreground">Daily processed scans over the past 14 days</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> Success
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Filtered
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Error
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={scanTimelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scanSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Area type="monotone" dataKey="success" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#scanSuccess)" />
                <Area type="monotone" dataKey="nonQuestion" stroke="#f59e0b" strokeWidth={1.5} fillOpacity={0} />
                <Area type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={1.5} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Scanned Subjects Bar Chart */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Scanned Subjects</h3>
            <p className="text-xs text-muted-foreground">Distribution across curriculum</p>
          </div>

          <div className="h-64 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectDistribution} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.6} />
                <XAxis type="number" hide />
                <YAxis dataKey="subject" type="category" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="scans" fill="#2563eb" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Live Test Bench & Settings ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Test Bench */}
        <div className="lg:col-span-2 rounded-2xl border border-border/70 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Live OCR Parser Simulator</h3>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Tests `@Post("/api/v1/ai/scan-question")`
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            Paste raw text extracted from device OCR to inspect how the Mistral AI parser structures the question, extracts choices, and identifies the correct solution.
          </p>

          <Textarea
            rows={4}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste raw OCR output here..."
            className="font-mono text-xs leading-relaxed resize-none"
          />

          <div className="flex items-center justify-between">
            <Button
              size="sm"
              onClick={runTestBench}
              disabled={testing || !rawText.trim()}
              className="gap-2 h-9 text-xs"
            >
              {testing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Parsing with Mistral AI...
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" /> Run Parse Simulator
                </>
              )}
            </Button>

            {testResult && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyJson}
                className="gap-1.5 text-xs text-muted-foreground h-9"
              >
                {copiedPayload ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedPayload ? "Copied" : "Copy JSON"}
              </Button>
            )}
          </div>

          {/* Test Result Display */}
          {testResult && (
            <div className="rounded-xl border border-border/80 bg-muted/40 p-4 space-y-3 animate-slide-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Engine Response
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-bold uppercase",
                    testResult.isQuestion !== false
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-600 border-rose-500/20",
                  )}
                >
                  {testResult.isQuestion !== false ? "Valid Question" : "Filtered / Error"}
                </Badge>
              </div>

              <pre className="max-h-52 overflow-auto rounded-lg bg-background p-3 text-[11px] font-mono leading-relaxed text-muted-foreground border border-border/60">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Scanner Configuration Controls */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Scanner Parameters</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Vision & Extraction Model</Label>
              <Select value={modelChoice} onValueChange={setModelChoice}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mistral-large-2411">Mistral Large 2411 (Default)</SelectItem>
                  <SelectItem value="mistral-small-latest">Mistral Small (Fast / Lower Cost)</SelectItem>
                  <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash (Backup)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Free User Daily Scans</Label>
              <Input
                type="number"
                value={freeUserLimit}
                onChange={(e) => setFreeUserLimit(e.target.value)}
                className="h-9 text-xs"
              />
              <span className="text-[10px] text-muted-foreground">
                Premium users have unlimited camera scans.
              </span>
            </div>

            <div className="pt-2 border-t border-border/60">
              <Button
                size="sm"
                className="w-full h-9 text-xs"
                onClick={() =>
                  toast({
                    title: "Settings Applied",
                    description: "AI Scanner parameters updated.",
                  })
                }
              >
                Save Scanner Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Scan Audit Logs ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Recent Scan Activity Logs</h3>
            <p className="text-xs text-muted-foreground">Audit trail of student question capture attempts</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search phone or text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Stream</th>
                <th className="py-3 px-4">Raw OCR Snippet</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/40 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-foreground">{log.studentName}</p>
                    <p className="text-[11px] text-muted-foreground">{log.studentPhone}</p>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        log.stream === "Natural Science"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-violet-500/10 text-violet-600 dark:text-violet-400",
                      )}
                    >
                      {log.stream}
                    </span>
                  </td>
                  <td className="py-3 px-4 max-w-xs truncate text-muted-foreground">
                    {log.rawTextPreview}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-bold uppercase",
                        log.status === "success" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                        log.status === "rejected" && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                        log.status === "error" && "bg-rose-500/10 text-rose-600 border-rose-500/20",
                      )}
                    >
                      {log.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground whitespace-nowrap font-mono">
                    {log.latencyMs}ms
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary"
                      onClick={() => setInspectLog(log)}
                    >
                      Inspect <ArrowUpRight className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Inspection Modal ── */}
      {inspectLog && (
        <Dialog open={!!inspectLog} onOpenChange={(v) => !v && setInspectLog(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ScanText className="h-5 w-5 text-primary" />
                Scan Payload Inspection: {inspectLog.id}
              </DialogTitle>
              <DialogDescription>
                Submitted by {inspectLog.studentName} ({inspectLog.studentPhone})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Raw Device OCR Text
                </Label>
                <div className="mt-1 p-3 rounded-lg bg-muted/60 font-mono text-[11px] leading-relaxed text-foreground border border-border/60">
                  {inspectLog.rawTextPreview}
                </div>
              </div>

              {inspectLog.extractedQuestion && (
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Extracted Question
                  </Label>
                  <p className="mt-1 text-foreground font-medium">
                    {inspectLog.extractedQuestion}
                  </p>
                </div>
              )}

              {inspectLog.extractedAnswer && (
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Calculated Solution
                  </Label>
                  <p className="mt-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    {inspectLog.extractedAnswer}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/60">
                <div>
                  <span className="text-muted-foreground">Tokens Billed:</span>{" "}
                  <span className="font-semibold text-foreground">{inspectLog.tokensUsed}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Engine Latency:</span>{" "}
                  <span className="font-semibold text-foreground">{inspectLog.latencyMs} ms</span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
