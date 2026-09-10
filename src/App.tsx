import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { NotificationProvider } from "./components/ui/NotificationContext";
import { AuthProvider, useAuth } from "@/components/auth/context/AuthContext";
import ProtectedRoute from "./components/auth/components/ProtectedRoute";
import { AccountsProvider } from "@/components/auth/context/Accountcontext";
import { ErrorBoundary } from "./components/ErrorBoundary";

// ─── Code-split pages via React.lazy ──────────────────────────────────────────
const DashboardPage         = lazy(() => import("@/pages/DashboardPage"));
const QuestionsPage         = lazy(() => import("@/pages/QuestionsPage"));
const AddQuestionPage       = lazy(() => import("@/pages/AddQuestionPage"));
const AIScannerPage         = lazy(() => import("@/pages/AIScannerPage"));
const MockExamsPage         = lazy(() => import("@/pages/MockExamsPage"));
const PracticePage          = lazy(() => import("@/pages/PracticePage"));
const UsersPage             = lazy(() => import("@/pages/UsersPage"));
const PaymentsPage          = lazy(() => import("@/pages/PaymentsPage"));
const AnalyticsPage         = lazy(() => import("@/pages/AnalyticsPage"));
const SettingsPage          = lazy(() => import("@/pages/SettingsPage"));
const AdminProfilePage      = lazy(() => import("@/pages/AdminProfilePage"));
const EditProfilePage       = lazy(() => import("@/pages/EditProfilePage"));
const ChangePasswordPage    = lazy(() => import("@/pages/ChangePasswordPage"));
const NotificationTestPage  = lazy(() => import("@/pages/NotificationTestPage"));
const ReportsPage           = lazy(() => import("@/pages/ReportsPage"));
const FlaggedQuestionsPage  = lazy(() => import("@/pages/FlaggedQuestionsPage"));
const RolesPermissionsPage  = lazy(() => import("@/pages/RolesPermissionsPage"));
const FeedbackPage          = lazy(() => import("@/pages/FeedbackPage"));
const ExamSessionsPage      = lazy(() => import("@/pages/ExamSessionsPage"));
const DataMaintenancePage   = lazy(() => import("@/pages/DataMaintenancePage"));
const LoginPage             = lazy(() => import("@/pages/LoginPage"));
const NotFound              = lazy(() => import("@/pages/NotFound"));

const PageLoader = () => (
  <div className="flex h-[60vh] w-full items-center justify-center">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
      <span className="text-xs text-muted-foreground font-medium">Loading page…</span>
    </div>
  </div>
);

const AuthLandingRedirect = () => {
  const { token, initialized } = useAuth();

  if (!initialized) {
    return null;
  }

  return <Navigate to={token ? "/dashboard" : "/login"} replace />;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 0, // Always refetch after invalidation — ensures real-time updates
      retry: 1,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <NotificationProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<AuthLandingRedirect />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route
                    element={
                      <ProtectedRoute>
                        <AccountsProvider>
                          <DashboardLayout />
                        </AccountsProvider>
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/questions" element={<QuestionsPage />} />
                    <Route path="/questions/new" element={<AddQuestionPage />} />
                    <Route path="/ai-scanner" element={<AIScannerPage />} />
                    <Route path="/mock-exams" element={<MockExamsPage />} />
                    <Route path="/practice" element={<PracticePage />} />
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/exam-sessions" element={<ExamSessionsPage />} />
                    <Route path="/payments" element={<PaymentsPage />} />
                    <Route path="/feedback" element={<FeedbackPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/flagged-questions" element={<FlaggedQuestionsPage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/roles-permissions" element={<RolesPermissionsPage />} />
                    <Route path="/data-maintenance" element={<DataMaintenancePage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/admin-profile" element={<AdminProfilePage />} />
                    <Route path="/edit-profile" element={<EditProfilePage />} />
                    <Route path="/change-password" element={<ChangePasswordPage />} />
                    <Route path="/notification-test" element={<NotificationTestPage />} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </NotificationProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  </ErrorBoundary>
);

export default App;
