import { useEffect } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/components/ui/NotificationContext";

const getColor = (type: string) => {
  switch (type) {
    case "error":
      return "text-destructive";
    case "warning":
      return "text-yellow-500";
    case "success":
      return "text-green-500";
    default:
      return "text-muted-foreground";
  }
};

const NotificationsPage = () => {
  const { notifications, unreadCount, markAllAsRead } = useNotifications();

  // 🔥 Auto mark as read when opening page
  useEffect(() => {
    markAllAsRead();
  }, []);

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
          {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
        </h2>
      </div>

      {/* Empty state */}
      {notifications.length === 0 && (
        <div className="text-center text-muted-foreground py-10">
          No notifications yet
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-4 rounded-lg border flex items-start justify-between transition ${
              n.unread ? "bg-muted/50" : ""
            }`}
          >
            <div>
              <p className={`text-sm font-medium ${getColor(n.type)}`}>
                {n.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{n.time}</p>
            </div>

            {/* unread dot */}
            {n.unread && (
              <span className="h-2 w-2 rounded-full bg-primary mt-2" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationsPage;

