import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import EmployerSidebar from '../employer/EmployerSidebar';
import EmployerHeader from '../employer/EmployerHeader';

/**
 * EmployerLayout - Persistent Layout for Recruiter/Employer Portal
 * Prevents sidebar and header unmounting on navigation.
 */
export const EmployerLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const path = location.pathname;

  let title = 'Dashboard';
  let showSearch = false;
  if (path.includes('/company')) title = 'Company Profile';
  else if (path.includes('/onboarding')) title = 'Onboarding';
  else if (path.includes('/jobs/create')) title = 'Post a Job';
  else if (path.includes('/jobs') && path.includes('/applicants')) title = 'Manage Applicants';
  else if (path.includes('/jobs') && path.includes('/edit')) title = 'Edit Job';
  else if (path.includes('/jobs')) {
    title = 'Manage Jobs';
    showSearch = true;
  }
  else if (path.includes('/settings/security')) title = 'Security Settings';

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar */}
      <EmployerSidebar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        logoUrl=""
      />
      
      {/* Main Content Wrapper */}
      <div className="flex-1 md:pl-72 flex flex-col min-h-screen min-w-0">
        <EmployerHeader 
          title={title} 
          setSidebarOpen={setSidebarOpen}
          searchQuery={searchQuery}
          setSearchQuery={showSearch ? setSearchQuery : undefined}
        />
        <Outlet context={{ sidebarOpen, setSidebarOpen, searchQuery, setSearchQuery }} />
      </div>
    </div>
  );
};

export default EmployerLayout;
