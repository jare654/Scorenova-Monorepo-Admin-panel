import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";
import { cn } from "@/lib/utils";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/questions": "Question Bank",
  "/questions/new": "Add Question",
  "/users": "User Management",
  "/payments": "Payments & Revenue",
  "/ai-usage": "AI Usage & Costs",
  "/analytics": "Analytics Reports",
  "/settings": "System Settings",
};

const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const title = pageTitles[location.pathname] || "Dashboard";

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-foreground/20 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden">
          <AppSidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
        </div>
      )}

      <div className={cn("transition-all duration-300", collapsed ? "lg:ml-16" : "lg:ml-64")}>
        <AppHeader title={title} onMenuClick={() => setMobileOpen(!mobileOpen)} />
        <main className="p-6 max-w-screen-2xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

