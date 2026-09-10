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
  badge?: string;
}

const KPICard = ({
  title,
  value,
  trend,
  trendLabel,
  icon: Icon,
  iconColor = "text-primary",
  badge,
}: KPICardProps) => {
  const isPositive = trend && trend > 0;

  return (
    <div className="group relative rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs transition-all duration-200 hover:border-primary/25 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground truncate">
              {title}
            </p>
            {badge && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                {badge}
              </span>
            )}
          </div>
          <p className="break-words text-2xl sm:text-3xl font-bold tracking-tight text-card-foreground">
            {value}
          </p>
          {trend !== undefined && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold",
                  isPositive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                )}
              >
                {isPositive ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {isPositive ? "+" : ""}
                {trend}%
              </span>
              {trendLabel && (
                <span className="text-[11px] text-muted-foreground">
                  {trendLabel}
                </span>
              )}
            </div>
          )}
        </div>
        <div
          className={cn(
            "rounded-xl p-2.5 sm:p-3 border border-border/50 bg-muted/50 transition-colors group-hover:bg-primary/10 group-hover:border-primary/20",
            iconColor,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

export default KPICard;
