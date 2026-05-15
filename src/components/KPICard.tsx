import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: number | string;
  trend?: number;
  trendLabel?: string;
  icon: LucideIcon;
  iconColor?: string;
}

const KPICard = ({
  title,
  value,
  trend,
  trendLabel,
  icon: Icon,
  iconColor = "text-primary",
}: KPICardProps) => {
  const isPositive = trend && trend > 0;

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5 lg:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="break-words text-2xl font-bold text-card-foreground sm:text-[1.75rem]">
            {value}
          </p>
          {trend !== undefined && (
            <div className="flex flex-wrap items-center gap-1">
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span
                className={cn(
                  "text-xs font-medium",
                  isPositive ? "text-success" : "text-destructive",
                )}
              >
                {isPositive ? "+" : ""}
                {trend}%
              </span>
              {trendLabel && (
                <span className="text-xs text-muted-foreground">
                  {trendLabel}
                </span>
              )}
            </div>
          )}
        </div>
        <div className={cn("rounded-lg bg-muted p-3", iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

export default KPICard;
