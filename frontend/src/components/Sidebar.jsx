import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  Briefcase,
  FileCheck,
  Crown,
  Sparkles,
  Building,
  Users,
  CreditCard,
  Kanban,
  Building2,
  Tags,
  ShieldAlert,
  Layers,
  Search,
  Bell
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { user } = useAuth();
  if (!user) return null;

  const candidateLinks = [
    { to: '/candidate/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/candidate/profile', label: 'My Profile', icon: User },
    { to: '/candidate/jobs', label: 'Search Jobs', icon: Search },
    { to: '/candidate/applications', label: 'My Applications', icon: FileCheck },
    { to: '/candidate/saved', label: 'Saved Jobs', icon: Briefcase },
    { to: '/candidate/ai-builder', label: 'AI Resume Builder', icon: Sparkles },
    { to: '/candidate/notifications', label: 'Notifications', icon: Bell }
  ];

  const employerLinks = [
    { to: '/employer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/employer/profile', label: 'Company Profile', icon: Building },
    { to: '/employer/jobs', label: 'Manage Jobs', icon: Briefcase },
    { to: '/employer/candidate-db', label: 'Candidate Database', icon: Users },
    { to: '/employer/subscriptions', label: 'Subscriptions', icon: CreditCard },
    { to: '/employer/ai-jd', label: 'AI JD Generator', icon: Sparkles }
  ];

  const recruiterLinks = [
    { to: '/recruiter/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/recruiter/ats-pipeline', label: 'ATS Kanban Board', icon: Kanban },
    { to: '/recruiter/candidate-db', label: 'Executive Search DB', icon: Users },
    { to: '/recruiter/clients', label: 'Clients Directory', icon: Building2 },
    { to: '/recruiter/jobs', label: 'Client Jobs', icon: Briefcase }
  ];

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
    { to: '/admin/users', label: 'User Directory', icon: Users },
    { to: '/admin/jobs', label: 'All Jobs', icon: Briefcase },
    { to: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
    { to: '/admin/ats-stages', label: 'ATS Stages Manager', icon: Layers }
  ];

  const navMap = {
    candidate: candidateLinks,
    employer: employerLinks,
    recruiter: recruiterLinks,
    admin: adminLinks
  };

  const currentLinks = navMap[user.role] || [];

  return (
    <aside className="w-64 shrink-0 hidden md:block">
      <div className="sticky top-20 glass-card rounded-2xl p-4 border border-white/10 space-y-1">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {user.role} Portal Menu
        </div>
        {currentLinks.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/20 text-cyan-300 border border-cyan-500/30 shadow-md shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </aside>
  );
};

export default Sidebar;
