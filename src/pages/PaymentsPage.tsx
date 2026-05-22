import { useMemo, useState } from "react";
import { DollarSign } from "lucide-react";
import KPICard from "@/components/KPICard";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import { revenueData, mockTransactions } from "@/data/mockData";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  Success: "bg-success/10 text-success border-success/20",
  Pending: "bg-warning/10 text-warning border-warning/20",
  Failed:  "bg-destructive/10 text-destructive border-destructive/20",
};

const PIE_COLORS = [
  "hsl(224,76%,33%)",
  "hsl(173,58%,39%)",
  "hsl(24,95%,53%)",
  "hsl(38,92%,50%)",
];

const paymentBreakdown = [
  { name: "Telebirr", value: 28456 },
  { name: "CBE Birr", value: 12345 },
  { name: "M-Pesa",   value: 4877  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

const PaymentsPage = () => {
  const isMobile = useIsMobile();

  const [search, setSearch]             = useState("");
  const [page, setPage]                 = useState(1);
  const [methodFilter, setMethodFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const perPage = 10;

  // ── Derived ─────────────────────────────────────────────────────────────────

  const uniqueMethods = useMemo(
    () => Array.from(new Set(mockTransactions.map((t) => t.method))),
    [],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mockTransactions.filter((tx) => {
      if (q && !tx.userName.toLowerCase().includes(q)) return false;
      if (methodFilter !== "All" && tx.method !== methodFilter) return false;
      if (statusFilter !== "All" && tx.status !== statusFilter) return false;
      return true;
    });
  }, [search, methodFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated  = filtered.slice((page - 1) * perPage, page * perPage);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KPICard title="Total Revenue"   value="245,890 ETB" trend={18} icon={DollarSign} />
        <KPICard title="Today Revenue"   value="1,845 ETB"   trend={6}  icon={DollarSign} />
        <KPICard title="Monthly Revenue" value="45,678 ETB"  trend={21} icon={DollarSign} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">

        {/* Revenue Bar Chart */}
        <div className="min-w-0 rounded-lg border bg-card p-4 shadow-sm sm:p-6 lg:col-span-2">
          <h3 className="mb-4 font-semibold text-card-foreground">Revenue (Last 12 Months)</h3>
          <ResponsiveContainer width="100%" height={isMobile ? 220 : 300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: isMobile ? 10 : 12 }}
                interval={0}
                tickFormatter={(value: string) => value.slice(0, 3)}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="revenue" fill="hsl(224,76%,33%)" radius={[4, 4, 0, 0]} name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Methods Pie */}
        <div className="min-w-0 rounded-lg border bg-card p-4 shadow-sm sm:p-6">
          <h3 className="mb-4 font-semibold text-card-foreground">Payment Methods</h3>
          <ResponsiveContainer width="100%" height={isMobile ? 220 : 260}>
            <PieChart>
              <Pie
                data={paymentBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {paymentBreakdown.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip formatter={(v) => `${Number(v).toLocaleString()} ETB`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">

        {/* Table Header / Filters */}
        <div className="border-b p-4 flex items-center gap-3">
          <h3 className="font-semibold shrink-0">Recent Transactions</h3>

          <div className="flex items-center gap-3 ml-auto">
            {/* Search */}
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-[200px]"
            />

            {/* Method Filter */}
            <Select value={methodFilter} onValueChange={(v) => { setMethodFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Methods</SelectItem>
                {uniqueMethods.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Success">Success</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Student</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Amount</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Method</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Payment Status</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                paginated.map((tx) => (
                  <tr key={tx.id} className="border-b transition-colors hover:bg-muted/30">
                    <td className="p-3 text-muted-foreground">
                      {new Date(tx.date).toLocaleDateString()}
                    </td>
                    <td className="p-3 font-medium">{tx.userName}</td>
                    <td className="p-3">{tx.amount} ETB</td>
                    <td className="p-3">{tx.method}</td>
                    <td className="p-3">
                      <Badge variant="outline" className={STATUS_STYLES[tx.status]}>
                        {tx.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {tx.status === "Success" && (
                        <Button variant="outline" size="sm" className="text-xs">
                          Refund
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filtered.length === 0
              ? "No results"
              : `Showing ${(page - 1) * perPage + 1}–${Math.min(page * perPage, filtered.length)} of ${filtered.length}`}
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
      </div>
    </div>
  );
};

export default PaymentsPage;