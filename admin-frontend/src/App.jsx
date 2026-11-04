import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';

const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'));
const AdminLayout = lazy(() => import('./components/layout/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminTeamMembers = lazy(() => import('./pages/AdminTeamMembers'));
const AdminRecruitmentActivity = lazy(() => import('./pages/AdminRecruitmentActivity'));
const AdminApplications = lazy(() => import('./pages/AdminApplications'));
const AdminEmployers = lazy(() => import('./pages/AdminEmployers'));
const AdminJobs = lazy(() => import('./pages/AdminJobs'));
const AdminCategories = lazy(() => import('./pages/AdminCategories'));
const AdminSkills = lazy(() => import('./pages/AdminSkills'));
const AdminLocations = lazy(() => import('./pages/AdminLocations'));
const AdminBanners = lazy(() => import('./pages/AdminBanners'));
const AdminCMS = lazy(() => import('./pages/AdminCMS'));
const AdminCallbacks = lazy(() => import('./pages/AdminCallbacks'));
const AdminEnquiries = lazy(() => import('./pages/AdminEnquiries'));
const AdminReports = lazy(() => import('./pages/AdminReports'));
const AdminSettings = lazy(() => import('./pages/AdminSettings'));
const AdminLeads = lazy(() => import('./pages/AdminLeads'));

const RouteLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-white text-slate-600" role="status" aria-live="polite">
    Loading…
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<RouteLoading />}>
        <Routes>
          {/* Admin Authentication Screen */}
          <Route path="/login" element={<AdminLoginPage />} />

          {/* Standalone Admin Application Routes */}
          <Route
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
            <Route path="/admin/*" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<AdminDashboard />} />
            <Route path="/leads" element={<AdminLeads />} />
            <Route path="/applications" element={<AdminApplications />} />
            <Route path="/team" element={<AdminTeamMembers />} />
            <Route path="/activity" element={<AdminRecruitmentActivity />} />
            <Route path="/employers" element={<AdminEmployers />} />
            <Route path="/jobs" element={<AdminJobs />} />
            <Route path="/callbacks" element={<AdminCallbacks />} />
            <Route path="/categories" element={<AdminCategories />} />
            <Route path="/skills" element={<AdminSkills />} />
            <Route path="/locations" element={<AdminLocations />} />
            <Route path="/banners" element={<AdminBanners />} />
            <Route path="/cms" element={<AdminCMS />} />
            <Route path="/enquiries" element={<AdminEnquiries />} />
            <Route path="/reports" element={<AdminReports />} />
            <Route path="/settings" element={<AdminSettings />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
