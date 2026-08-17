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
  Crown,
  BellRing,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const navItems = [
  { title: "Dashboard",    path: "/dashboard",   icon: LayoutDashboard },
  { title: "Question Bank",path: "/questions",   icon: FileQuestion },
  { title: "Mock Exams",   path: "/mock-exams",  icon: BookOpen },
  // { title: "Practice",     path: "/practice",    icon: Dumbbell },
  { title: "Students",     path: "/users",       icon: Users },
  { title: "Payments",     path: "/payments",    icon: CreditCard },
  { title: "Analytics",    path: "/analytics",          icon: BarChart3 },
  { title: "Reports",      path: "/reports",             icon: Flag },
  { title: "Settings",     path: "/settings",            icon: Settings },
  { title: "Notif. Test",  path: "/notification-test",   icon: BellRing },
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

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex items-center gap-3 border-b border-sidebar-border px-4 h-16",
          collapsed && "justify-center",
        )}
      >
        <img
          src="/Scorenova-logo.jpg"
          alt="Scorenova Logo"
          className="h-8 w-8 shrink-0 rounded-full border bg-white"
        />
        {!collapsed && (
          <div className="overflow-hidden">
            
            <h1 className="text-sm font-bold leading-tight">Scorenova</h1>
            <p className="text-xs text-sidebar-foreground/60">Ethiopia</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4 scrollbar-thin">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(item.path + "/");
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                collapsed && "justify-center px-2",
              )}
              title={collapsed ? item.title : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn(
            "w-full text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
            collapsed && "justify-center",
          )}
        >
          <ChevronLeft
            className={cn(
              "h-5 w-5 transition-transform",
              collapsed && "rotate-180",
            )}
          />
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
          "fixed left-0 top-0 z-40 hidden h-screen flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 lg:flex",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <SidebarContent collapsed={collapsed} onToggle={onToggle} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          className="w-[18rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground lg:hidden [&>button]:text-sidebar-foreground"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
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
