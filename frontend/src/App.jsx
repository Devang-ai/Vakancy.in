import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Layouts
const GuestLayout = lazy(() => import('./components/layout/GuestLayout'));
const CandidateLayout = lazy(() => import('./components/layout/CandidateLayout'));
const EmployerLayout = lazy(() => import('./components/layout/EmployerLayout'));

// Route Protection
import ProtectedRoute from './components/common/ProtectedRoute';
import ScrollToTop from './components/common/ScrollToTop';
import ErrorBoundary from './components/common/ErrorBoundary';

// Guest Portal Pages (Phase 1 Foundation)
const HomePage = lazy(() => import('./pages/guest/HomePage'));
const JobSearchPage = lazy(() => import('./pages/guest/JobSearchPage'));
const JobDetailPage = lazy(() => import('./pages/guest/JobDetailPage'));
const CompaniesPage = lazy(() => import('./pages/guest/CompaniesPage'));
const CompanyDetailPage = lazy(() => import('./pages/guest/CompanyDetailPage'));
const AboutPage = lazy(() => import('./pages/guest/AboutPage'));
const ContactPage = lazy(() => import('./pages/guest/ContactPage'));
const ForEmployersPage = lazy(() => import('./pages/guest/ForEmployersPage'));
const ExecutiveSearchPage = lazy(() => import('./pages/guest/ExecutiveSearchPage'));
const PricingPage = lazy(() => import('./pages/guest/PricingPage'));
const LoginPage = lazy(() => import('./pages/guest/LoginPage'));
const RegisterPage = lazy(() => import('./pages/guest/RegisterPage'));
const TermsPage = lazy(() => import('./pages/guest/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/guest/PrivacyPage'));

// Candidate Portal Pages (Phase 2)
const CandidateDashboard = lazy(() => import('./pages/candidate/CandidateDashboard'));
const CandidateFindJobsPage = lazy(() => import('./pages/candidate/CandidateFindJobsPage'));
const CandidateJobDetailsPage = lazy(() => import('./pages/candidate/CandidateJobDetailsPage'));
const CandidateApplicationWizardPage = lazy(() => import('./pages/candidate/CandidateApplicationWizardPage'));
const CandidateApplicationReviewPage = lazy(() => import('./pages/candidate/CandidateApplicationReviewPage'));
const CandidateApplicationSuccessPage = lazy(() => import('./pages/candidate/CandidateApplicationSuccessPage'));
const CandidateApplicationsPage = lazy(() => import('./pages/candidate/CandidateApplicationsPage'));
const CandidateSavedJobsPage = lazy(() => import('./pages/candidate/CandidateSavedJobsPage'));
const CandidateProfilePage = lazy(() => import('./pages/candidate/CandidateProfilePage'));
const CandidateAIResumeBuilderPage = lazy(() => import('./pages/candidate/CandidateAIResumeBuilderPage'));
const CandidatePremiumPage = lazy(() => import('./pages/candidate/CandidatePremiumPage'));
const CandidateCredentialVerificationPage = lazy(() => import('./pages/candidate/CandidateCredentialVerificationPage'));
const CandidateOnboardingPage = lazy(() => import('./pages/candidate/CandidateOnboardingPage'));
const CandidateNotificationsPage = lazy(() => import('./pages/candidate/CandidateNotificationsPage'));
const CandidateSettingsPage = lazy(() => import('./pages/candidate/CandidateSettingsPage'));
const CandidatePrivacyPage = lazy(() => import('./pages/candidate/CandidatePrivacyPage'));
const EmployerDashboardPage = lazy(() => import('./pages/employer/EmployerDashboardPage'));
const EmployerCompanyProfilePage = lazy(() => import('./pages/employer/EmployerCompanyProfilePage'));
const EmployerOnboardingPage = lazy(() => import('./pages/employer/EmployerOnboardingPage'));
const EmployerJobsPage = lazy(() => import('./pages/employer/EmployerJobsPage'));
const EmployerCreateJobPage = lazy(() => import('./pages/employer/EmployerCreateJobPage'));
const EmployerJobDescriptionPage = lazy(() => import('./pages/employer/EmployerJobDescriptionPage'));
const EmployerScreeningQuestionsPage = lazy(() => import('./pages/employer/EmployerScreeningQuestionsPage'));
const EmployerJobReviewPage = lazy(() => import('./pages/employer/EmployerJobReviewPage'));
const EmployerApplicantsPage = lazy(() => import('./pages/employer/EmployerApplicantsPage'));
const EmployerChangePasswordPage = lazy(() => import('./pages/employer/EmployerChangePasswordPage'));

const LegacyAdminRedirect = lazy(() => import('./components/common/LegacyAdminRedirect'));
const SharedCandidateProfilePage = lazy(() => import('./pages/admin/SharedCandidateProfilePage'));
const ExecutiveSearchShortlistPage = lazy(() => import('./pages/executive/ExecutiveSearchShortlistPage'));

const RouteLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-white text-slate-600" role="status" aria-live="polite">
    Loading…
  </div>
);


/**
 * Vakancy.in Main Application Router
 * Follows Executive Precision architecture:
 * - Public Guest Portal (Phase 1)
 * - Candidate Portal (Phase 2 namespace placeholder)
 * - Recruiter/Employer Portal (Phase 3 namespace placeholder)
 * - Admin Portal: Deferred
 */
function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ScrollToTop />
          <ErrorBoundary>
            <Suspense fallback={<RouteLoading />}>
              <Routes>
            {/* PHASE 1: Guest / Public Portal Routes */}
            <Route element={<GuestLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/jobs" element={<JobSearchPage />} />
              <Route path="/jobs/:id" element={<JobDetailPage />} />
              <Route path="/companies" element={<CompaniesPage />} />
              <Route path="/companies/:id" element={<CompanyDetailPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/about-us" element={<AboutPage />} />
              <Route path="/for-employers" element={<ForEmployersPage />} />
              <Route path="/employers" element={<ForEmployersPage />} />
              <Route path="/executive-search" element={<ExecutiveSearchPage />} />
              <Route path="/executive" element={<ExecutiveSearchPage />} />
              <Route path="/pricing" element={<Navigate to="/for-employers" replace />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/contact-us" element={<ContactPage />} />
              <Route path="/privacy-policy" element={<PrivacyPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms-and-conditions" element={<TermsPage />} />
              <Route path="/terms-of-service" element={<TermsPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/trust-and-safety" element={<AboutPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/register/candidate" element={<Navigate to="/register?role=candidate" replace />} />
              <Route path="/register/employer" element={<Navigate to="/register?role=employer" replace />} />
            </Route>

            {/* PHASE 2: Candidate Portal — Protected (role: candidate) */}
            <Route
              path="/candidate/dashboard"
              element={
                <ProtectedRoute requiredRole="candidate">
                  <CandidateDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidate/jobs"
              element={
                <ProtectedRoute requiredRole="candidate">
                  <CandidateFindJobsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidate/jobs/:id"
              element={
                <ProtectedRoute requiredRole="candidate">
                  <CandidateJobDetailsPage />
                </ProtectedRoute>
              }
            />
            {/* Alias /candidate/job/:id to CandidateJobDetailsPage */}
            <Route
              path="/candidate/job/:id"
              element={
                <ProtectedRoute requiredRole="candidate">
                  <CandidateJobDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidate/jobs/:id/apply"
              element={
                <ProtectedRoute requiredRole="candidate">
                  <CandidateApplicationWizardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidate/jobs/:id/apply/review"
              element={
                <ProtectedRoute requiredRole="candidate">
                  <CandidateApplicationReviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidate/jobs/:id/apply/success"
              element={
                <ProtectedRoute requiredRole="candidate">
                  <CandidateApplicationSuccessPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidate/applications"
              element={
                <ProtectedRoute requiredRole="candidate">
                  <CandidateApplicationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidate/saved"
              element={
                <ProtectedRoute requiredRole="candidate">
                  <CandidateSavedJobsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidate/profile"
              element={
                <ProtectedRoute requiredRole="candidate">
                  <CandidateProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidate/resume"
              element={<Navigate to="/candidate/profile" replace />}
            />
            <Route
              path="/candidate/ai-builder"
              element={
                <ProtectedRoute requiredRole="candidate">
                  <CandidateAIResumeBuilderPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidate/premium"
              element={
                <ProtectedRoute requiredRole="candidate">
                  <CandidatePremiumPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidate/verification"
              element={
                <ProtectedRoute requiredRole="candidate">
                  <CandidateCredentialVerificationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidate/onboarding"
              element={
                <ProtectedRoute requiredRole="candidate">
                  <CandidateOnboardingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidate/notifications"
              element={
                <ProtectedRoute requiredRole="candidate">
                  <CandidateNotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidate/settings"
              element={
                <ProtectedRoute requiredRole="candidate">
                  <CandidateSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidate/privacy"
              element={
                <ProtectedRoute requiredRole="candidate">
                  <CandidatePrivacyPage />
                </ProtectedRoute>
              }
            />
            {/* Catch-all candidate sub-routes (placeholder for future Phase 2 screens) */}
            <Route
              path="/candidate/*"
              element={
                <ProtectedRoute requiredRole="candidate">
                  <CandidateLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/candidate/dashboard" replace />} />
            </Route>

            {/* PHASE 3: Employer / Recruiter Portal */}
            <Route 
              path="/recruiter" 
              element={
                <ProtectedRoute requiredRole={['employer', 'recruiter']}>
                  <EmployerLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<EmployerDashboardPage />} />
              <Route path="dashboard" element={<Navigate to="/recruiter" replace />} />
              <Route path="onboarding" element={<EmployerOnboardingPage />} />
              <Route path="company" element={<EmployerCompanyProfilePage />} />
              <Route path="jobs" element={<EmployerJobsPage />} />
              <Route path="jobs/create" element={<EmployerCreateJobPage />} />
              <Route path="jobs/:id/edit" element={<EmployerCreateJobPage />} />
              <Route path="jobs/:id/basic" element={<EmployerCreateJobPage />} />
              <Route path="jobs/:id/description" element={<EmployerJobDescriptionPage />} />
              <Route path="jobs/:id/screening" element={<EmployerScreeningQuestionsPage />} />
              <Route path="jobs/:id/review" element={<EmployerJobReviewPage />} />
              <Route path="jobs/:id/applicants" element={<EmployerApplicantsPage />} />
              <Route path="candidates" element={<Navigate to="/recruiter/jobs" replace />} />
              <Route path="settings/security" element={<EmployerChangePasswordPage />} />
              <Route path="applicants" element={<Navigate to="/recruiter/jobs" replace />} />
              <Route path="*" element={<Navigate to="/recruiter" replace />} />
            </Route>

            {/* Support /employer namespace */}
            <Route 
              path="/employer" 
              element={
                <ProtectedRoute requiredRole={['employer', 'recruiter']}>
                  <EmployerLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<EmployerDashboardPage />} />
              <Route path="dashboard" element={<Navigate to="/employer" replace />} />
              <Route path="onboarding" element={<EmployerOnboardingPage />} />
              <Route path="company" element={<EmployerCompanyProfilePage />} />
              <Route path="jobs" element={<EmployerJobsPage />} />
              <Route path="jobs/create" element={<EmployerCreateJobPage />} />
              <Route path="jobs/:id/edit" element={<EmployerCreateJobPage />} />
              <Route path="jobs/:id/basic" element={<EmployerCreateJobPage />} />
              <Route path="jobs/:id/description" element={<EmployerJobDescriptionPage />} />
              <Route path="jobs/:id/screening" element={<EmployerScreeningQuestionsPage />} />
              <Route path="jobs/:id/review" element={<EmployerJobReviewPage />} />
              <Route path="jobs/:id/applicants" element={<EmployerApplicantsPage />} />
              <Route path="candidates" element={<Navigate to="/recruiter/jobs" replace />} />
              <Route path="settings/security" element={<EmployerChangePasswordPage />} />
              <Route path="applicants" element={<Navigate to="/employer/jobs" replace />} />
              <Route path="*" element={<Navigate to="/employer" replace />} />
            </Route>

            {/* Confidential Client Shared Candidate Profile Link */}
            <Route path="/admin/share/:token" element={<SharedCandidateProfilePage />} />
            <Route path="/executive-search/shortlist/:token" element={<ExecutiveSearchShortlistPage />} />
            <Route path="/shared/shortlist/:token" element={<ExecutiveSearchShortlistPage />} />

            {/* Legacy internal Admin URLs now hand off to the canonical Admin app. */}
            <Route path="/leads" element={<LegacyAdminRedirect />} />
            <Route path="/admin/*" element={<LegacyAdminRedirect />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
          </Suspense>
          </ErrorBoundary>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
