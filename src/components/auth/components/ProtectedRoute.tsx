import { Navigate } from "react-router-dom";
import { useAuth } from "@/components/auth/context/AuthContext";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, user, initialized } = useAuth();

  if (!initialized) {
    return null;
  }

  if (!token || user?.role !== "Super Admin") {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default ProtectedRoute;
