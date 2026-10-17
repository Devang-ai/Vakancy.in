import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';

import AdminLoginPage from './pages/AdminLoginPage';
import AdminLayout from './components/layout/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import AdminTeamMembers from './pages/AdminTeamMembers';
import AdminRecruitmentActivity from './pages/AdminRecruitmentActivity';
import AdminApplications from './pages/AdminApplications';
import AdminEmployers from './pages/AdminEmployers';
import AdminJobs from './pages/AdminJobs';
import AdminCategories from './pages/AdminCategories';
import AdminSkills from './pages/AdminSkills';
import AdminLocations from './pages/AdminLocations';
import AdminBanners from './pages/AdminBanners';
import AdminCMS from './pages/AdminCMS';
import AdminEnquiries from './pages/AdminEnquiries';
import AdminReports from './pages/AdminReports';
import AdminSettings from './pages/AdminSettings';

function App() {
  return (
    <AuthProvider>
      <Router>
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
            <Route path="/dashboard" element={<AdminDashboard />} />
            <Route path="/applications" element={<AdminApplications />} />
            <Route path="/team" element={<AdminTeamMembers />} />
            <Route path="/activity" element={<AdminRecruitmentActivity />} />
            <Route path="/employers" element={<AdminEmployers />} />
            <Route path="/jobs" element={<AdminJobs />} />
            <Route path="/categories" element={<AdminCategories />} />
            <Route path="/skills" element={<AdminSkills />} />
            <Route path="/locations" element={<AdminLocations />} />
            <Route path="/banners" element={<AdminBanners />} />
            <Route path="/cms" element={<AdminCMS />} />
            <Route path="/enquiries" element={<AdminEnquiries />} />
            <Route path="/reports" element={<AdminReports />} />
            <Route path="/settings" element={<AdminSettings />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
