import { DollarSign, Smartphone, Building2, Globe, Users, Clock, TrendingDown, BarChart3 } from "lucide-react";
import KPICard from "@/components/KPICard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { revenueData, mockTransactions } from "@/data/mockData";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";

const COLORS = ["hsl(224,76%,33%)", "hsl(173,58%,39%)", "hsl(24,95%,53%)"];

const paymentBreakdown = [
  { name: "Telebirr", value: 28456 },
  { name: "CBE Birr", value: 12345 },
  { name: "M-Pesa", value: 4877 },
];

const statusStyles: Record<string, string> = {
  Success: "bg-success/10 text-success border-success/20",
  Pending: "bg-warning/10 text-warning border-warning/20",
  Failed: "bg-destructive/10 text-destructive border-destructive/20",
};

const PaymentsPage = () => {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard title="Total Revenue" value="45,678 ETB" trend={21} icon={DollarSign} />
        <KPICard title="Telebirr" value="28,456 ETB" trend={23} icon={Smartphone} iconColor="text-primary-light" />
        <KPICard title="CBE Birr" value="12,345 ETB" trend={12} icon={Building2} iconColor="text-secondary" />
        <KPICard title="M-Pesa" value="4,877 ETB" trend={45} icon={Globe} iconColor="text-accent" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="min-w-0 rounded-lg border bg-card p-4 shadow-sm sm:p-6 lg:col-span-2">
          <h3 className="mb-4 font-semibold text-card-foreground">Revenue Trend (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={isMobile ? 220 : 300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
              <XAxis dataKey="day" tick={{ fontSize: isMobile ? 10 : 12 }} interval={isMobile ? 6 : 4} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="hsl(224,76%,33%)" strokeWidth={2} dot={false} name="Total" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="min-w-0 rounded-lg border bg-card p-4 shadow-sm sm:p-6">
          <h3 className="mb-4 font-semibold text-card-foreground">Payment Methods</h3>
          <ResponsiveContainer width="100%" height={isMobile ? 220 : 250}>
            <PieChart>
              <Pie data={paymentBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {paymentBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Subscription Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard title="Active Premium" value="2,345" icon={Users} iconColor="text-success" />
        <KPICard title="Trials (expiring 3d)" value="890" icon={Clock} iconColor="text-warning" />
        <KPICard title="Churn Rate" value="4.5%" icon={TrendingDown} iconColor="text-destructive" />
        <KPICard title="MRR" value="356,789 ETB" icon={BarChart3} iconColor="text-secondary" />
      </div>

      {/* Transactions Table */}
      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="border-b p-4">
          <h3 className="font-semibold">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="p-3 text-left font-medium text-muted-foreground">User</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Amount</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Method</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {mockTransactions.slice(0, 15).map((tx) => (
                <tr key={tx.id} className="border-b transition-colors hover:bg-muted/30">
                  <td className="p-3 text-muted-foreground">{new Date(tx.date).toLocaleDateString()}</td>
                  <td className="p-3 font-medium">{tx.userName}</td>
                  <td className="p-3">{tx.amount} ETB</td>
                  <td className="p-3">{tx.method}</td>
                  <td className="p-3"><Badge variant="outline" className={statusStyles[tx.status]}>{tx.status}</Badge></td>
                  <td className="p-3">
                    {tx.status === "Success" && <Button variant="ghost" size="sm" className="text-xs">Refund</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentsPage;
