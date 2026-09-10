import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/components/auth/context/AuthContext";
import DashboardPage from "@/pages/DashboardPage";
import QuestionsPage from "@/pages/QuestionsPage";
import UsersPage from "@/pages/UsersPage";
import MockExamsPage from "@/pages/MockExamsPage";
import PracticePage from "@/pages/PracticePage";
import FlaggedQuestionsPage from "@/pages/FlaggedQuestionsPage";
import SettingsPage from "@/pages/SettingsPage";
import ReportsPage from "@/pages/ReportsPage";
import NotificationTestPage from "@/pages/NotificationTestPage";

import { AccountsProvider } from "@/components/auth/context/Accountcontext";
import AddQuestionPage from "@/pages/AddQuestionPage";
import AdminProfilePage from "@/pages/AdminProfilePage";
import ChangePasswordPage from "@/pages/ChangePasswordPage";
import EditProfilePage from "@/pages/EditProfilePage";

// Mock ResizeObserver
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe("Page rendering tests", () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const wrap = (component: React.ReactNode) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AccountsProvider>
          <MemoryRouter>{component}</MemoryRouter>
        </AccountsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );

  it("renders DashboardPage without crashing", () => {
    expect(() => render(wrap(<DashboardPage />))).not.toThrow();
  });

  it("renders AddQuestionPage without crashing", () => {
    expect(() => render(wrap(<AddQuestionPage />))).not.toThrow();
  });

  it("renders AdminProfilePage without crashing", () => {
    expect(() => render(wrap(<AdminProfilePage />))).not.toThrow();
  });

  it("renders ChangePasswordPage without crashing", () => {
    expect(() => render(wrap(<ChangePasswordPage />))).not.toThrow();
  });

  it("renders EditProfilePage without crashing", () => {
    expect(() => render(wrap(<EditProfilePage />))).not.toThrow();
  });

  it("renders QuestionsPage without crashing", () => {
    expect(() => render(wrap(<QuestionsPage />))).not.toThrow();
  });

  it("renders UsersPage without crashing", () => {
    expect(() => render(wrap(<UsersPage />))).not.toThrow();
  });

  it("renders MockExamsPage without crashing", () => {
    expect(() => render(wrap(<MockExamsPage />))).not.toThrow();
  });

  it("renders PracticePage without crashing", () => {
    expect(() => render(wrap(<PracticePage />))).not.toThrow();
  });

  it("renders FlaggedQuestionsPage without crashing", () => {
    expect(() => render(wrap(<FlaggedQuestionsPage />))).not.toThrow();
  });

  it("renders SettingsPage without crashing", () => {
    expect(() => render(wrap(<SettingsPage />))).not.toThrow();
  });

  it("renders ReportsPage without crashing", () => {
    expect(() => render(wrap(<ReportsPage />))).not.toThrow();
  });

  it("renders NotificationTestPage without crashing", () => {
    expect(() => render(wrap(<NotificationTestPage />))).not.toThrow();
  });
});
