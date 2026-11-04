import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  FileCheck2,
  Bookmark,
  User,
  Bell,
  Sparkles,
  Settings,
  LogOut,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import BrandLogo from '../common/BrandLogo';

export default function CandidateSidebar({ counts: propCounts, isMobileOpen, setIsMobileOpen }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [counts, setCounts] = useState({
    applications: propCounts?.applications || 0,
    saved: propCounts?.saved || 0,
    notifications: propCounts?.notifications || 0
  });

  const fetchRealCounts = async () => {
    try {
      const res = await API.get('/candidates/me');
      if (res?.success && res.counts) {
        setCounts({
          applications: Number(res.counts.applications || 0),
          saved: Number(res.counts.saved || 0),
          notifications: Number(res.counts.notifications || 0)
        });
      }
    } catch {
      // Fallback silently if not loaded yet
    }
  };

  useEffect(() => {
    if (propCounts) {
      setCounts(prev => ({
        applications: propCounts.applications !== undefined ? Number(propCounts.applications) : prev.applications,
        saved: propCounts.saved !== undefined ? Number(propCounts.saved) : prev.saved,
        notifications: propCounts.notifications !== undefined ? Number(propCounts.notifications) : prev.notifications
      }));
    } else {
      fetchRealCounts();
    }

    const handleUpdate = () => fetchRealCounts();
    window.addEventListener('vakancy:candidate-counts-update', handleUpdate);
    return () => window.removeEventListener('vakancy:candidate-counts-update', handleUpdate);
  }, [propCounts]);

  const handleLogout = () => {
    setIsMobileOpen?.(false);
    logout();
    navigate('/login');
  };

  const navItemClass = (isActive) =>
    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-[#1e40af] text-white font-semibold shadow-sm shadow-blue-900/10'
        : 'text-[#444653] hover:bg-[#e5eeff] hover:text-[#0b1c30]'
    }`;

  const closeMobile = () => setIsMobileOpen?.(false);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 xl:hidden transition-opacity duration-300"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-white border-r border-[#e5eeff] z-50 flex flex-col justify-between select-none transition-transform duration-300 ease-in-out xl:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand Header */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-[#e5eeff]/60 bg-white">
            <div className="flex flex-col leading-tight">
              <BrandLogo to="/candidate/dashboard" size="sm" onClick={closeMobile} />
              <span className="text-[10px] font-bold text-[#444653] uppercase tracking-wider pl-9 -mt-1.5">Candidate Portal</span>
            </div>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={closeMobile}
              className="xl:hidden p-1.5 -mr-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* WORKSPACE SECTION */}
          <div className="px-3 pt-5">
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#444653]/80">Workspace</p>
            <nav className="flex flex-col gap-1">
              {/* Dashboard */}
              <NavLink
                to="/candidate/dashboard"
                id="nav-dashboard"
                onClick={closeMobile}
                className={({ isActive }) => navItemClass(isActive)}
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  <span>Dashboard</span>
                </div>
              </NavLink>

              {/* Find Jobs */}
              <NavLink
                to="/candidate/jobs"
                id="nav-find-jobs"
                onClick={closeMobile}
                className={({ isActive }) => navItemClass(isActive)}
              >
                <div className="flex items-center gap-3">
                  <Search className="w-4 h-4 shrink-0" />
                  <span>Find Jobs</span>
                </div>
              </NavLink>

              {/* Applications */}
              <NavLink
                to="/candidate/applications"
                id="nav-applications"
                onClick={closeMobile}
                className={({ isActive }) => navItemClass(isActive)}
              >
                <div className="flex items-center gap-3">
                  <FileCheck2 className="w-4 h-4 shrink-0" />
                  <span>Applications</span>
                </div>
                {counts.applications > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-[#e5eeff] text-[#00288e]">
                    {counts.applications}
                  </span>
                )}
              </NavLink>

              {/* Saved Jobs */}
              <NavLink
                to="/candidate/saved"
                id="nav-saved-jobs"
                onClick={closeMobile}
                className={({ isActive }) => navItemClass(isActive)}
              >
                <div className="flex items-center gap-3">
                  <Bookmark className="w-4 h-4 shrink-0" />
                  <span>Saved Jobs</span>
                </div>
                {counts.saved > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-[#e5eeff] text-[#00288e]">
                    {counts.saved}
                  </span>
                )}
              </NavLink>

              {/* My Profile */}
              <NavLink
                to="/candidate/profile"
                id="nav-profile"
                onClick={closeMobile}
                className={({ isActive }) => navItemClass(isActive)}
              >
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 shrink-0" />
                  <span>My Profile</span>
                </div>
              </NavLink>
            </nav>
          </div>

          {/* CAREER TOOLS SECTION */}
          <div className="px-3 pt-6">
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#444653]/80">Career Tools</p>
            <nav className="flex flex-col gap-1">
              {/* AI Resume Builder */}
              <NavLink
                to="/candidate/ai-builder"
                id="nav-ai-builder"
                onClick={closeMobile}
                className={({ isActive }) => navItemClass(isActive)}
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>AI Resume Builder</span>
                </div>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  AI
                </span>
              </NavLink>
            </nav>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-3 border-t border-[#e5eeff] flex flex-col gap-1 bg-[#fcfdff]">
          <NavLink
            to="/candidate/settings"
            id="nav-settings"
            onClick={closeMobile}
            className={({ isActive }) => navItemClass(isActive)}
          >
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4 shrink-0" />
              <span>Settings</span>
            </div>
          </NavLink>

          <button
            onClick={handleLogout}
            id="nav-logout"
            className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
