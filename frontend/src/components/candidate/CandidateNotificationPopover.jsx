import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { 
  Bell, 
  CheckCheck, 
  Briefcase, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ExternalLink,
  X
} from 'lucide-react';

export default function CandidateNotificationPopover({ isOpen, onClose }) {
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
  const popoverRef = useRef(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNotificationClick = (item) => {
    if (!item.is_read) {
      markAsRead(item.id);
    }
    onClose();
    if (item.link) {
      if (item.link.startsWith('http')) {
        window.open(item.link, '_blank');
      } else {
        navigate(item.link);
      }
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSecs = Math.floor((now - date) / 1000);
    if (diffSecs < 60) return 'Just now';
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'application':
      case 'application_status':
        return <Briefcase className="w-4 h-4 text-[#00288e]" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'alert':
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default:
        return <Bell className="w-4 h-4 text-[#444653]" />;
    }
  };

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-2 w-84 sm:w-96 max-h-[480px] bg-white rounded-2xl shadow-2xl border border-[#e5eeff] z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-[#f8f9ff] border-b border-[#e5eeff] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-[#0b1c30]">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-[#00288e] text-white">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#00288e] hover:underline"
              title="Mark all as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-[#0b1c30] hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#f0f4fa]">
        {notifications.length === 0 ? (
          <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-[#f0f4ff] flex items-center justify-center text-[#00288e] mb-3">
              <Bell className="w-5 h-5 opacity-60" />
            </div>
            <p className="text-xs font-bold text-[#0b1c30]">No notifications yet</p>
            <p className="text-[11px] text-[#444653] mt-0.5 max-w-[200px]">
              You are all caught up! New alerts and application updates will appear here.
            </p>
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => handleNotificationClick(item)}
              className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                !item.is_read
                  ? 'bg-blue-50/40 hover:bg-blue-50/70'
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-white border border-[#e5eeff] flex items-center justify-center shrink-0 shadow-xs">
                {getNotificationIcon(item.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-xs truncate ${!item.is_read ? 'font-bold text-[#0b1c30]' : 'font-medium text-[#444653]'}`}>
                    {item.title}
                  </p>
                  {!item.is_read && (
                    <span className="w-2 h-2 rounded-full bg-[#00288e] shrink-0" />
                  )}
                </div>
                {item.message && (
                  <p className="text-[11px] text-[#444653] mt-0.5 line-clamp-2 leading-relaxed">
                    {item.message}
                  </p>
                )}
                <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimeAgo(item.created_at)}</span>
                  {item.link && (
                    <span className="inline-flex items-center gap-0.5 text-[#00288e] font-semibold ml-1">
                      <ExternalLink className="w-2.5 h-2.5" />
                      View
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
