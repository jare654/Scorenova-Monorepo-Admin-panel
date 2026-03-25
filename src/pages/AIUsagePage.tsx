import { AlertTriangle, DollarSign } from "lucide-react";
import KPICard from "@/components/KPICard";
import { aiCostData, aiModels } from "@/data/mockData";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { useState } from "react";

const COLORS = ["hsl(224,76%,33%)", "hsl(173,58%,39%)", "hsl(24,95%,53%)"];

const requestsByType = [
  { name: "Explanations", value: 65 },
  { name: "OCR", value: 25 },
  { name: "Generation", value: 10 },
];

const AIUsagePage = () => {
  const [freeLimit, setFreeLimit] = useState([10]);
  const [premiumLimit, setPremiumLimit] = useState([50]);

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
        <div>
          <p className="text-sm font-medium text-card-foreground">85% of daily AI budget used</p>
          <p className="text-xs text-muted-foreground">Projected to exceed limit by 6:00 PM. Consider adjusting rate limits.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Today's AI Cost" value="345 ETB" trend={5} icon={DollarSign} />
        <KPICard title="Total Requests" value="14,035" trend={12} icon={DollarSign} iconColor="text-secondary" />
        <KPICard title="Cache Hit Rate" value="67%" trend={8} icon={DollarSign} iconColor="text-success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-lg border p-6 shadow-sm">
          <h3 className="font-semibold text-card-foreground mb-4">Daily AI Cost Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={aiCostData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} interval={4} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="cost" stroke="hsl(24,95%,53%)" strokeWidth={2} dot={false} name="Cost (ETB)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <h3 className="font-semibold text-card-foreground mb-4">Requests by Type</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={requestsByType} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, value }) => `${name} ${value}%`}>
                {requestsByType.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Model Performance Table */}
      <div className="bg-card rounded-lg border shadow-sm overflow-x-auto">
        <div className="p-4 border-b"><h3 className="font-semibold">Model Performance</h3></div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left font-medium text-muted-foreground">Model</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Avg Latency</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Success Rate</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Cost/Request</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Daily Requests</th>
            </tr>
          </thead>
          <tbody>
            {aiModels.map((m) => (
              <tr key={m.name} className="border-b hover:bg-muted/30 transition-colors">
                <td className="p-3 font-medium">{m.name}</td>
                <td className="p-3">{m.avgLatency}</td>
                <td className="p-3">
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">{m.successRate}%</Badge>
                </td>
                <td className="p-3">{m.costPerRequest} ETB</td>
                <td className="p-3">{m.dailyRequests.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rate Limiting */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-card-foreground">Rate Limits — Free Users</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Daily Questions</span>
              <span className="font-medium">{freeLimit[0]}</span>
            </div>
            <Slider value={freeLimit} onValueChange={setFreeLimit} max={50} step={1} />
          </div>
        </div>
        <div className="bg-card rounded-lg border p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-card-foreground">Rate Limits — Premium Users</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Daily Questions</span>
              <span className="font-medium">{premiumLimit[0]}</span>
            </div>
            <Slider value={premiumLimit} onValueChange={setPremiumLimit} max={200} step={5} />
          </div>
        </div>
      </div>

      {/* Cache Analytics */}
      <div className="bg-card rounded-lg border p-6 shadow-sm">
        <h3 className="font-semibold text-card-foreground mb-4">Cache Analytics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="bg-muted rounded-lg p-4"><p className="text-2xl font-bold text-success">67%</p><p className="text-xs text-muted-foreground">Cache Hit Rate</p></div>
          <div className="bg-muted rounded-lg p-4"><p className="text-2xl font-bold text-card-foreground">9,403</p><p className="text-xs text-muted-foreground">Cached Responses</p></div>
          <div className="bg-muted rounded-lg p-4"><p className="text-2xl font-bold text-secondary">156 ETB</p><p className="text-xs text-muted-foreground">Cost Savings Today</p></div>
        </div>
      </div>
    </div>
  );
};

export default AIUsagePage;
