import React, { useState, useEffect } from 'react';
import CandidatePortalShell from '../../components/candidate/CandidatePortalShell';
import Toast from '../../components/common/Toast';

import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import API from '../../services/api';

export const CandidateNotificationsPage = () => {
  const { user } = useAuth();
  
  // From global context
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
  
  // Local states
  const [activeTab, setActiveTab] = useState('inbox');
  const [activeCategory, setActiveCategory] = useState('all');
  const [alertRules, setAlertRules] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState('');

  // Modals
  const [createAlertModalOpen, setCreateAlertModalOpen] = useState(false);
  const [newAlertForm, setNewAlertForm] = useState({ title: '', location: '', salary: '', frequency: 'Daily Digest' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (activeTab === 'rules') {
      fetchJobAlerts();
    }
  }, [activeTab]);

  const fetchJobAlerts = async () => {
    setAlertsLoading(true);
    setAlertsError('');
    try {
      const res = await API.get('/notifications/alerts');
      if (res && res.success) {
        setAlertRules(res.alerts || []);
      }
    } catch (err) {
      setAlertsError('Failed to fetch job alerts.');
    } finally {
      setAlertsLoading(false);
    }
  };

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    if (!newAlertForm.title.trim()) {
      showToast('Alert title is required.', true);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await API.post('/notifications/alerts', newAlertForm);
      if (res && res.success) {
        showToast('Job alert created successfully.');
        setCreateAlertModalOpen(false);
        setNewAlertForm({ title: '', location: '', salary: '', frequency: 'Daily Digest' });
        fetchJobAlerts();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create job alert.', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAlert = async (id) => {
    try {
      await API.put(`/notifications/alerts/${id}/toggle`);
      setAlertRules(alertRules.map(a => a.id === id ? { ...a, is_active: !a.is_active } : a));
      showToast('Alert status toggled.');
    } catch (err) {
      showToast('Failed to toggle alert status.', true);
    }
  };

  const handleDeleteAlert = async (id) => {
    if (!window.confirm('Are you sure you want to delete this alert?')) return;
    try {
      await API.delete(`/notifications/alerts/${id}`);
      setAlertRules(alertRules.filter(a => a.id !== id));
      showToast('Alert deleted.');
    } catch (err) {
      showToast('Failed to delete alert.', true);
    }
  };

  const handleNotificationClick = (n) => {
    if (!n.is_read) {
      markAsRead(n.id);
    }
  };

  const formatTime = (isoString) => {
    const d = new Date(isoString);
    return isNaN(d.getTime()) ? 'Recently' : d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Filter notifications by category
  const filteredNotifications = notifications.filter(n => {
    if (activeCategory === 'all') return true;
    return n.type === activeCategory;
  });

  return (
    <CandidatePortalShell>
      {toast && (
        <Toast 
          type={toast.isError ? 'error' : (toast.type || 'info')}
          title={toast.title || (toast.isError ? 'Error' : 'Notification')}
          description={toast.msg || toast.description || (typeof toast === 'string' ? toast : '')} 
          onClose={() => setToast(null)} 
        />
      )}

      <div className="max-w-[80rem] w-full mx-auto px-6 py-6 md:py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl md:text-3xl font-bold text-[#0b1c30] tracking-tight">Notifications Hub</h1>
            <p className="text-sm text-[#444653]">Manage your real-time updates and automated job alerts.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={markAllRead}
              className="px-4 py-2 bg-white text-[#00288e] hover:bg-[#eff4ff] border border-[#00288e]/20 rounded text-xs font-semibold shadow-sm transition-all"
            >
              Mark All as Read
            </button>
            <Link
              to="/candidate/settings"
              className="px-4 py-2 bg-white text-[#00288e] hover:bg-[#eff4ff] border border-[#00288e]/20 rounded text-xs font-semibold shadow-sm transition-all"
            >
              Delivery Preferences
            </Link>
            <button
              onClick={() => setCreateAlertModalOpen(true)}
              className="px-4 py-2 bg-[#00288e] text-white hover:bg-[#1e40af] rounded text-xs font-semibold shadow-sm transition-all"
            >
              + Create New Alert
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-6 border-b border-slate-200 mb-6">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'inbox' ? 'border-[#00288e] text-[#00288e]' : 'border-transparent text-[#444653] hover:text-[#0b1c30]'}`}
          >
            Notifications Inbox
            {unreadCount > 0 && (
              <span className="ml-2 bg-[#ba1a1a] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'rules' ? 'border-[#00288e] text-[#00288e]' : 'border-transparent text-[#444653] hover:text-[#0b1c30]'}`}
          >
            Automated Job Alerts
          </button>
        </div>

        {/* INBOX VIEW */}
        {activeTab === 'inbox' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {['all', 'application', 'job', 'payment', 'system', 'welcome'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activeCategory === cat ? 'bg-[#00288e] text-white shadow-sm' : 'bg-white text-[#444653] border border-slate-200 hover:bg-[#eff4ff] hover:text-[#00288e]'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-4">
              {filteredNotifications.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-[#eff4ff] text-[#00288e] flex items-center justify-center mb-4">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-[#0b1c30] mb-1">No notifications yet</h3>
                  <p className="text-sm text-[#444653]">When you get updates, they'll appear here.</p>
                </div>
              ) : (
                filteredNotifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`bg-white p-5 rounded-xl border cursor-pointer hover:shadow-md transition-all flex flex-col gap-3 ${
                      !n.is_read ? 'border-[#00288e]/30 shadow-sm' : 'border-slate-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${
                          !n.is_read ? 'bg-[#00288e] text-white' : 'bg-[#eff4ff] text-[#00288e]'
                        }`}>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex flex-col gap-1">
                          <h3 className={`text-sm ${!n.is_read ? 'font-bold text-[#0b1c30]' : 'font-semibold text-[#444653]'}`}>
                            {n.title}
                          </h3>
                          <p className={`text-sm ${!n.is_read ? 'text-[#0b1c30]' : 'text-[#444653]'}`}>{n.message}</p>
                          <span className="text-xs text-[#70727f] mt-1">{formatTime(n.created_at)}</span>
                        </div>
                      </div>
                      {!n.is_read && (
                        <div className="w-2.5 h-2.5 shrink-0 rounded-full bg-[#00288e]"></div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* JOB ALERTS VIEW */}
        {activeTab === 'rules' && (
          <div className="flex flex-col gap-4">
            {alertsLoading ? (
              <div className="text-sm text-[#444653]">Loading job alerts...</div>
            ) : alertsError ? (
              <div className="text-sm text-[#ba1a1a]">{alertsError}</div>
            ) : alertRules.length === 0 ? (
              <div className="bg-white p-8 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
                <h3 className="text-base font-bold text-[#0b1c30] mb-1">No job alerts configured</h3>
                <p className="text-sm text-[#444653] mb-4">Set up an alert to get notified when matching jobs are posted.</p>
                <button
                  onClick={() => setCreateAlertModalOpen(true)}
                  className="px-4 py-2 bg-[#00288e] text-white hover:bg-[#1e40af] rounded text-xs font-semibold"
                >
                  Create New Alert
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {alertRules.map(rule => (
                  <div key={rule.id} className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col gap-4 shadow-sm hover:border-[#00288e]/30 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col">
                        <h4 className="text-sm font-bold text-[#0b1c30] truncate">{rule.title}</h4>
                        <span className="text-xs text-[#444653]">{rule.location}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded ${rule.is_active ? 'bg-[#dce9ff] text-[#00288e]' : 'bg-slate-100 text-slate-500'}`}>
                        {rule.is_active ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-1 text-xs text-[#444653]">
                      <div className="flex items-center gap-2">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {rule.salary}
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {rule.frequency}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <button
                        onClick={() => handleToggleAlert(rule.id)}
                        className={`text-xs font-semibold ${rule.is_active ? 'text-[#ba1a1a] hover:text-[#93000a]' : 'text-[#006a61] hover:text-[#005049]'}`}
                      >
                        {rule.is_active ? 'Pause Alert' : 'Resume Alert'}
                      </button>
                      <button
                        onClick={() => handleDeleteAlert(rule.id)}
                        className="text-xs font-semibold text-slate-500 hover:text-[#ba1a1a]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CREATE ALERT MODAL */}
      {createAlertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b1c30]/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up border border-[#00288e]/10">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-[#f8f9ff]">
              <h2 className="text-base font-bold text-[#0b1c30]">Create New Job Alert</h2>
              <button
                onClick={() => setCreateAlertModalOpen(false)}
                className="text-slate-400 hover:text-[#0b1c30] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleCreateAlert} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#0b1c30]">Job Title / Keywords <span className="text-[#ba1a1a]">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Software Engineer, React"
                  value={newAlertForm.title}
                  onChange={(e) => setNewAlertForm({ ...newAlertForm, title: e.target.value })}
                  className="w-full bg-[#f8f9ff] px-3 py-2 rounded text-sm text-[#0b1c30] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00288e]/20 border border-slate-200 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#0b1c30]">Location</label>
                <input
                  type="text"
                  placeholder="e.g. Remote, Bangalore"
                  value={newAlertForm.location}
                  onChange={(e) => setNewAlertForm({ ...newAlertForm, location: e.target.value })}
                  className="w-full bg-[#f8f9ff] px-3 py-2 rounded text-sm text-[#0b1c30] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00288e]/20 border border-slate-200 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#0b1c30]">Expected Salary</label>
                <input
                  type="text"
                  placeholder="e.g. ₹15L - ₹25L"
                  value={newAlertForm.salary}
                  onChange={(e) => setNewAlertForm({ ...newAlertForm, salary: e.target.value })}
                  className="w-full bg-[#f8f9ff] px-3 py-2 rounded text-sm text-[#0b1c30] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00288e]/20 border border-slate-200 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#0b1c30]">Frequency</label>
                <select
                  value={newAlertForm.frequency}
                  onChange={(e) => setNewAlertForm({ ...newAlertForm, frequency: e.target.value })}
                  className="w-full bg-[#f8f9ff] px-3 py-2 rounded text-sm text-[#0b1c30] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00288e]/20 border border-slate-200 transition-all"
                >
                  <option value="Daily Digest">Daily Digest</option>
                  <option value="Instant WhatsApp & Email">Instant WhatsApp & Email</option>
                  <option value="Weekly Summary">Weekly Summary</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => setCreateAlertModalOpen(false)}
                  className="px-4 py-2 text-[#444653] hover:text-[#0b1c30] text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#00288e] text-white hover:bg-[#1e40af] rounded text-sm font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CandidatePortalShell>
  );
};

export default CandidateNotificationsPage;
