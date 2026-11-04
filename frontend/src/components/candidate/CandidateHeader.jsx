import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { User, LogOut, Bell, Menu, Search } from 'lucide-react';
import API from '../../services/api';
import CandidateNotificationPopover from './CandidateNotificationPopover';

export default function CandidateHeader({ title, subtitle, isMobileOpen, setIsMobileOpen }) {
  const { user, profile } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const displayName = profile?.name || user?.name || user?.email?.split('@')[0] || 'Candidate';
  const roleName = profile?.professional_headline || profile?.current_designation || 'Job Seeker';

  const [headerSearch, setHeaderSearch] = useState('');
  const [notifCount, setNotifCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await API.get('/candidates/me');
        if (res?.success && res.counts) {
          setNotifCount(Number(res.counts.notifications || 0));
        }
      } catch {
        // ignore
      }
    };
    fetchCounts();
    window.addEventListener('vakancy:candidate-counts-update', fetchCounts);
    return () => window.removeEventListener('vakancy:candidate-counts-update', fetchCounts);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (headerSearch.trim()) {
      navigate(`/candidate/jobs?search=${encodeURIComponent(headerSearch.trim())}`);
    }
  };

  const effectiveUnread = unreadCount !== undefined ? unreadCount : notifCount;

  return (
    <header className="fixed top-0 xl:left-64 left-0 right-0 h-16 bg-white border-b border-[#e5eeff] z-40 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile Menu & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={() => setIsMobileOpen?.(!isMobileOpen)}
          className="xl:hidden p-2 -ml-1 text-[#0b1c30] hover:bg-[#eff4ff] rounded-lg transition-colors focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          {title && <h1 className="text-sm sm:text-base font-bold text-[#0b1c30] truncate">{title}</h1>}
          {subtitle && <p className="text-[11px] sm:text-xs text-[#444653] truncate hidden sm:block">{subtitle}</p>}
        </div>
      </div>

      {/* Center: Desktop Header Search Bar (Storyboard reference) */}
      <form onSubmit={handleSearchSubmit} className="hidden xl:flex items-center flex-1 max-w-sm mx-6">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={headerSearch}
            onChange={(e) => setHeaderSearch(e.target.value)}
            placeholder="Search jobs, companies or skills..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#00288e] transition-all"
          />
        </div>
      </form>

      {/* Right: Actions Cluster (Notifications + User Avatar) */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Notification Bell with Compact Popover */}
        <div className="relative">
          <button
            type="button"
            id="candidate-notification-bell"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            aria-label="View notifications"
            className={`relative p-2 rounded-full transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer ${
              isNotifOpen
                ? 'bg-[#eff4ff] text-[#00288e]'
                : 'hover:bg-[#f8f9ff] text-slate-500 hover:text-[#00288e]'
            }`}
          >
            <Bell className="w-5 h-5" />
            {effectiveUnread > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 border border-white"></span>
              </span>
            )}
          </button>

          <CandidateNotificationPopover
            isOpen={isNotifOpen}
            onClose={() => setIsNotifOpen(false)}
          />
        </div>

        {/* User Avatar & Name Link */}
        <Link
          to="/candidate/profile"
          className="flex items-center gap-2 sm:gap-2.5 px-2 py-1 rounded-xl hover:bg-[#f8f9ff] transition-colors group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-[#00288e] text-white font-bold flex items-center justify-center text-xs shadow-xs border border-blue-200 shrink-0 group-hover:scale-105 transition-transform">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="text-left hidden md:block">
            <p className="text-xs font-bold text-[#0b1c30] leading-none group-hover:text-[#00288e] transition-colors">{displayName}</p>
            <p className="text-[10px] text-[#444653] truncate max-w-[120px]">{roleName}</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
