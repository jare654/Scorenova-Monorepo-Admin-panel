import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileQuestion,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  ChevronLeft,
  BookOpen,
  Dumbbell,
  BellRing,
  Flag,
  MessageSquareWarning,
  LogOut,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/components/auth/context/AuthContext";

interface NavGroup {
  label: string;
  items: {
    title: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[];
}

const navGroups: NavGroup[] = [
  {
    label: "Core",
    items: [
      { title: "Dashboard",        path: "/dashboard",        icon: LayoutDashboard },
      { title: "Analytics",        path: "/analytics",        icon: BarChart3 },
    ],
  },
  {
    label: "Curriculum",
    items: [
      { title: "Question Bank",    path: "/questions",        icon: FileQuestion },
      { title: "Mock Exams",       path: "/mock-exams",       icon: BookOpen },
      { title: "Practice",         path: "/practice",         icon: Dumbbell },
      { title: "Flagged Questions",path: "/flagged-questions",icon: Flag },
    ],
  },
  {
    label: "Management",
    items: [
      { title: "Students",         path: "/users",            icon: Users },
      { title: "Payments",         path: "/payments",         icon: CreditCard },
      { title: "User Reports",     path: "/reports",          icon: MessageSquareWarning },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Settings",         path: "/settings",         icon: Settings },
      { title: "Push Notifs",      path: "/notification-test",icon: BellRing },
    ],
  },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

const SidebarContent = ({
  collapsed,
  onToggle,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "AD";

  return (
    <div className="flex h-full flex-col justify-between select-none">
      {/* ── Top Header ── */}
      <div>
        <div
          className={cn(
            "flex items-center gap-3 border-b border-sidebar-border/60 px-4 h-16 transition-all",
            collapsed && "justify-center px-2",
          )}
        >
          <div className="relative flex shrink-0 items-center justify-center">
            <img
              src="/Scorenova-logo.jpg"
              alt="Scorenova"
              className="h-9 w-9 rounded-xl border border-white/20 bg-white shadow-sm object-cover"
            />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-sidebar-foreground tracking-tight">
                  Scorenova
                </span>
                <span className="inline-flex items-center rounded-md bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary-light">
                  Admin
                </span>
              </div>
              <p className="text-[11px] text-sidebar-foreground/50 truncate mt-0.5">
                National Exam Platform
              </p>
            </div>
          )}
        </div>

        {/* ── Nav Sections ── */}
        <nav className="space-y-6 px-3 py-4 overflow-y-auto max-h-[calc(100vh-10rem)] scrollbar-thin">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              {!collapsed && (
                <p className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 mb-1.5">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== "/" && location.pathname.startsWith(item.path + "/"));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-150",
                      isActive
                        ? "bg-primary/15 text-white font-semibold shadow-xs"
                        : "text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                      collapsed && "justify-center px-2 py-2.5",
                    )}
                    title={collapsed ? item.title : undefined}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary-light" />
                    )}
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive
                          ? "text-primary-light"
                          : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground",
                      )}
                    />
                    {!collapsed && (
                      <span className="truncate flex-1">{item.title}</span>
                    )}
                    {!collapsed && item.badge && (
                      <span className="ml-auto rounded-full bg-primary/20 px-1.5 py-0.2 text-[10px] font-semibold text-primary-light">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* ── Bottom: User Card & Collapse ── */}
      <div className="border-t border-sidebar-border/60 p-3 space-y-2">
        {!collapsed && (
          <div className="flex items-center gap-2.5 rounded-lg bg-sidebar-accent/50 p-2 text-sidebar-foreground">
            <div className="h-8 w-8 rounded-full bg-primary/25 border border-primary/40 flex items-center justify-center text-xs font-semibold text-primary-light shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="truncate text-xs font-semibold leading-tight">
                {user?.name || "Admin"}
              </p>
              <p className="truncate text-[10px] text-sidebar-foreground/50 mt-0.5">
                {user?.role || "Administrator"}
              </p>
            </div>
            <button
              onClick={() => logout()}
              title="Log out"
              className="rounded-md p-1 text-sidebar-foreground/40 hover:bg-white/10 hover:text-rose-400 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            "w-full h-8 text-sidebar-foreground/60 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground flex items-center justify-center text-xs gap-1.5",
            collapsed && "px-0",
          )}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              collapsed && "rotate-180",
            )}
          />
          {!collapsed && <span>Collapse menu</span>}
        </Button>
      </div>
    </div>
  );
};

const AppSidebar = ({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileOpenChange,
}: AppSidebarProps) => {
  return (
    <>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-screen flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border/60 transition-all duration-300 lg:flex shadow-xl",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <SidebarContent collapsed={collapsed} onToggle={onToggle} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          className="w-[18rem] border-r border-sidebar-border/60 bg-sidebar p-0 text-sidebar-foreground lg:hidden [&>button]:text-sidebar-foreground"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          <div className="flex h-full flex-col">
            <SidebarContent
              collapsed={false}
              onToggle={() => onMobileOpenChange(false)}
              onNavigate={() => onMobileOpenChange(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AppSidebar;
