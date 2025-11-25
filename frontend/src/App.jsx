import React, { useEffect, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuthStore } from "./stores/authStore";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/LoginPage";

import SignupPage from "./pages/auth/SignupPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import TrainerDashboard from "./pages/dashboards/TrainerDashboard";
import LabManagerDashboard from "./pages/dashboards/LabManagerDashboard";
import PolicyMakerDashboard from "./pages/dashboards/PolicyMakerDashboard";
import ProfilePage from "./pages/ProfilePage";
import ChatbotPage from "./pages/ChatbotPage";
import HelpSupportPage from "./pages/HelpSupportPage";
import SLDPage from "./pages/SLDPage";
import ReportGenerationPage from "./pages/ReportGenerationPage";
import LabAnalyticsPage from "./pages/dashboards/LabAnalyticsPage";
import ReorderRequestsPage from "./pages/dashboards/ReorderRequestsPage";
import UserGuidePage from "./pages/UserGuidePage";

// Layout
import DashboardLayout from "./components/layout/DashboardLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";

function App() {
  const { checkAuth, isLoading, accessToken } = useAuthStore();
  const hasCheckedAuth = useRef(false);

  useEffect(() => {
    // CRITICAL FIX: Only check auth once on mount
    if (!hasCheckedAuth.current) {
      console.log("🚀 App mounted, checking auth...");
      hasCheckedAuth.current = true;
      checkAuth();
    }
  }, []); // checkAuth is stable from zustand

  // Show loading only on initial check and when we have a token
  // If no token, we can skip directly to rendering
  if (isLoading && accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {/* Protected Routes */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardRouter />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/chatbot" element={<ChatbotPage />} />
          <Route path="/help" element={<HelpSupportPage />} />
          <Route path="/sld" element={<SLDPage />} />
          <Route path="/user-guide" element={<UserGuidePage />} />
          <Route
            path="/dashboard/lab-analytics/:labId"
            element={<LabAnalyticsPage />}
          />
          <Route path="/reorder-requests" element={<ReorderRequestsPage />} />
          <Route path="/reports" element={<ReportGenerationPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function DashboardRouter() {
  const { user } = useAuthStore();

  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case "TRAINER":
      return <TrainerDashboard />;
    case "LAB_MANAGER":
      return <LabManagerDashboard />;
    case "POLICY_MAKER":
      return <PolicyMakerDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
}

export default App;