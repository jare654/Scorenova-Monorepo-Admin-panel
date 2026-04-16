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
    <div className="bg-card rounded-lg border p-6 shadow-sm">
      <h3 className="font-semibold text-card-foreground mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {items.map((item) => {
          const { icon: Icon, color } = iconMap[item.type] || iconMap.info;
          return (
            <div key={item.id} className="flex items-start gap-3">
              <div className={cn("mt-0.5", color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-card-foreground">{item.message}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivityFeed;

