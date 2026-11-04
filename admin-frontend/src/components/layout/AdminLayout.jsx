import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  FolderTree,
  Wrench,
  MapPin,
  HelpCircle,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Activity,
  CheckCircle2,
  FileCheck,
  PhoneCall
} from 'lucide-react';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import useModalA11y from '../../hooks/useModalA11y';

export const AdminLayout = () => {
  const { user, permissions, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newEnquiryCount, setNewEnquiryCount] = useState(0);

  useModalA11y(mobileMenuOpen, () => setMobileMenuOpen(false));

  useEffect(() => {
    fetchEnquiryCounts();
    const interval = setInterval(fetchEnquiryCounts, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchEnquiryCounts = async () => {
    try {
      const res = await API.get('/admin/enquiries/counts');
      if (res && res.success && typeof res.counts?.new === 'number') {
        setNewEnquiryCount(res.counts.new);
      }
    } catch (e) {
      // ignore
    }
  };

  const navGroups = [
    {
      title: 'Core Operations',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard' },
        { to: '/leads', label: 'BD Leads', icon: Building2, module: 'leads' },
        { to: '/applications', label: 'Recruitment Queue', icon: FileCheck, module: 'applications' },
        { to: '/employers', label: 'Employers', icon: Building2, module: 'employers' },
        { to: '/jobs', label: 'Job Postings', icon: Briefcase, module: 'jobs' },
        { to: '/callbacks', label: 'Callback Requests', icon: PhoneCall, module: 'jobs' },
        { to: '/enquiries', label: 'Contact Enquiries', icon: HelpCircle, module: 'enquiries' },
      ]
    },
    {
      title: 'Catalog & Master Data',
      items: [
        { to: '/categories', label: 'Job Categories', icon: FolderTree, module: 'settings' },
        { to: '/skills', label: 'Skills Catalog', icon: Wrench, module: 'settings' },
        { to: '/locations', label: 'Locations', icon: MapPin, module: 'settings' },
      ]
    },
    {
      title: 'Governance & Analytics',
      items: [
        { to: '/team', label: 'Team Members', icon: Users, module: 'team' },
        { to: '/activity', label: 'Recruitment Activity', icon: Activity, module: 'activity_log' },
        { to: '/reports', label: 'Operational Reports', icon: BarChart3, module: 'reports' },
        { to: '/settings', label: 'Platform Settings', icon: Settings, module: 'settings' },
      ]
    }
  ];

  const isPermissionBypassRole = user?.is_main_admin || ['director', 'main_admin'].includes(user?.role);
  const canView = (module) => isPermissionBypassRole || permissions.some(
    (permission) => permission.module === module && permission.action === 'view'
  );
  const visibleNavGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => canView(item.module)) }))
    .filter((group) => group.items.length > 0);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleLabel = () => {
    if (user?.is_main_admin || user?.role === 'main_admin') return 'Main Admin';
    if (user?.role === 'director') return 'Platform Director';
    if (user?.role === 'bd' || user?.role === 'bd_lead') return 'Business Development (BD)';
    if (user?.role === 'recruiter') return 'Recruiter';
    if (user?.role === 'tl_coordinator') return 'TL Coordinator';
    if (user?.role === 'hr_manager') return 'HR Manager';
    if (user?.role === 'hr_executive') return 'HR Executive';
    if (user?.role === 'viewer') return 'Read-Only Viewer';
    return 'System Administrator';
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            aria-label={mobileMenuOpen ? 'Close Admin navigation' : 'Open Admin navigation'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-800 flex items-center justify-center text-white shadow-xs font-bold text-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-slate-900 font-heading block">
                Vakancy<span className="text-blue-700">.in</span> Admin
              </span>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                Internal Recruitment Portal
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
            <span>{getRoleLabel()}</span>
          </div>

          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-slate-900 block">{user?.email || 'admin@vakancy.in'}</span>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">{getRoleLabel()}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
              title="Sign Out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden min-w-0">
        {/* Sidebar Navigation - Desktop */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-white border-r border-slate-200 p-4 space-y-6 overflow-y-auto">
          {visibleNavGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {group.title}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isEnquiries = item.to === '/enquiries';
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3 truncate">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {isEnquiries && newEnquiryCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-2xs shrink-0">
                        {newEnquiryCount}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex"
            role="dialog"
            aria-modal="true"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="w-72 max-w-[calc(100vw-2.5rem)] bg-white border-r border-slate-200 p-4 flex flex-col space-y-6 h-full max-h-[100dvh] overflow-y-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-2 shrink-0">
                <span className="text-sm font-bold text-slate-900">Admin Navigation</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-500 hover:text-slate-900 cursor-pointer p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 min-h-0 space-y-6 overflow-y-auto">
                {visibleNavGroups.map((group) => (
                  <div key={group.title} className="space-y-1">
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {group.title}
                    </div>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isEnquiries = item.to === '/enquiries';
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => setMobileMenuOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                              isActive
                                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`
                          }
                        >
                          <div className="flex items-center gap-3 truncate">
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </div>
                          {isEnquiries && newEnquiryCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-2xs shrink-0">
                              {newEnquiryCount}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Workspace Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-[#f8f9ff]">
          <div className="max-w-7xl mx-auto min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
