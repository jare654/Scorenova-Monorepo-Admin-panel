import { createContext, useContext, useState } from "react";

type Notification = {
  id: number;
  title: string;
  time: string;
  type: string;
  unread: boolean;
};

type NotificationContextType = {
  notifications: Notification[];
  unreadCount: number;
  markAllAsRead: () => void;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

const initialNotifications: Notification[] = [
  {
    id: 1,
    title: "Abebe K. upgraded to premium",
    time: "2m ago",
    type: "success",
    unread: true,
  },
  {
    id: 2,
    title: "AI cost exceeded daily limit",
    time: "12m ago",
    type: "warning",
    unread: true,
  },
  {
    id: 3,
    title: "New user registrations: 234 today",
    time: "30m ago",
    type: "user",
    unread: true,
  },
];

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [notifications, setNotifications] = useState(initialNotifications);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAllAsRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside provider");
  return ctx;
};

