import React from "react";
import {
  User,
  Mail,
  ShieldCheck,
  Clock,
  Edit,
  LogOut,
  Phone,
  Loader2,
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
import { apiClient } from "@/services/api/client";
import { useQuery } from "@tanstack/react-query";

interface UserInfo {
  id: string;
  name: string;
  email: string;
  gender: string;
  type: string;
  fcmId: string;
  address: string | null;
  phoneNumber: string;
  role: {
    id: string;
    name: string;
    key: string;
  };
  permissions: string[];
}

const AdminProfilePage = () => {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();

  const { data: userInfo, isLoading } = useQuery<UserInfo>({
    queryKey: ["admin-user-info"],
    queryFn: ({ signal }) => apiClient.get<UserInfo>("/auth/get-user-info", signal),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

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

  const displayName = userInfo?.name ?? user?.name ?? "—";
  const displayRole = userInfo?.role?.name ?? user?.role ?? "—";
  const displayEmail = userInfo?.email ?? user?.email ?? "—";
  const displayPhone = userInfo?.phoneNumber ?? "—";
  const displayLastLogin = user?.lastLogin
    ? new Date(user.lastLogin).toLocaleString()
    : "—";

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
            <User className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={getRoleColor(displayRole)}>
                {displayRole}
              </Badge>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {displayPhone}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/edit-profile")}
            size="sm"
          >
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

      {/* Account Details — full width now, no side card */}
      <Card>
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
              <p className="text-sm font-semibold">{displayEmail}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> Phone Number
              </p>
              <p className="text-sm font-semibold">{displayPhone}</p>
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
              <p className="text-sm font-semibold">{displayLastLogin}</p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Security Settings</h4>
            <p className="text-xs text-muted-foreground">
              Two-factor authentication is currently{" "}
              <span className="text-green-600 font-bold">Enabled</span>.
            </p>
            <Button
              variant="link"
              onClick={() => navigate("/change-password")}
              className="p-0 h-auto text-xs"
            >
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminProfilePage;
