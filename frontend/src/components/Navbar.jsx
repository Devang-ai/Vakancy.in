import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, LogOut, User, Sparkles, Shield, Building, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationsPopover from './NotificationsPopover';
import BrandLogo from './common/BrandLogo';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleColors = {
    candidate: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    employer: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    recruiter: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    admin: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
  };

  const roleIcons = {
    candidate: User,
    employer: Building,
    recruiter: UserCheck,
    admin: Shield
  };

  const RoleIcon = user ? roleIcons[user.role] || User : User;

  return (
    <header className="sticky top-0 z-40 w-full glass-card border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <BrandLogo variant="horizontal" size="md" onDark={true} />

        {/* Right Navigation */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Role Indicator Badge */}
              <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wider ${roleColors[user.role] || 'bg-slate-800'}`}>
                <RoleIcon className="w-3.5 h-3.5" />
                {user.role}
              </div>

              {/* Notifications */}
              <NotificationsPopover />

              {/* User Email & Logout */}
              <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                <div className="hidden md:block text-right">
                  <span className="text-xs font-medium text-white block truncate max-w-[150px]">{user.email}</span>
                  <span className="text-[10px] text-slate-400 capitalize">{user.role} Account</span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-white/10 hover:border-rose-500/30 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/5 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 transition-all"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
