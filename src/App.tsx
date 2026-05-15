import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import DashboardPage from "@/pages/DashboardPage";
import QuestionsPage from "@/pages/QuestionsPage";
import AddQuestionPage from "@/pages/AddQuestionPage";
import UsersPage from "@/pages/UsersPage";
import PaymentsPage from "@/pages/PaymentsPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";
import { NotificationProvider } from "./components/ui/NotificationContext";
import AdminProfilePage from "./pages/AdminProfilePage";
import LoginPage from "./pages/LoginPage";
import { AuthProvider } from "./components/auth/context/AuthContext";
import ProtectedRoute from "./components/auth/components/ProtectedRoute";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import EditProfilePage from "../src/pages/EditProfilePage";
import { AccountsProvider } from "./components/auth/context/Accountcontext";
import { useAuth } from "./components/auth/context/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

const AuthLandingRedirect = () => {
  const { token, initialized } = useAuth();

  if (!initialized) {
    return null;
  }

  return <Navigate to={token ? "/dashboard" : "/login"} replace />;
};

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <AuthProvider>
      <AccountsProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <NotificationProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<AuthLandingRedirect />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route
                    element={
                      <ProtectedRoute>
                        <DashboardLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/questions" element={<QuestionsPage />} />
                    <Route path="/questions/new" element={<AddQuestionPage />} />
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/payments" element={<PaymentsPage />} />

                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/admin-profile" element={<AdminProfilePage />} />
                    <Route path="/edit-profile" element={<EditProfilePage />} />
                    <Route
                      path="/change-password"
                      element={<ChangePasswordPage />}
                    />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </NotificationProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </AccountsProvider>
    </AuthProvider>
  </ErrorBoundary>
);

export default App;
