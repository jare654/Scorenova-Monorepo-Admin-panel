import { Menu, ChevronRight, CheckCircle2, User, Key, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth/context/AuthContext";

interface AppHeaderProps {
  title: string;
  section?: string;
  onMenuClick?: () => void;
}

const AppHeader = ({ title, section = "Portal", onMenuClick }: AppHeaderProps) => {
  const navigate = useNavigate();
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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/70 bg-card/85 px-4 backdrop-blur-md transition-all sm:px-6 shadow-xs">
      {/* ── Left: Menu trigger & Breadcrumbs ── */}
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-9 w-9 text-muted-foreground hover:text-foreground"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <span className="hover:text-foreground transition-colors hidden sm:inline">Scorenova</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 hidden sm:inline" />
          <span className="text-muted-foreground/80 hidden md:inline">{section}</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 hidden md:inline" />
          <h1 className="text-sm sm:text-base font-semibold text-foreground truncate tracking-tight">
            {title}
          </h1>
        </div>
      </div>

      {/* ── Right: Live Status & User Profile ── */}
      <div className="flex items-center gap-3 shrink-0">
        {/* API Status indicator */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          API Connected
        </div>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2.5 pl-2 pr-2.5 py-1.5 h-10 rounded-full hover:bg-muted/80 border border-transparent hover:border-border/60 transition-all"
            >
              <div className="h-7 w-7 rounded-full bg-primary/15 text-primary border border-primary/30 flex items-center justify-center text-xs font-bold shrink-0">
                {initials}
              </div>
              <div className="hidden md:flex flex-col text-left leading-none">
                <span className="text-xs font-semibold text-foreground">
                  {user?.name || "Admin"}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {user?.role || "Super Admin"}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-lg">
            <DropdownMenuLabel className="font-normal px-2 py-1.5">
              <p className="text-xs font-semibold text-foreground">{user?.name || "Admin"}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user?.email || "admin@scorenova.et"}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => navigate("/admin-profile")}
              className="text-xs cursor-pointer gap-2 py-2"
            >
              <User className="h-3.5 w-3.5 text-muted-foreground" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate("/change-password")}
              className="text-xs cursor-pointer gap-2 py-2"
            >
              <Key className="h-3.5 w-3.5 text-muted-foreground" /> Change Password
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate("/settings")}
              className="text-xs cursor-pointer gap-2 py-2"
            >
              <Settings className="h-3.5 w-3.5 text-muted-foreground" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-xs text-destructive focus:text-destructive cursor-pointer gap-2 py-2"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              <LogOut className="h-3.5 w-3.5" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AppHeader;
