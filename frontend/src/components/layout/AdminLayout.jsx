import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileCheck,
  Share2,
  HelpCircle,
  Building2,
  TrendingUp,
  ShieldCheck,
  Activity,
  LogOut,
  Menu,
  X,
  ChevronRight,
  UserCheck,
  User,
  Settings,
  Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import ModalDialog from '../admin/ModalDialog';

export const AdminLayout = () => {
  const { user, logout, fetchUserContext } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ text: '', type: '' });

  // Self-service profile state
  const [selfProfile, setSelfProfile] = useState({
    name: '',
    email: '',
    phone: '',
    profile_photo_url: '',
    role: '',
    reporting_head_name: '',
    team_name: '',
    scope_type: ''
  });

  const userRole = (user?.role || '').toLowerCase();

  // Role display formatting
  const roleLabels = {
    director: 'Director (Main Admin)',
    main_admin: 'Director (Main Admin)',
    admin: 'Director (Main Admin)',
    bd_lead: 'BD Lead',
    tl_coordinator: 'TL / Coordinator',
    recruiter: 'Recruiter'
  };

  const currentRoleLabel = roleLabels[userRole] || 'Staff Member';

  // Navigation Items with role-based module filtering
  const navSections = [
    {
      title: 'Overview',
      items: [
        { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['director', 'main_admin', 'admin', 'bd_lead', 'tl_coordinator', 'recruiter'] }
      ]
    },
    {
      title: 'Recruitment Operations',
      items: [
        { to: '/admin/candidates', label: 'Candidates', icon: Users, roles: ['director', 'main_admin', 'admin', 'tl_coordinator', 'recruiter'] },
        { to: '/admin/jobs', label: 'Job Requisitions', icon: Briefcase, roles: ['director', 'main_admin', 'admin', 'tl_coordinator', 'recruiter'] },
        { to: '/admin/applications', label: 'Applications Pipeline', icon: FileCheck, roles: ['director', 'main_admin', 'admin', 'tl_coordinator', 'recruiter'] },
        { to: '/admin/sharing', label: 'Candidate Sharing', icon: Share2, roles: ['director', 'main_admin', 'admin', 'tl_coordinator', 'recruiter'] },
        { to: '/admin/enquiries', label: 'Recruitment Enquiries', icon: HelpCircle, roles: ['director', 'main_admin', 'admin', 'tl_coordinator'] }
      ]
    },
    {
      title: 'Business & Clients',
      items: [
        { to: '/admin/employers', label: 'Employers / Clients', icon: Building2, roles: ['director', 'main_admin', 'admin', 'tl_coordinator'] },
        { to: '/admin/leads', label: 'BD Leads', icon: TrendingUp, roles: ['director', 'main_admin', 'admin', 'bd_lead'] }
      ]
    },
    {
      title: 'Governance & Settings',
      items: [
        { to: '/admin/team', label: 'Team Management', icon: UserCheck, roles: ['director', 'main_admin', 'admin'] },
        { to: '/admin/roles', label: 'Roles & Permissions', icon: ShieldCheck, roles: ['director', 'main_admin', 'admin'] },
        { to: '/admin/activity', label: 'Activity Log', icon: Activity, roles: ['director', 'main_admin', 'admin', 'bd_lead', 'tl_coordinator', 'recruiter'] }
      ]
    }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const openProfileModal = async () => {
    setProfileMessage({ text: '', type: '' });
    setProfileModalOpen(true);
    try {
      setProfileLoading(true);
      const res = await API.get('/admin/profile/me');
      if (res.success && res.profile) {
        setSelfProfile({
          name: res.profile.name || '',
          email: res.profile.email || '',
          phone: res.profile.phone || '',
          profile_photo_url: res.profile.profile_photo_url || '',
          role: res.profile.role_display_name || res.profile.role,
          reporting_head_name: res.profile.reporting_head_name,
          team_name: res.profile.team_name,
          scope_type: res.profile.scope_type
        });
      }
    } catch (err) {
      console.warn('Error loading self profile:', err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileMessage({ text: '', type: '' });
    try {
      setProfileSaving(true);
      const res = await API.put('/admin/profile/me', {
        name: selfProfile.name.trim() || null,
        phone: selfProfile.phone.trim() || null,
        profile_photo_url: selfProfile.profile_photo_url.trim() || null
      });
      if (res.success) {
        setProfileMessage({ text: 'Profile updated successfully.', type: 'success' });
        if (typeof fetchUserContext === 'function') {
          fetchUserContext();
        }
      } else {
        setProfileMessage({ text: res.message || 'Failed to update profile.', type: 'error' });
      }
    } catch (err) {
      setProfileMessage({ text: err.message || 'Error updating profile.', type: 'error' });
    } finally {
      setProfileSaving(false);
    }
  };

  // Derive breadcrumb context
  const getPageTitle = () => {
    const p = location.pathname;
    if (p.includes('/dashboard')) return 'Dashboard Overview';
    if (p.includes('/candidates')) return 'Candidate Database';
    if (p.includes('/jobs')) return 'Job Requisitions & Requirements';
    if (p.includes('/applications')) return 'Applications & Screening Pipeline';
    if (p.includes('/sharing')) return 'Candidate Sharing & Client Approvals';
    if (p.includes('/enquiries')) return 'Contact & Executive Search Enquiries';
    if (p.includes('/employers')) return 'Employers & Corporate Clients';
    if (p.includes('/leads')) return 'BD Leads & Account Handovers';
    if (p.includes('/team')) return 'Team Staff Directory & Scoping';
    if (p.includes('/roles')) return 'Configurable Roles & Permissions';
    if (p.includes('/activity')) return 'Recruitment Audit Trail';
    return 'Recruitment Operations';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans antialiased text-slate-800">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-xs"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200/90 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Wordmark */}
        <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between">
          <Link to="/admin/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-slate-900">Vakancy<span className="text-blue-700">.in</span></span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">OPS</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Recruitment Operations</p>
            </div>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Modules */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navSections.map((section, sIdx) => {
            // Filter section items by current user's role
            const visibleItems = section.items.filter(item =>
              userRole === 'director' || userRole === 'main_admin' || userRole === 'admin' || item.roles.includes(userRole)
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={sIdx} className="space-y-1">
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {section.title}
                </p>
                <div className="space-y-0.5 pt-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            isActive
                              ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Current User Session Card */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div
              onClick={openProfileModal}
              className="min-w-0 pr-2 cursor-pointer group flex-1"
              title="Click to view & edit personal profile"
            >
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                  {user?.name || user?.email || 'user@vakancy.com'}
                </p>
                <Settings className="w-3 h-3 text-slate-400 group-hover:text-blue-600 shrink-0" />
              </div>
              <p className="text-[11px] text-blue-700 font-medium truncate">{currentRoleLabel}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200/90 px-4 sm:px-8 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb / Page Context */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-medium text-slate-400">Admin</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="font-semibold text-slate-900">{getPageTitle()}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openProfileModal}
              className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-medium border border-slate-200/70 transition-colors cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{user?.name ? `${user.name} (${currentRoleLabel})` : currentRoleLabel}</span>
              <Settings className="w-3 h-3 text-slate-400" />
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Self-Service Profile Modal */}
      <ModalDialog
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title="My Staff Profile"
        subtitle="View your account role, reporting line, and edit personal contact details."
      >
        {profileLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading profile...</div>
        ) : (
          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            {profileMessage.text && (
              <div className={`p-3 rounded-lg border text-xs ${
                profileMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}>
                {profileMessage.text}
              </div>
            )}

            {/* Read-Only Governance Context */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Account Role:</span>
                <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  {selfProfile.role}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Reporting Manager:</span>
                <span className="font-semibold text-slate-800">
                  {selfProfile.reporting_head_name || (userRole === 'director' ? 'Top Hierarchy (Director)' : 'None')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Account Email:</span>
                <span className="font-mono text-slate-700">{selfProfile.email}</span>
              </div>
            </div>

            {/* Editable Fields */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={selfProfile.name}
                onChange={(e) => setSelfProfile({ ...selfProfile, name: e.target.value })}
                placeholder="Your full name"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Direct Phone</label>
              <input
                type="text"
                value={selfProfile.phone}
                onChange={(e) => setSelfProfile({ ...selfProfile, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Profile Photo URL</label>
              <input
                type="url"
                value={selfProfile.profile_photo_url}
                onChange={(e) => setSelfProfile({ ...selfProfile, profile_photo_url: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-600"
              />
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Note: Administrative settings (Role, Reporting Head, Team Group, and Scoping) can only be updated by the Director.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={profileSaving}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
              >
                {profileSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        )}
      </ModalDialog>
    </div>
  );
};

export default AdminLayout;
