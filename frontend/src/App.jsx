import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Layouts
import GuestLayout from './components/layout/GuestLayout';
import CandidateLayout from './components/layout/CandidateLayout';
import EmployerLayout from './components/layout/EmployerLayout';

// Route Protection
import ProtectedRoute from './components/common/ProtectedRoute';

// Guest Portal Pages (Phase 1 Foundation)
import HomePage from './pages/guest/HomePage';
import JobSearchPage from './pages/guest/JobSearchPage';
import JobDetailPage from './pages/guest/JobDetailPage';
import CompaniesPage from './pages/guest/CompaniesPage';
import CompanyDetailPage from './pages/guest/CompanyDetailPage';
import AboutPage from './pages/guest/AboutPage';
import ContactPage from './pages/guest/ContactPage';
import ForEmployersPage from './pages/guest/ForEmployersPage';
import ExecutiveSearchPage from './pages/guest/ExecutiveSearchPage';
import PricingPage from './pages/guest/PricingPage';
import LoginPage from './pages/guest/LoginPage';
import RegisterPage from './pages/guest/RegisterPage';
import TermsPage from './pages/guest/TermsPage';
import PrivacyPage from './pages/guest/PrivacyPage';
import CandidateRegisterPage from './pages/guest/CandidateRegisterPage';
import EmployerRegisterPage from './pages/guest/EmployerRegisterPage';

// Candidate Portal Pages (Phase 2)
import CandidateDashboard from './pages/candidate/CandidateDashboard';
import CandidateFindJobsPage from './pages/candidate/CandidateFindJobsPage';
import CandidateJobDetailsPage from './pages/candidate/CandidateJobDetailsPage';
import CandidateApplicationWizardPage from './pages/candidate/CandidateApplicationWizardPage';
import CandidateApplicationReviewPage from './pages/candidate/CandidateApplicationReviewPage';
import CandidateApplicationSuccessPage from './pages/candidate/CandidateApplicationSuccessPage';
import CandidateApplicationsPage from './pages/candidate/CandidateApplicationsPage';
import CandidateSavedJobsPage from './pages/candidate/CandidateSavedJobsPage';
import CandidateProfilePage from './pages/candidate/CandidateProfilePage';
import CandidateResumePage from './pages/candidate/CandidateResumePage';
import CandidateAIResumeBuilderPage from './pages/candidate/CandidateAIResumeBuilderPage';
import CandidatePremiumPage from './pages/candidate/CandidatePremiumPage';
import CandidateCredentialVerificationPage from './pages/candidate/CandidateCredentialVerificationPage';
import CandidateOnboardingPage from './pages/candidate/CandidateOnboardingPage';
import CandidateNotificationsPage from './pages/candidate/CandidateNotificationsPage';
import CandidateSettingsPage from './pages/candidate/CandidateSettingsPage';
import CandidatePrivacyPage from './pages/candidate/CandidatePrivacyPage';
import EmployerDashboardPage from './pages/employer/EmployerDashboardPage';
import EmployerCompanyProfilePage from './pages/employer/EmployerCompanyProfilePage';
import EmployerOnboardingPage from './pages/employer/EmployerOnboardingPage';
import EmployerJobsPage from './pages/employer/EmployerJobsPage';
import EmployerCreateJobPage from './pages/employer/EmployerCreateJobPage';
import EmployerJobDescriptionPage from './pages/employer/EmployerJobDescriptionPage';
import EmployerScreeningQuestionsPage from './pages/employer/EmployerScreeningQuestionsPage';
import EmployerJobReviewPage from './pages/employer/EmployerJobReviewPage';
import EmployerApplicantsPage from './pages/employer/EmployerApplicantsPage';
import EmployerChangePasswordPage from './pages/employer/EmployerChangePasswordPage';

// Admin & Recruitment Operations Portal
import AdminLayout from './components/layout/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCandidates from './pages/admin/AdminCandidates';
import AdminJobs from './pages/admin/AdminJobs';
import AdminApplications from './pages/admin/AdminApplications';
import AdminCandidateSharing from './pages/admin/AdminCandidateSharing';
import AdminEnquiries from './pages/admin/AdminEnquiries';
import AdminEmployers from './pages/admin/AdminEmployers';
import AdminLeads from './pages/admin/AdminLeads';
import AdminTeam from './pages/admin/AdminTeam';
import AdminRoles from './pages/admin/AdminRoles';
import AdminActivity from './pages/admin/AdminActivity';
import SharedCandidateProfilePage from './pages/admin/SharedCandidateProfilePage';


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
              <Route path="/pricing" element={<PricingPage />} />
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
              <Route path="settings/security" element={<EmployerChangePasswordPage />} />
              <Route path="applicants" element={<Navigate to="/employer/jobs" replace />} />
              <Route path="*" element={<Navigate to="/employer" replace />} />
            </Route>

            {/* Confidential Client Shared Candidate Profile Link */}
            <Route path="/admin/share/:token" element={<SharedCandidateProfilePage />} />

            {/* PHASE 4: Admin & Recruitment Operations Portal */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole={['director', 'main_admin', 'admin', 'bd_lead', 'tl_coordinator', 'recruiter']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="candidates" element={<AdminCandidates />} />
              <Route path="jobs" element={<AdminJobs />} />
              <Route path="applications" element={<AdminApplications />} />
              <Route path="sharing" element={<AdminCandidateSharing />} />
              <Route path="enquiries" element={<AdminEnquiries />} />
              <Route path="employers" element={<AdminEmployers />} />
              <Route path="leads" element={<AdminLeads />} />
              <Route path="team" element={<AdminTeam />} />
              <Route path="roles" element={<AdminRoles />} />
              <Route path="activity" element={<AdminActivity />} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
