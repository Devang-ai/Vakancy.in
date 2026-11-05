import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import BrandLogo from '../common/BrandLogo';

/**
 * Standardized Employer Workspace Sidebar
 * 
 * Features:
 * - Single consistent sidebar across all Employer Workspace pages
 * - 3 primary navigation items: Dashboard, Jobs, Company Profile
 * - Single notification bell in header (NOTIFICATION table)
 * - Business rule: candidate identity is NEVER exposed before admin grants access
 * - Compact Employer Account card with real database company info
 * - Responsive mobile drawer support
 */

export default function EmployerSidebar({ sidebarOpen, setSidebarOpen, logoUrl: propLogoUrl }) {
  const location = useLocation();
  const { user, profile } = useAuth();

  const [logoError, setLogoError] = useState(false);

  const currentPath = location.pathname;

  // Active state determination
  const isDashboardActive = currentPath === '/recruiter' || currentPath === '/recruiter/dashboard';
  const isJobsActive = currentPath.startsWith('/recruiter/jobs');
  const isCompanyActive = currentPath.startsWith('/recruiter/company');

  // Company info from real authenticated user context
  const companyName = profile?.company_name || user?.company_name || 'Employer Account';
  const companyInitials = companyName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || 'EMP';

  const logoUrl = propLogoUrl || profile?.logo_url || user?.logo_url || null;

  useEffect(() => {
    setLogoError(false);
  }, [logoUrl]);

  // Verification only if actually verified in backend database
  const isVerified = Boolean(profile?.is_verified || profile?.approval_status === 'approved');

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-[#0b1c30]/40 z-40 md:hidden backdrop-blur-xs"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Sidebar Aside */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white z-50 md:z-20 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-r border-slate-100 transform transition-transform duration-200 ease-in-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* 1. Brand & Header */}
          <div className="h-16 px-4 flex items-center justify-between bg-white border-b border-slate-100">
            <div className="flex flex-col">
              <BrandLogo to="/recruiter" size="sm" />
              <span className="text-[10px] uppercase text-[#00288e] font-bold tracking-wider pl-8 -mt-1">
                Employer Workspace
              </span>
            </div>

            {/* Mobile close button */}
            <button
              type="button"
              className="md:hidden p-1.5 rounded-lg text-[#444653] hover:bg-slate-100 transition-colors cursor-pointer"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 2. Compact Employer Account Card */}
          <div className="p-3">
            <Link
              to="/recruiter/company"
              onClick={() => setSidebarOpen(false)}
              title="View & Edit Company Profile"
              className="p-2.5 rounded-xl bg-[#eff4ff] flex items-center justify-between hover:bg-[#e5eeff] transition-colors border border-blue-50/80"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#00288e] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs overflow-hidden">
                  {logoUrl && !logoError ? (
                    <img
                      src={logoUrl}
                      alt={companyName}
                      className="w-full h-full object-contain p-0.5 bg-white"
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    companyInitials
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-[#0b1c30] font-bold truncate">
                    {companyName}
                  </span>
                  {isVerified ? (
                    <span className="text-[11px] text-[#006a61] truncate flex items-center gap-1 font-semibold">
                      <svg className="w-3 h-3 text-[#006a61]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Verified Employer
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#757684] truncate">
                      Employer Account
                    </span>
                  )}
                </div>
              </div>
              <svg className="w-4 h-4 text-[#444653] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* 3. Section Title */}
          <div className="px-4 py-1.5">
            <span className="text-[11px] text-[#444653] font-bold tracking-wider uppercase px-2">
              Employer Dashboard
            </span>
          </div>

          {/* 4. Unified Navigation Items */}
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
            {/* Dashboard */}
            <Link
              to="/recruiter"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                isDashboardActive
                  ? 'bg-[#1e40af] text-white font-semibold shadow-xs'
                  : 'text-[#444653] hover:bg-[#dce9ff] hover:text-[#0b1c30] font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
                </svg>
                <span>Dashboard</span>
              </div>
              {isDashboardActive && <span className="w-1.5 h-1.5 rounded-full bg-[#86f2e4]" />}
            </Link>

            {/* Jobs */}
            <Link
              to="/recruiter/jobs"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                isJobsActive
                  ? 'bg-[#1e40af] text-white font-semibold shadow-xs'
                  : 'text-[#444653] hover:bg-[#dce9ff] hover:text-[#0b1c30] font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
                <span>Jobs</span>
              </div>
              {isJobsActive && <span className="w-1.5 h-1.5 rounded-full bg-[#86f2e4]" />}
            </Link>


            {/* Company Profile */}
            <Link
              to="/recruiter/company"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                isCompanyActive
                  ? 'bg-[#1e40af] text-white font-semibold shadow-xs'
                  : 'text-[#444653] hover:bg-[#dce9ff] hover:text-[#0b1c30] font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>Company Profile</span>
              </div>
              {isCompanyActive && <span className="w-1.5 h-1.5 rounded-full bg-[#86f2e4]" />}
            </Link>
          </nav>
        </div>
      </aside>
    </>
  );
}
