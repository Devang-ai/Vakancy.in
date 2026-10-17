import React, { useState, useEffect } from 'react';import CandidatePortalShell from '../../components/candidate/CandidatePortalShell';
import Toast from '../../components/common/Toast';

import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
export const CandidateSettingsPage = () => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('all');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [notifications, setNotifications] = useState({
    stageEmail: true,
    digestEmail: true,
    inboundEmail: true,
    stageSms: false,
  });
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifError, setNotifError] = useState('');

  const [toast, setToast] = useState(null);
  const [counts, setCounts] = useState({ applications: 0, saved: 0, unread_notifications: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const cRes = await API.get('/candidates/me/dashboard');
        if (cRes?.data?.counts) setCounts(cRes.data.counts);
      } catch (err) {}
    };
    fetchCounts();
  }, []);

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetchNotificationPreferences();
  }, []);

  const fetchNotificationPreferences = async () => {
    setNotifLoading(true);
    try {
      const res = await API.get('/notifications/preferences');
      if (res && res.success && res.preferences) {
        setNotifications(res.preferences);
      }
    } catch (err) {
      setNotifError(err.response?.data?.message || 'Failed to load notification preferences.');
    } finally {
      setNotifLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError('New password cannot be the same as your current password.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await API.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      if (res && res.success) {
        showToast('Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(res?.message || 'Failed to update password.');
      }
    } catch (error) {
      setPasswordError(error?.message || error?.response?.data?.message || 'Unable to update your password right now. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setNotifSaving(true);
    setNotifError('');
    try {
      const res = await API.put('/notifications/preferences', notifications);
      if (res && res.success) {
        showToast('Notification preferences saved successfully.');
      } else {
        setNotifError(res?.message || 'Failed to save preferences.');
      }
    } catch (error) {
      setNotifError(error.response?.data?.message || 'Server error occurred while saving preferences.');
    } finally {
      setNotifSaving(false);
    }
  };

  const displayName = profile?.name || user?.name || user?.email?.split('@')[0] || '';
  const designation = profile?.designation || profile?.title || 'Candidate Profile';

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

      <div className="w-full flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex flex-col gap-1 max-w-2xl">
            <h1 className="text-2xl md:text-3xl font-bold text-[#0b1c30] tracking-tight">Account Settings</h1>
            <p className="text-sm text-[#444653]">Manage your personal contact details, password credentials, and notification preferences.</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/candidate/profile"
              className="px-4 py-2 rounded bg-[#eff4ff] hover:bg-[#dce9ff] text-[#00288e] text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5"
            >
              Edit Profile
            </Link>
            <button
              type="button"
              onClick={() => { logout(); navigate('/login'); }}
              className="px-4 py-2 rounded bg-[#ffdad6] text-[#ba1a1a] hover:bg-[#ffb4ab] text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5"
            >
              Log Out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <aside className="lg:col-span-4 flex flex-col gap-6 w-full">
            <div className="bg-white p-5 rounded-xl shadow-sm flex flex-col gap-4 border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#00288e] text-white flex items-center justify-center text-xl font-bold border border-slate-200">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-base font-bold text-[#0b1c30] truncate">{displayName}</span>
                  <span className="text-xs text-[#444653] truncate">{designation}</span>
                </div>
              </div>
            </div>

            <nav className="bg-white rounded-xl shadow-sm p-2 flex flex-col gap-1 border border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded text-left transition-colors ${activeTab === 'all' ? 'bg-[#dce9ff] text-[#00288e] font-semibold' : 'text-[#444653] hover:bg-[#eff4ff]'}`}
              >
                <span className="text-sm">All Settings</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('account')}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded text-left transition-colors ${activeTab === 'account' ? 'bg-[#dce9ff] text-[#00288e] font-semibold' : 'text-[#444653] hover:bg-[#eff4ff]'}`}
              >
                <span className="text-sm">Account Information</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('password')}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded text-left transition-colors ${activeTab === 'password' ? 'bg-[#dce9ff] text-[#00288e] font-semibold' : 'text-[#444653] hover:bg-[#eff4ff]'}`}
              >
                <span className="text-sm">Change Password</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('notifications')}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded text-left transition-colors ${activeTab === 'notifications' ? 'bg-[#dce9ff] text-[#00288e] font-semibold' : 'text-[#444653] hover:bg-[#eff4ff]'}`}
              >
                <span className="text-sm">Notification Preferences</span>
              </button>
            </nav>
          </aside>

          <div className="lg:col-span-8 flex flex-col gap-6">
            {(activeTab === 'all' || activeTab === 'account') && (
              <section className="bg-white p-6 rounded-xl shadow-sm flex flex-col gap-5 border border-slate-100">
                <div className="flex flex-col">
                  <h2 className="text-base font-bold text-[#0b1c30]">Account Information</h2>
                  <p className="text-xs text-[#444653]">Your contact information.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#eff4ff] rounded-lg flex flex-col justify-between gap-3 border border-slate-100">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-[#444653] uppercase tracking-wider font-semibold">Primary Email</span>
                      <span className="text-sm font-bold text-[#0b1c30]">{user?.email || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="p-4 bg-[#eff4ff] rounded-lg flex flex-col justify-between gap-3 border border-slate-100">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-[#444653] uppercase tracking-wider font-semibold">Primary Mobile Number</span>
                      <span className="text-sm font-bold text-[#0b1c30]">{user?.phone || profile?.phone || 'Not set'}</span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {(activeTab === 'all' || activeTab === 'password') && (
              <section className="bg-white p-6 rounded-xl shadow-sm flex flex-col gap-5 border border-slate-100">
                <div className="flex flex-col">
                  <h2 className="text-base font-bold text-[#0b1c30]">Change Password</h2>
                  <p className="text-xs text-[#444653]">Choose a strong password with at least 8 characters to keep your account safe.</p>
                </div>
                {passwordError && (
                  <div className="text-xs text-[#ba1a1a] bg-[#ffdad6] p-2 rounded">{passwordError}</div>
                )}
                <form className="grid grid-cols-1 md:grid-cols-3 gap-4" onSubmit={handlePasswordSubmit}>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[#0b1c30]">Current Password</label>
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-[#eff4ff] px-3 py-2 rounded text-xs text-[#0b1c30] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00288e]/20 border border-slate-200"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[#0b1c30]">New Password</label>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-[#eff4ff] px-3 py-2 rounded text-xs text-[#0b1c30] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00288e]/20 border border-slate-200"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[#0b1c30]">Confirm Password</label>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-[#eff4ff] px-3 py-2 rounded text-xs text-[#0b1c30] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00288e]/20 border border-slate-200"
                    />
                  </div>
                  <div className="md:col-span-3 flex justify-end mt-2">
                    <button type="submit" disabled={passwordLoading} className="px-4 py-2 rounded bg-[#00288e] text-white hover:bg-[#1e40af] text-xs font-semibold shadow-sm transition-all disabled:opacity-50">
                      {passwordLoading ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {(activeTab === 'all' || activeTab === 'notifications') && (
              <section className="bg-white p-6 rounded-xl shadow-sm flex flex-col gap-4 border border-slate-100">
                <div className="flex flex-col">
                  <h2 className="text-base font-bold text-[#0b1c30]">Notification Preferences</h2>
                  <p className="text-xs text-[#444653]">Choose how and when Vakancy.in sends you job alerts and updates.</p>
                </div>
                {notifError && (
                  <div className="text-xs text-[#ba1a1a] bg-[#ffdad6] p-2 rounded">{notifError}</div>
                )}
                {notifLoading ? (
                  <div className="text-xs text-[#444653]">Loading preferences...</div>
                ) : (
                  <div className="flex flex-col divide-y divide-slate-100 pt-1">
                    <div className="py-3 flex items-center justify-between gap-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[#0b1c30]">Job Recommendations &amp; Alerts (Email)</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.digestEmail}
                        onChange={(e) => setNotifications({ ...notifications, digestEmail: e.target.checked })}
                        className="w-4 h-4 text-[#00288e] rounded border-slate-300 focus:ring-[#00288e]"
                      />
                    </div>
                    <div className="py-3 flex items-center justify-between gap-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[#0b1c30]">Application Status Updates (Email)</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.stageEmail}
                        onChange={(e) => setNotifications({ ...notifications, stageEmail: e.target.checked })}
                        className="w-4 h-4 text-[#00288e] rounded border-slate-300 focus:ring-[#00288e]"
                      />
                    </div>
                    <div className="py-3 flex items-center justify-between gap-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[#0b1c30]">Direct Recruiter Messages (Email)</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.inboundEmail}
                        onChange={(e) => setNotifications({ ...notifications, inboundEmail: e.target.checked })}
                        className="w-4 h-4 text-[#00288e] rounded border-slate-300 focus:ring-[#00288e]"
                      />
                    </div>
                    <div className="py-3 flex items-center justify-between gap-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[#0b1c30]">SMS &amp; Reminders (Mobile)</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.stageSms}
                        onChange={(e) => setNotifications({ ...notifications, stageSms: e.target.checked })}
                        className="w-4 h-4 text-[#00288e] rounded border-slate-300 focus:ring-[#00288e]"
                      />
                    </div>
                  </div>
                )}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    disabled={notifLoading || notifSaving}
                    onClick={handleSaveNotifications}
                    className="px-4 py-2 rounded bg-[#00288e] text-white hover:bg-[#1e40af] text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                  >
                    {notifSaving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </CandidatePortalShell>
  );
};

export default CandidateSettingsPage;
