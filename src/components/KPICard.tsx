import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  trend?: number;
  trendLabel?: string;
  icon: LucideIcon;
  iconColor?: string;
}

const KPICard = ({ title, value, trend, trendLabel, icon: Icon, iconColor = "text-primary" }: KPICardProps) => {
  const isPositive = trend && trend > 0;

  return (
    <div className="bg-card rounded-lg border p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold text-card-foreground">{value}</p>
          {trend !== undefined && (
            <div className="flex items-center gap-1">
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span className={cn("text-xs font-medium", isPositive ? "text-success" : "text-destructive")}>
                {isPositive ? "+" : ""}{trend}%
              </span>
              {trendLabel && <span className="text-xs text-muted-foreground">{trendLabel}</span>}
            </div>
          )}
        </div>
        <div className={cn("p-3 rounded-lg bg-muted", iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

export default KPICard;
