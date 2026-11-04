import React, { useState, useEffect } from 'react';
import CandidatePortalShell from '../../components/candidate/CandidatePortalShell';
import Toast from '../../components/common/Toast';
import { KeyRound, ShieldCheck, Mail, Eye, EyeOff, Phone, Plus, Check, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import authService from '../../services/authService';

export const CandidateSettingsPage = () => {
  const { user, profile, logout, fetchUserContext } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('all');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Missing mobile number inline editor state (Phase 1)
  const [isAddingPhone, setIsAddingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneDialCode, setPhoneDialCode] = useState('+91');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  // Google-only Set Password state (Scenario B)
  const [setPasswordOtp, setSetPasswordOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Notification preferences state (without SMS)
  const [notifications, setNotifications] = useState({
    stageEmail: true,
    digestEmail: true,
    inboundEmail: true,
  });
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifError, setNotifError] = useState('');

  const [toast, setToast] = useState(null);
  const [counts, setCounts] = useState({ applications: 0, saved: 0, unread_notifications: 0 });

  const isGoogleOnly = user?.has_password === false;

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

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
        setNotifications({
          stageEmail: Boolean(res.preferences.stageEmail),
          digestEmail: Boolean(res.preferences.digestEmail),
          inboundEmail: Boolean(res.preferences.inboundEmail)
        });
      }
    } catch (err) {
      setNotifError(err.response?.data?.message || 'Failed to load notification preferences.');
    } finally {
      setNotifLoading(false);
    }
  };

  const handleSavePhone = async (e) => {
    if (e) e.preventDefault();
    setPhoneError('');

    const raw = phoneInput.trim();
    const digits = raw.replace(/\D/g, '');
    if (!raw) {
      setPhoneError('Please enter a mobile number.');
      return;
    }
    if (digits.length < 10 || digits.length > 15) {
      setPhoneError('Please enter a valid 10-digit mobile number.');
      return;
    }

    let formatted = raw;
    if (!raw.startsWith('+') && digits.length === 10) {
      formatted = `${phoneDialCode} ${raw}`;
    }

    setPhoneSaving(true);
    try {
      const res = await API.put('/candidates/me', { phone: formatted });
      if (res?.success) {
        showToast('Mobile number added successfully.');
        setIsAddingPhone(false);
        setPhoneInput('');
        setPhoneError('');
        if (typeof fetchUserContext === 'function') {
          await fetchUserContext();
        }
      } else {
        setPhoneError(res?.message || 'Failed to update mobile number.');
      }
    } catch (err) {
      setPhoneError(err?.response?.data?.message || err?.message || 'Error saving mobile number.');
    } finally {
      setPhoneSaving(false);
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
      const res = await authService.changePassword({
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

  const handleSendSetPasswordOtp = async () => {
    if (otpCooldown > 0 || otpSending) return;
    setOtpSending(true);
    setPasswordError('');
    try {
      const res = await authService.sendSetPasswordOtp();
      if (res && res.success) {
        setOtpSent(true);
        setOtpCooldown(res.resendCooldownSeconds || 60);
        showToast(res.message || 'Verification code sent to your email.');
      } else {
        setPasswordError(res?.message || 'Failed to send verification code.');
      }
    } catch (err) {
      if (err?.code === 'RESEND_COOLDOWN' || err?.response?.data?.code === 'RESEND_COOLDOWN') {
        const remaining = err?.secondsRemaining || err?.response?.data?.secondsRemaining || 60;
        setOtpCooldown(remaining);
      }
      setPasswordError(err?.message || err?.response?.data?.message || 'Failed to send verification code.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleSetPasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    if (!setPasswordOtp || setPasswordOtp.trim().length !== 6) {
      setPasswordError('Please enter the 6-digit verification code sent to your email.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await authService.setPassword({
        otp: setPasswordOtp.trim(),
        newPassword
      });
      if (res && res.success) {
        showToast('Password created successfully! You can now log in with email and password.');
        setSetPasswordOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setOtpSent(false);
        if (fetchUserContext) await fetchUserContext();
      } else {
        setPasswordError(res?.message || 'Failed to set password.');
      }
    } catch (err) {
      setPasswordError(err?.message || err?.response?.data?.message || 'Failed to set password. Please check the code and try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setNotifSaving(true);
    setNotifError('');
    try {
      const res = await API.put('/notifications/preferences', {
        stageEmail: notifications.stageEmail,
        digestEmail: notifications.digestEmail,
        inboundEmail: notifications.inboundEmail
      });
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
                <span className="text-sm">{isGoogleOnly ? 'Set Password' : 'Change Password'}</span>
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
                {(() => {
                  const userPhone = (user?.phone && user.phone.trim() && user.phone !== 'Not set')
                    ? user.phone.trim()
                    : (profile?.phone && profile.phone.trim() && profile.phone !== 'Not set')
                      ? profile.phone.trim()
                      : null;
                  const hasPhone = Boolean(userPhone);

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Primary Email Card */}
                      <div className="p-4 bg-[#eff4ff] rounded-lg flex flex-col justify-between gap-3 border border-slate-100">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-[#444653] uppercase tracking-wider font-semibold">Primary Email</span>
                          <span className="text-sm font-bold text-[#0b1c30]">{user?.email || 'N/A'}</span>
                        </div>
                      </div>

                      {/* Primary Mobile Number Card */}
                      {hasPhone ? (
                        <div className="p-4 bg-[#eff4ff] rounded-lg flex flex-col justify-between gap-3 border border-slate-100">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-[#444653] uppercase tracking-wider font-semibold">Primary Mobile Number</span>
                            <span className="text-sm font-bold text-[#0b1c30]">{userPhone}</span>
                          </div>
                        </div>
                      ) : isAddingPhone ? (
                        <div className="p-4 bg-white rounded-lg flex flex-col gap-3 border-2 border-[#00288e]/30 shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-[#00288e] uppercase tracking-wider font-bold flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-[#00288e]" />
                              <span>Add Primary Mobile Number</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingPhone(false);
                                setPhoneError('');
                              }}
                              className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                              aria-label="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <form onSubmit={handleSavePhone} className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg select-none">
                                +91
                              </span>
                              <input
                                type="tel"
                                id="input-candidate-mobile"
                                value={phoneInput}
                                onChange={(e) => {
                                  setPhoneInput(e.target.value);
                                  if (phoneError) setPhoneError('');
                                }}
                                placeholder="10-digit mobile number"
                                maxLength={15}
                                autoFocus
                                className="flex-1 px-3 py-1.5 bg-[#eff4ff] border border-slate-200 rounded-lg text-xs font-semibold text-[#0b1c30] focus:outline-none focus:border-[#00288e] focus:bg-white transition-colors"
                              />
                            </div>

                            {phoneError && (
                              <p className="text-[11px] font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                {phoneError}
                              </p>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                disabled={phoneSaving}
                                onClick={() => {
                                  setIsAddingPhone(false);
                                  setPhoneError('');
                                }}
                                className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-md transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                id="btn-save-mobile"
                                disabled={phoneSaving}
                                className="px-3 py-1 bg-[#00288e] hover:bg-[#1e40af] disabled:opacity-50 text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                {phoneSaving ? (
                                  <>
                                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    <span>Saving...</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Save</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </form>
                        </div>
                      ) : (
                        <div className="p-4 bg-[#eff4ff] rounded-lg flex flex-col justify-between gap-3 border border-slate-100">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-[#444653] uppercase tracking-wider font-semibold">Primary Mobile Number</span>
                            <span className="text-xs text-slate-400 italic font-medium">Not set</span>
                          </div>
                          <div>
                            <button
                              type="button"
                              id="btn-add-mobile"
                              onClick={() => {
                                setIsAddingPhone(true);
                                setPhoneError('');
                                setPhoneInput('');
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00288e] hover:bg-[#1e40af] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Add Mobile Number</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </section>
            )}

            {(activeTab === 'all' || activeTab === 'password') && (
              <section className="bg-white p-6 rounded-xl shadow-sm flex flex-col gap-5 border border-slate-100">
                <div className="flex flex-col">
                  <h2 className="text-base font-bold text-[#0b1c30]">
                    {isGoogleOnly ? 'Set Account Password' : 'Change Password'}
                  </h2>
                  <p className="text-xs text-[#444653]">
                    {isGoogleOnly
                      ? 'You currently sign in via Google. Setting a local password allows you to also sign in directly using your email and password.'
                      : 'Choose a strong password with at least 8 characters to keep your account safe.'}
                  </p>
                </div>
                {passwordError && (
                  <div className="text-xs text-[#ba1a1a] bg-[#ffdad6] p-3 rounded-lg border border-[#ffb4ab]">{passwordError}</div>
                )}

                {isGoogleOnly ? (
                  <form className="flex flex-col gap-4" onSubmit={handleSetPasswordSubmit}>
                    <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-[#0b1c30]">Email Verification Code</span>
                        <span className="text-xs text-slate-500">
                          {otpSent 
                            ? `Verification code sent to ${user?.email}` 
                            : `Send a 6-digit verification code to ${user?.email}`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSendSetPasswordOtp}
                        disabled={otpSending || otpCooldown > 0}
                        className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 shrink-0"
                      >
                        {otpSending 
                          ? 'Sending...' 
                          : otpCooldown > 0 
                            ? `Resend in ${otpCooldown}s` 
                            : otpSent ? 'Resend Code' : 'Send Code'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-[#0b1c30]">6-Digit Code</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={setPasswordOtp}
                          onChange={(e) => setSetPasswordOtp(e.target.value.replace(/\D/g, ''))}
                          placeholder="123456"
                          className="w-full bg-[#eff4ff] px-3 py-2 rounded text-xs text-[#0b1c30] tracking-widest font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00288e]/20 border border-slate-200"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-[#0b1c30]">New Password</label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Min 8 characters"
                            className="w-full bg-[#eff4ff] px-3 py-2 pr-8 rounded text-xs text-[#0b1c30] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00288e]/20 border border-slate-200"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-[#0b1c30]">Confirm Password</label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter password"
                            className="w-full bg-[#eff4ff] px-3 py-2 pr-8 rounded text-xs text-[#0b1c30] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00288e]/20 border border-slate-200"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end mt-2">
                      <button 
                        type="submit" 
                        disabled={passwordLoading} 
                        className="px-4 py-2 rounded bg-[#00288e] text-white hover:bg-[#1e40af] text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                      >
                        {passwordLoading ? 'Saving...' : 'Set Password'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form className="grid grid-cols-1 md:grid-cols-3 gap-4" onSubmit={handlePasswordSubmit}>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[#0b1c30]">Current Password</label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Current password"
                          className="w-full bg-[#eff4ff] px-3 py-2 pr-8 rounded text-xs text-[#0b1c30] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00288e]/20 border border-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[#0b1c30]">New Password</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min 8 characters"
                          className="w-full bg-[#eff4ff] px-3 py-2 pr-8 rounded text-xs text-[#0b1c30] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00288e]/20 border border-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[#0b1c30]">Confirm Password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          className="w-full bg-[#eff4ff] px-3 py-2 pr-8 rounded text-xs text-[#0b1c30] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00288e]/20 border border-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="md:col-span-3 flex justify-end mt-2">
                      <button type="submit" disabled={passwordLoading} className="px-4 py-2 rounded bg-[#00288e] text-white hover:bg-[#1e40af] text-xs font-semibold shadow-sm transition-all disabled:opacity-50">
                        {passwordLoading ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </form>
                )}
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
