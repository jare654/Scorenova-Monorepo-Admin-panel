import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Save, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/context/AuthContext";
import { apiClient } from "@/services/api/client";

const ChangePasswordPage = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validate = () => {
    if (!currentPassword || !password || !confirmPassword) {
      toast({
        title: "Missing fields",
        description: "Please fill in all password fields.",
        variant: "destructive",
      });
      return false;
    }

    if (password.length < 6) {
      toast({
        title: "Weak password",
        description: "New password must be at least 6 characters.",
        variant: "destructive",
      });
      return false;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "New password and confirm password do not match.",
        variant: "destructive",
      });
      return false;
    }

    if (currentPassword === password) {
      toast({
        title: "Invalid password",
        description: "New password must be different from current password.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);

    try {
      await apiClient.post("/auth/change-password", {
        currentPassword,
        password,
        confirmPassword,
      });

      toast({
        title: "Success",
        description: "Password changed successfully.",
      });

      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");

      navigate("/"); // or keep user on page if you want
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Change Password</h2>

        <Button variant="outline" onClick={() => navigate(-1)}>
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
      </div>

      <div className="bg-card border rounded-lg p-6 space-y-4">
        {/* Current Password */}
        <div>
          <Label>Current Password</Label>
          <div className="relative">
            <Input
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
            <button
              type="button"
              className="absolute right-2 top-2 text-muted-foreground"
              onClick={() => setShowCurrent((s) => !s)}
            >
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <Label>New Password</Label>
          <div className="relative">
            <Input
              type={showNew ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password (min. 8 characters)"
            />
            <button
              type="button"
              className="absolute right-2 top-2 text-muted-foreground"
              onClick={() => setShowNew((s) => !s)}
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Password strength meter */}
          {password && (
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Strength:</span>
                <span className="font-semibold" style={{
                  color: password.length < 8 ? "#ef4444" : /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{10,}$/.test(password) ? "#22c55e" : "#f59e0b"
                }}>
                  {password.length < 8 ? "Too Short" : /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{10,}$/.test(password) ? "Strong" : "Medium"}
                </span>
              </div>
              <div className="flex gap-1 h-1.5 w-full">
                <div className={`flex-1 rounded-full ${password.length >= 6 ? (password.length < 8 ? "bg-destructive" : "bg-warning") : "bg-muted"}`} />
                <div className={`flex-1 rounded-full ${password.length >= 8 ? (/[A-Z]/.test(password) && /\d/.test(password) ? "bg-warning" : "bg-muted") : "bg-muted"}`} />
                <div className={`flex-1 rounded-full ${password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password) ? "bg-success" : "bg-muted"}`} />
                <div className={`flex-1 rounded-full ${password.length >= 10 && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password) ? "bg-success" : "bg-muted"}`} />
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <div className="flex items-center justify-between">
            <Label>Confirm Password</Label>
            {confirmPassword && (
              <span className={`text-xs font-medium ${password === confirmPassword ? "text-success" : "text-destructive"}`}>
                {password === confirmPassword ? "✓ Passwords match" : "✗ Do not match"}
              </span>
            )}
          </div>
          <div className="relative mt-1.5">
            <Input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
            <button
              type="button"
              className="absolute right-2 top-2 text-muted-foreground"
              onClick={() => setShowConfirm((s) => !s)}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <Button className="w-full" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Change Password
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
