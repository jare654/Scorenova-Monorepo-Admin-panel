import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import AppHeader from "@/components/AppHeader";
import { cn } from "@/lib/utils";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/questions": "Question Bank",
  "/questions/new": "Add Question",
  "/users": "Students",
  "/payments": "Payments",
  "/analytics": "Analytics",
  "/settings": "Settings",
  "/admin-profile": "Profile",
  "/edit-profile": "Edit Profile",
  "/change-password": "Change Password",
};

const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const title = pageTitles[location.pathname] ?? "Dashboard";

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      {/* Sidebar */}
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
      />

      {/* Main content area */}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col transition-all duration-300",
          collapsed ? "lg:ml-16" : "lg:ml-64",
        )}
      >
        <AppHeader
          title={title}
          onMenuClick={() => setMobileOpen((prev) => !prev)}
        />
        <main className="flex-1 min-w-0 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
