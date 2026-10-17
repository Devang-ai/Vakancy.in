import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

/**
 * Standardized Employer Workspace Sidebar
 * 
 * Features:
 * - Single consistent sidebar across all Employer Workspace pages
 * - 3 primary navigation items: Dashboard, Jobs, Company Profile
 * - Notification bell with real backend data (NOTIFICATION table)
 * - Business rule: candidate identity is NEVER exposed before admin grants access
 * - Compact Employer Account card with real database company info
 * - Responsive mobile drawer support
 */

// Map notification types to icon colors
const NOTIF_TYPE_STYLES = {
  new_application: { bg: 'bg-blue-50', icon: '📨', dot: 'bg-blue-500' },
  multiple_applications: { bg: 'bg-indigo-50', icon: '📬', dot: 'bg-indigo-500' },
  recruitment_contact: { bg: 'bg-amber-50', icon: '📞', dot: 'bg-amber-500' },
  recruitment_in_progress: { bg: 'bg-purple-50', icon: '⚙️', dot: 'bg-purple-500' },
  candidate_access_granted: { bg: 'bg-green-50', icon: '✅', dot: 'bg-green-500' },
  default: { bg: 'bg-slate-50', icon: '🔔', dot: 'bg-slate-400' },
};

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch (_) {
    return '';
  }
}

export default function EmployerSidebar({ sidebarOpen, setSidebarOpen, logoUrl: propLogoUrl }) {
  const location = useLocation();
  const { user, profile } = useAuth();
  const { notifications, unreadCount, markAllRead, markAsRead } = useNotifications();

  const [logoError, setLogoError] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

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

  // Close notification dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen]);

  // Filter only employer notifications (the NOTIFICATION table is user-scoped by userId)
  // Candidate data is never exposed — notification messages are pre-sanitized by backend
  const recentNotifs = notifications.slice(0, 20);
  const newNotifs = recentNotifs.filter(n => !n.is_read);
  const earlierNotifs = recentNotifs.filter(n => n.is_read);

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
        className={`fixed top-0 left-0 h-full w-72 bg-white z-[110] flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-r border-slate-100 transform transition-transform duration-200 ease-in-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* 1. Brand & Header */}
          <div className="h-16 px-4 flex items-center justify-between bg-white border-b border-slate-100">
            <Link to="/recruiter" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#00288e] flex items-center justify-center text-white font-bold text-base shadow-sm">
                V
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base text-[#0b1c30] leading-tight tracking-tight">
                  Vakancy<span className="text-[#006a61]">.in</span>
                </span>
                <span className="text-[10px] uppercase text-[#00288e] font-bold tracking-wider">
                  Employer Workspace
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-1.5">
              {/* Notification Bell */}
              <div ref={notifRef} className="relative">
                <button
                  type="button"
                  id="employer-notif-bell"
                  aria-label="Notifications"
                  onClick={() => setNotifOpen(o => !o)}
                  className="relative p-1.5 rounded-lg text-[#444653] hover:bg-slate-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {notifOpen && (
                  <div className="absolute left-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-[200] overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-sm font-bold text-[#0b1c30]">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => { markAllRead(); }}
                          className="text-[11px] font-semibold text-[#00288e] hover:text-[#006a61] transition-colors"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-80 overflow-y-auto">
                      {recentNotifs.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <div className="text-3xl mb-2">🔔</div>
                          <p className="text-xs text-[#757684] font-medium">No notifications yet</p>
                          <p className="text-[11px] text-[#9ca3af] mt-1">You'll see updates here when candidates apply to your jobs.</p>
                        </div>
                      ) : (
                        <>
                          {newNotifs.length > 0 && (
                            <div>
                              <div className="px-4 py-1.5 bg-slate-50">
                                <span className="text-[10px] font-bold text-[#00288e] uppercase tracking-wider">New</span>
                              </div>
                              {newNotifs.map(n => {
                                const style = NOTIF_TYPE_STYLES[n.type] || NOTIF_TYPE_STYLES.default;
                                return (
                                  <button
                                    key={n.id}
                                    type="button"
                                    onClick={() => markAsRead(n.id)}
                                    className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 ${style.bg}`}
                                  >
                                    <span className="text-base shrink-0 mt-0.5">{style.icon}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold text-[#0b1c30] leading-snug">{n.title}</p>
                                      <p className="text-[11px] text-[#444653] mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                                      <p className="text-[10px] text-[#9ca3af] mt-1">{formatRelativeTime(n.created_at)}</p>
                                    </div>
                                    <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${style.dot}`} />
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {earlierNotifs.length > 0 && (
                            <div>
                              <div className="px-4 py-1.5 bg-slate-50">
                                <span className="text-[10px] font-bold text-[#757684] uppercase tracking-wider">Earlier</span>
                              </div>
                              {earlierNotifs.map(n => {
                                const style = NOTIF_TYPE_STYLES[n.type] || NOTIF_TYPE_STYLES.default;
                                return (
                                  <div
                                    key={n.id}
                                    className="px-4 py-3 flex gap-3 border-b border-slate-50 opacity-70"
                                  >
                                    <span className="text-base shrink-0 mt-0.5">{style.icon}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-[#0b1c30] leading-snug">{n.title}</p>
                                      <p className="text-[11px] text-[#444653] mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                                      <p className="text-[10px] text-[#9ca3af] mt-1">{formatRelativeTime(n.created_at)}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Footer */}
                    {recentNotifs.length > 0 && (
                      <div className="px-4 py-2.5 border-t border-slate-100 text-center">
                        <p className="text-[10px] text-[#9ca3af]">
                          Candidate information is shared only after our recruitment team grants access.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile close button */}
              <button
                type="button"
                className="md:hidden p-1.5 rounded-lg text-[#444653] hover:bg-slate-100 transition-colors"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* 2. Compact Employer Account Card */}
          <div className="p-3">
            <Link
              to="/recruiter/company"
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
