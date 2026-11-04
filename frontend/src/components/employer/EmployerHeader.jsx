import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

// Map notification types to icon colors
const NOTIF_TYPE_STYLES = {
  new_application: { bg: 'bg-blue-50', icon: '📨', dot: 'bg-[#00288e]' },
  multiple_applications: { bg: 'bg-indigo-50', icon: '📬', dot: 'bg-indigo-500' },
  recruitment_contact: { bg: 'bg-amber-50', icon: '📞', dot: 'bg-amber-500' },
  recruitment_in_progress: { bg: 'bg-purple-50', icon: '⚙️', dot: 'bg-purple-500' },
  candidate_access_granted: { bg: 'bg-emerald-50', icon: '✅', dot: 'bg-emerald-500' },
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

const EmployerHeader = ({ title, searchQuery, setSearchQuery, setSidebarOpen }) => {
  const { user, profile, logout } = useAuth();
  const notifCtx = useNotifications();
  const {
    notifications = [],
    unreadCount = 0,
    markAsRead = () => {},
    markAllRead = () => {}
  } = notifCtx || {};

  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const notifRef = useRef(null);

  // Close menus on route change
  useEffect(() => {
    setNotifOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setNotifOpen(false);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      const mobileDrawer = document.getElementById('employer-mobile-notif-drawer');
      if (mobileDrawer && mobileDrawer.contains(e.target)) {
        return;
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

  const userDisplayName = profile?.company_name && profile.company_name !== 'Pending Company Profile'
    ? profile.company_name
    : user?.company_name || user?.name || 'Employer Account';

  const logoUrl = profile?.company_logo || profile?.logo_url || user?.logo_url;
  
  const handleSearch = (e) => {
    const val = e.target.value;
    if (setSearchQuery) {
      setSearchQuery(val);
    } else {
      setLocalSearch(val);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter' && !setSearchQuery && localSearch.trim()) {
      navigate(`/recruiter/jobs?q=${encodeURIComponent(localSearch.trim())}`);
    }
  };

  const recentNotifs = notifications.slice(0, 25);
  const newNotifs = recentNotifs.filter(n => !n.is_read);
  const earlierNotifs = recentNotifs.filter(n => n.is_read);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] px-3 sm:px-6 flex items-center justify-between border-b border-slate-100">
      {/* Mobile hamburger & Title */}
      <div className="flex items-center gap-2 md:hidden min-w-0">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-1 rounded-lg text-[#444653] hover:bg-slate-100 shrink-0"
          aria-label="Open sidebar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {title && <span className="font-bold text-xs sm:text-sm text-[#0b1c30] truncate">{title}</span>}
      </div>

      {/* Spacer for desktop if needed */}
      <div className="flex-1 hidden md:block"></div>

      {/* Search Bar */}
      <div className="hidden sm:flex flex-[2] max-w-lg relative items-center">
        <svg className="w-4 h-4 text-[#444653] absolute left-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={setSearchQuery ? searchQuery : localSearch}
          onChange={handleSearch}
          onKeyDown={handleSearchSubmit}
          placeholder="Search by job title, location, or stack (⌘K)..."
          className="w-full pl-10 pr-12 py-2 bg-[#eff4ff] text-[#0b1c30] placeholder:text-[#444653] text-xs rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#1e40af] transition-all border border-transparent focus:border-[#1e40af]"
        />
        {(setSearchQuery ? searchQuery : localSearch) && (
          <button
            onClick={() => setSearchQuery ? setSearchQuery('') : setLocalSearch('')}
            className="absolute right-3 text-xs text-slate-400 hover:text-slate-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* Spacer to push right actions to the edge */}
      <div className="flex-1"></div>

      {/* Right Header Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Post a Job CTA */}
        <Link
          to="/recruiter/jobs/create"
          title="Post a Job"
          aria-label="Post a Job"
          className="inline-flex items-center gap-1.5 p-2 sm:px-3.5 sm:py-2 bg-[#00288e] text-white text-xs font-semibold rounded-xl shadow-xs hover:bg-[#1e40af] transition-colors shrink-0"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Post a Job</span>
        </Link>

        {/* Notifications Bell */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            id="employer-header-notif-bell"
            aria-label="Notifications"
            onClick={() => setNotifOpen(o => !o)}
            className="relative p-2 rounded-xl text-[#444653] hover:bg-[#eff4ff] hover:text-[#00288e] transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-[#ba1a1a] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none shadow-xs animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Desktop Dropdown */}
          {notifOpen && (
            <div className="hidden md:block absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-fade-in">
              <div className="px-4 py-3 bg-[#f8f9ff] border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#0b1c30]">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#00288e] text-[10px] font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllRead()}
                    className="text-xs font-semibold text-[#00288e] hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification Items List */}
              <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                {recentNotifs.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center">
                    <div className="w-10 h-10 rounded-xl bg-[#eff4ff] text-[#00288e] flex items-center justify-center mb-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    <p className="text-xs font-bold text-[#0b1c30]">No notifications yet</p>
                    <p className="text-[11px] text-[#444653] mt-0.5 max-w-[220px]">
                      You will receive alerts here when candidates apply to your posted jobs.
                    </p>
                  </div>
                ) : (
                  recentNotifs.map(n => {
                    const style = NOTIF_TYPE_STYLES[n.type] || NOTIF_TYPE_STYLES.default;
                    return (
                      <div
                        key={n.id}
                        onClick={() => !n.is_read && markAsRead(n.id)}
                        className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                          !n.is_read ? 'bg-blue-50/40 hover:bg-blue-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-lg shrink-0 mt-0.5">{style.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-bold text-[#0b1c30] truncate">{n.title}</h4>
                            {!n.is_read && <span className="w-2 h-2 rounded-full bg-[#00288e] shrink-0" />}
                          </div>
                          <p className="text-[11px] text-[#444653] mt-0.5 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {formatRelativeTime(n.created_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Slide-Over Drawer / Bottom Sheet */}
        {notifOpen && (
          <div id="employer-mobile-notif-drawer" className="md:hidden fixed inset-0 z-[200] flex flex-col justify-end">
            <div
              className="fixed inset-0 bg-[#0b1c30]/50 backdrop-blur-xs transition-opacity"
              onClick={() => setNotifOpen(false)}
            />
            <div className="relative w-full max-h-[85vh] bg-white rounded-t-3xl shadow-2xl flex flex-col z-[210] animate-slide-up overflow-hidden">
              {/* Drawer Drag handle */}
              <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto my-2 shrink-0" />
              
              {/* Header */}
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#0b1c30]">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#00288e] text-xs font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => markAllRead()}
                      className="text-xs font-semibold text-[#00288e] hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setNotifOpen(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 text-[#444653] flex items-center justify-center font-bold text-sm hover:bg-slate-200"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Mobile Notification List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
                {recentNotifs.length === 0 ? (
                  <div className="p-10 text-center flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-2xl bg-[#eff4ff] text-[#00288e] flex items-center justify-center mb-2">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    <p className="text-sm font-bold text-[#0b1c30]">No notifications yet</p>
                    <p className="text-xs text-[#444653] mt-1 max-w-[240px]">
                      You will receive alerts here when candidates apply to your posted jobs.
                    </p>
                  </div>
                ) : (
                  recentNotifs.map(n => {
                    const style = NOTIF_TYPE_STYLES[n.type] || NOTIF_TYPE_STYLES.default;
                    return (
                      <div
                        key={n.id}
                        onClick={() => !n.is_read && markAsRead(n.id)}
                        className={`p-3.5 rounded-xl flex items-start gap-3 transition-colors ${
                          !n.is_read ? 'bg-[#eff4ff]/60 border border-blue-100' : 'bg-white'
                        }`}
                      >
                        <span className="text-xl shrink-0 mt-0.5">{style.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-bold text-[#0b1c30]">{n.title}</h4>
                            {!n.is_read && <span className="w-2 h-2 rounded-full bg-[#00288e] shrink-0" />}
                          </div>
                          <p className="text-xs text-[#444653] mt-0.5 leading-relaxed">
                            {n.message}
                          </p>
                          <span className="text-[10px] text-slate-400 mt-1.5 block">
                            {formatRelativeTime(n.created_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        <div className="h-5 sm:h-6 w-px bg-slate-200" />

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-1.5 sm:gap-2 cursor-pointer p-1 rounded-xl hover:bg-[#eff4ff] transition-colors"
          >
            {logoUrl ? (
              <img src={logoUrl} alt={userDisplayName} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-slate-200 shrink-0" />
            ) : (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#00288e] text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                {userDisplayName.charAt(0)}
              </div>
            )}
            <div className="hidden lg:flex flex-col text-left min-w-0 max-w-[120px]">
              <span className="text-xs text-[#0b1c30] font-semibold leading-tight truncate">
                {userDisplayName}
              </span>
              <span className="text-[10px] text-[#444653] truncate">
                Primary Recruiter
              </span>
            </div>
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#444653] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-fade-in text-xs">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="font-semibold text-[#0b1c30] truncate">{userDisplayName}</p>
                <p className="text-[11px] text-[#444653] truncate">{user?.email}</p>
              </div>
              <Link
                to="/recruiter/company"
                className="block px-3 py-2 text-[#444653] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors"
                onClick={() => setUserMenuOpen(false)}
              >
                Company Profile
              </Link>
              <Link
                to="/recruiter/settings/security"
                className="block px-3 py-2 text-[#444653] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors"
                onClick={() => setUserMenuOpen(false)}
              >
                Change Password
              </Link>
              <Link
                to="/contact"
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2 text-[#444653] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors"
                onClick={() => setUserMenuOpen(false)}
              >
                Help & Support
              </Link>
              <div className="my-1 border-t border-slate-100" />
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="w-full text-left px-3 py-2 text-[#ba1a1a] hover:bg-red-50 font-semibold transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default EmployerHeader;
