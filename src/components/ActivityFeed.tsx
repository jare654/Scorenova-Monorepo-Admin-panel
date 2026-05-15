import type { ActivityItem } from "@/types";
import { ArrowUpCircle, AlertTriangle, Info, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, { icon: typeof Info; color: string }> = {
  upgrade: { icon: ArrowUpCircle, color: "text-success" },
  alert: { icon: AlertTriangle, color: "text-warning" },
  info: { icon: Info, color: "text-primary-light" },
  registration: { icon: UserPlus, color: "text-secondary" },
};

interface ActivityFeedProps {
  items: ActivityItem[];
}

const ActivityFeed = ({ items }: ActivityFeedProps) => {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm sm:p-6">
      <h3 className="mb-4 font-semibold text-card-foreground">Recent Activity</h3>
      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
            Activity will appear here once the backend feed is connected.
          </div>
        ) : (
          items.map((item) => {
            const { icon: Icon, color } = iconMap[item.type] || iconMap.info;
            return (
              <div key={item.id} className="flex items-start gap-3">
                <div className={cn("mt-0.5", color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-card-foreground">{item.message}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.time}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;

