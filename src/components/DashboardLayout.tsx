import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import AppHeader from "@/components/AppHeader";
import { cn } from "@/lib/utils";

const routeMeta: Record<string, { title: string; section: string }> = {
  "/dashboard":          { title: "Overview Dashboard",     section: "Core" },
  "/analytics":          { title: "Platform Analytics",     section: "Core" },
  "/questions":          { title: "Question Bank",         section: "Curriculum" },
  "/questions/new":      { title: "Add New Question",      section: "Curriculum" },
  "/mock-exams":         { title: "Mock Exams",            section: "Curriculum" },
  "/practice":           { title: "Curriculum Practice",   section: "Curriculum" },
  "/flagged-questions":  { title: "Flagged Questions",     section: "Curriculum" },
  "/users":              { title: "Students Management",   section: "Management" },
  "/payments":           { title: "Transactions & Revenue",section: "Management" },
  "/reports":            { title: "User Feedback & Reports",section: "Management" },
  "/settings":           { title: "System Settings",       section: "System" },
  "/notification-test":  { title: "Push Notifications",    section: "System" },
  "/admin-profile":      { title: "Admin Profile",         section: "Account" },
  "/edit-profile":       { title: "Edit Profile",          section: "Account" },
  "/change-password":    { title: "Change Password",       section: "Account" },
};

const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const current = routeMeta[location.pathname] ?? {
    title: "Scorenova Admin",
    section: "Portal",
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-x-hidden">
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
          title={current.title}
          section={current.section}
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
