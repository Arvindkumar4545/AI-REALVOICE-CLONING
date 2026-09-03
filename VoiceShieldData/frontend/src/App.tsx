import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './store/AuthContext';
import { AlertProvider } from './store/AlertContext';

import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LiveAlertBanner } from './components/LiveAlertBanner';
import { OnboardingModal } from './components/OnboardingModal';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CyberBackground3D } from './three/CyberBackground3D';

import { LandingPage } from './pages/LandingPage';
import { DetectPage } from './pages/DetectPage';
import { DashboardPage } from './pages/DashboardPage';
import { ThreatMapPage } from './pages/ThreatMapPage';
import { VoiceprintsPage } from './pages/VoiceprintsPage';
import { CallsPage } from './pages/CallsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { PoliciesPage } from './pages/PoliciesPage';
import { ModelsPage } from './pages/ModelsPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { SecurityPage } from './pages/SecurityPage';
import { UseCasesPage } from './pages/UseCasesPage';
import { AboutPage } from './pages/AboutPage';
import { ReportScamPage } from './pages/ReportScamPage';
import { HistoryPage } from './pages/HistoryPage';
import { ProfilePage } from './pages/ProfilePage';
import { PrivacyCenterPage } from './pages/PrivacyCenterPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { InvestigationDashboardPage } from './pages/InvestigationDashboardPage';
import { CaseDetailsPage } from './pages/CaseDetailsPage';
import { RedTeamLabPage } from './pages/RedTeamLabPage';

export const App: React.FC = () => {
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('voiceshield-onboarding-completed') !== 'true';
    }
    return true;
  });

  return (
    <Router>
      <AuthProvider>
        <AlertProvider>
          {/* 3D background disabled for white theme */}
          <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
          <div className="min-h-screen bg-white text-gray-900 flex flex-col justify-between selection:bg-gray-300 selection:text-gray-900">
            <Navbar />
            <LiveAlertBanner />

            <main className="flex-grow">
              <Routes>
                {/* Public & Feature Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/detect" element={<DetectPage />} />
                <Route path="/voiceprints" element={<VoiceprintsPage />} />
                <Route path="/calls" element={<CallsPage />} />
                <Route path="/threats" element={<ThreatMapPage />} />
                <Route path="/threat-map" element={<ThreatMapPage />} />
                <Route path="/audit-log" element={<AuditLogPage />} />
                <Route path="/policies" element={<PoliciesPage />} />
                <Route path="/models" element={<ModelsPage />} />
                <Route path="/red-team" element={<RedTeamLabPage />} />
                <Route path="/features" element={<FeaturesPage />} />
                <Route path="/how-it-works" element={<HowItWorksPage />} />
                <Route path="/security" element={<SecurityPage />} />
                <Route path="/use-cases" element={<UseCasesPage />} />
                <Route path="/about" element={<AboutPage />} />

                {/* Operations & User History */}
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/report" element={<ReportScamPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/privacy" element={<PrivacyCenterPage />} />
                <Route path="/settings" element={<PrivacyCenterPage />} />

                {/* Authentication Routes */}
                <Route path="/signin" element={<SignInPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />

                {/* Protected User Profile */}
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />

                {/* Protected Admin Console */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <AdminDashboardPage />
                    </ProtectedRoute>
                  }
                />

                {/* Law Enforcement Investigation Mode */}
                <Route
                  path="/investigation"
                  element={
                    <ProtectedRoute>
                      <InvestigationDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/investigation/:id"
                  element={
                    <ProtectedRoute>
                      <CaseDetailsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            <Footer />
          </div>
        </AlertProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
