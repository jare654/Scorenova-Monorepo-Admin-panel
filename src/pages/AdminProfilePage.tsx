import React from "react";
import {
  User,
  Mail,
  ShieldCheck,
  Clock,
  Edit,
  LogOut,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/auth/context/AuthContext";
import { useNavigate } from "react-router-dom";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "Super Admin" | "Content Manager" | "Support";
  lastLogin: string;
}

const AdminProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Super Admin":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "Content Manager":
        return "bg-primary/10 text-primary border-primary/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
            <User className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {user?.name ?? "—"}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant="outline"
                className={getRoleColor(user?.role ?? "")}
              >
                {user?.role ?? "—"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                ID: {user?.id ?? "—"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" /> Edit Profile
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Account Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Personal and contact details for your admin account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email Address
                </p>
                <p className="text-sm font-semibold">{user?.email ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Permissions
                </p>
                <p className="text-sm font-semibold">Full System Access</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Last Login
                </p>
                <p className="text-sm font-semibold">
                  {user?.lastLogin
                    ? new Date(user.lastLogin).toLocaleString()
                    : "—"}
                </p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Security Settings</h4>
              <p className="text-xs text-muted-foreground">
                Two-factor authentication is currently{" "}
                <span className="text-green-600 font-bold">Enabled</span>.
              </p>
              <Button variant="link" className="p-0 h-auto text-xs">
                Change Password
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Side Stats/Quick Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Activity Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  Questions Created
                </span>
                <span className="text-sm font-bold">124</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  Reviews Pending
                </span>
                <span className="text-sm font-bold text-orange-500">12</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  Resolved Tickets
                </span>
                <span className="text-sm font-bold text-green-600">89</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminProfilePage;
