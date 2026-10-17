import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, User, Briefcase, Award, BookOpen, PenTool, Languages, FileText, Send, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const CandidateLayout = () => {
  const { logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/candidate/dashboard', icon: LayoutDashboard },
    { name: 'Profile', path: '/candidate/profile', icon: User },
    { name: 'Professional Info', path: '/candidate/professional', icon: Briefcase },
    { name: 'Experience', path: '/candidate/experience', icon: Award },
    { name: 'Education', path: '/candidate/education', icon: BookOpen },
    { name: 'Skills', path: '/candidate/skills', icon: PenTool },
    { name: 'Languages', path: '/candidate/languages', icon: Languages },
    { name: 'Resumes', path: '/candidate/resumes', icon: FileText },
    { name: 'My Applications', path: '/candidate/applications', icon: Send },
    { name: 'Account Settings', path: '/candidate/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-surface-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-surface-900 border-r border-white/8 flex flex-col hidden md:flex h-screen sticky top-0">
        <div className="p-6 border-b border-white/8 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-brand-500/20">
            V
          </div>
          <span className="font-heading font-semibold text-lg text-white">Vakancy</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-500/10 text-brand-400 font-medium'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 border-t border-white/8">
          <button 
            onClick={logout}
            className="flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 w-full text-left text-slate-400 hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto custom-scrollbar">
        {/* Mobile Header (simplified for now) */}
        <div className="md:hidden border-b border-white/8 bg-surface-900 p-4 flex items-center justify-between">
          <span className="font-heading font-semibold text-white">Vakancy Candidate</span>
        </div>
        
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default CandidateLayout;
