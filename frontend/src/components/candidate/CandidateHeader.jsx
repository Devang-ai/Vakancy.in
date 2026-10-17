import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { User, LogOut, Bell } from 'lucide-react';
import API from '../../services/api';
import CandidateNotificationPopover from './CandidateNotificationPopover';

export default function CandidateHeader({ title, subtitle }) {
  const { user, profile, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const displayName = profile?.name || user?.name || user?.email?.split('@')[0] || 'Candidate';
  const roleName = profile?.professional_headline || profile?.current_designation || 'Job Seeker';

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

  const effectiveUnread = unreadCount !== undefined ? unreadCount : notifCount;

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-[#e5eeff] z-40 px-6 flex items-center justify-between">
      <div>
        {title && <h1 className="text-base font-bold text-[#0b1c30]">{title}</h1>}
        {subtitle && <p className="text-xs text-[#444653]">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Notification Bell with Compact Popover */}
        <div className="relative">
          <button
            type="button"
            id="candidate-notification-bell"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            aria-label="View notifications"
            className={`relative p-2 rounded-full transition-colors ${
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

        <Link
          to="/candidate/profile"
          className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-[#f8f9ff] transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-[#e5eeff] text-[#00288e] font-bold flex items-center justify-center text-xs border border-blue-200">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-bold text-[#0b1c30] leading-none">{displayName}</p>
            <p className="text-[10px] text-[#444653] truncate max-w-[120px]">{roleName}</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
