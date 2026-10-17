import React, { useState } from 'react';
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
  Image,
  FileText,
  HelpCircle,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Activity,
  CheckCircle2,
  FileCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navGroups = [
    {
      title: 'Core Operations',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/applications', label: 'Recruitment Queue', icon: FileCheck },
        { to: '/employers', label: 'Employers', icon: Building2 },
        { to: '/jobs', label: 'Job Postings', icon: Briefcase },
        { to: '/enquiries', label: 'Contact Enquiries', icon: HelpCircle },
      ]
    },
    {
      title: 'Catalog & Master Data',
      items: [
        { to: '/categories', label: 'Job Categories', icon: FolderTree },
        { to: '/skills', label: 'Skills Catalog', icon: Wrench },
        { to: '/locations', label: 'Locations', icon: MapPin },
        { to: '/banners', label: 'Homepage Banners', icon: Image },
        { to: '/cms', label: 'CMS Pages', icon: FileText },
      ]
    },
    {
      title: 'Governance & Analytics',
      items: [
        { to: '/team', label: 'Team Members', icon: Users },
        { to: '/activity', label: 'Recruitment Activity', icon: Activity },
        { to: '/reports', label: 'Operational Reports', icon: BarChart3 },
        { to: '/settings', label: 'Platform Settings', icon: Settings },
      ]
    }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleLabel = () => {
    if (user?.is_main_admin || user?.role === 'main_admin') return 'Main Admin';
    if (user?.role === 'hr_manager') return 'HR Manager';
    if (user?.role === 'recruiter') return 'Recruiter';
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
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation - Desktop */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-white border-r border-slate-200 p-4 space-y-6 overflow-y-auto">
          {navGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {group.title}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-xs flex">
            <div className="w-72 bg-white border-r border-slate-200 p-4 flex flex-col space-y-6 h-full overflow-y-auto shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-2">
                <span className="text-sm font-bold text-slate-900">Admin Navigation</span>
                <button onClick={() => setMobileMenuOpen(false)} className="text-slate-500 hover:text-slate-900">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {navGroups.map((group, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {group.title}
                  </div>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                            isActive
                              ? 'bg-blue-600 text-white font-semibold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Workspace Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-[#f8f9ff]">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

