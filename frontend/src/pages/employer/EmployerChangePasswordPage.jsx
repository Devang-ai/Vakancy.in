import React, { useState, useEffect } from 'react';
import { PageTransition, StaggerContainer, StaggerItem } from '../../components/common/Motion';
import EmployerFooter from '../../components/employer/EmployerFooter';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import authService from '../../services/authService';
import { KeyRound, ShieldCheck, Mail, Bell, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

export default function EmployerChangePasswordPage() {
  const { setSidebarOpen } = useOutletContext();
  const { user, fetchUserContext } = useAuth();

  const isGoogleOnly = user?.has_password === false;

  // Change Password state (Scenario A)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Set Password OTP state (Scenario B: Google-only)
  const [setPasswordOtp, setSetPasswordOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Notification preferences state (without SMS)
  const [notifications, setNotifications] = useState({
    stageEmail: true,
    inboundEmail: true
  });
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifMessage, setNotifMessage] = useState('');
  const [notifError, setNotifError] = useState('');

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

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
          inboundEmail: Boolean(res.preferences.inboundEmail)
        });
      }
    } catch (err) {
      setNotifError(err.response?.data?.message || 'Failed to load notification preferences.');
    } finally {
      setNotifLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMessage('');
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
      if (res.success) {
        setPasswordMessage(res.message || 'Password successfully changed.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(res.message || 'Failed to change password.');
      }
    } catch (err) {
      setPasswordError(err?.message || err?.response?.data?.message || 'Unable to update your password right now. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSendSetPasswordOtp = async () => {
    if (otpCooldown > 0 || otpSending) return;
    setOtpSending(true);
    setPasswordError('');
    setPasswordMessage('');
    try {
      const res = await authService.sendSetPasswordOtp();
      if (res && res.success) {
        setOtpSent(true);
        setOtpCooldown(res.resendCooldownSeconds || 60);
        setPasswordMessage(res.message || 'A 6-digit verification code has been sent to your email.');
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
    setPasswordMessage('');

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
        setPasswordMessage('Password created successfully! You can now log in with work email and password.');
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
    setNotifMessage('');
    try {
      const res = await API.put('/notifications/preferences', {
        stageEmail: notifications.stageEmail,
        inboundEmail: notifications.inboundEmail
      });
      if (res && res.success) {
        setNotifMessage('Notification preferences saved successfully.');
      } else {
        setNotifError(res?.message || 'Failed to save preferences.');
      }
    } catch (error) {
      setNotifError(error.response?.data?.message || 'Server error occurred while saving preferences.');
    } finally {
      setNotifSaving(false);
    }
  };

  return (
    <PageTransition className="w-full flex-1 flex flex-col bg-[#f8fafc] font-sans text-[#0f172a] antialiased">
      <main className="w-full flex-1 bg-[#f8fafc] pb-12">
        <StaggerContainer className="px-6 py-8 max-w-3xl mx-auto w-full space-y-8">
          
          {/* PASSWORD CARD */}
          <StaggerItem index={0}>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#0b1c30]">
                    {isGoogleOnly ? 'Set Account Password' : 'Change Password'}
                  </h1>
                  <p className="text-xs text-slate-500">
                    {isGoogleOnly
                      ? 'Your account was created via Google Sign-In. You can set a password to also log in with your work email.'
                      : 'Choose a strong password with at least 8 characters to keep your recruiter account secure.'}
                  </p>
                </div>
              </div>

              {passwordMessage && (
                <div className="my-6 p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{passwordMessage}</span>
                </div>
              )}
              {passwordError && (
                <div className="my-6 p-4 bg-red-50 text-red-700 rounded-xl text-xs font-medium border border-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{passwordError}</span>
                </div>
              )}

              {isGoogleOnly ? (
                <form onSubmit={handleSetPasswordSubmit} className="space-y-5 mt-6">
                  <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-[#0b1c30]">Email Verification Code</span>
                      <span className="text-xs text-slate-500">
                        {otpSent 
                          ? `Code sent to ${user?.email}` 
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

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">6-Digit Code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={setPasswordOtp}
                      onChange={(e) => setSetPasswordOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm tracking-widest font-mono focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                      placeholder="123456"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        placeholder="Minimum 8 characters"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        placeholder="Re-enter password"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="w-full md:w-auto px-6 py-2.5 bg-[#00288e] text-white text-xs font-bold rounded-xl hover:bg-[#1e40af] transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                    >
                      {passwordLoading ? 'Saving...' : 'Set Password'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handlePasswordSubmit} className="space-y-5 mt-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        placeholder="Enter current password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        placeholder="Minimum 8 characters"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        placeholder="Confirm new password"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="w-full md:w-auto px-6 py-2.5 bg-[#00288e] text-white text-xs font-bold rounded-xl hover:bg-[#1e40af] transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                    >
                      {passwordLoading ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </StaggerItem>

          {/* NOTIFICATION PREFERENCES CARD */}
          <StaggerItem index={1}>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#0b1c30]">Notification Preferences</h2>
                  <p className="text-xs text-slate-500">Choose which operational email alerts Vakancy sends to your recruiter mailbox.</p>
                </div>
              </div>

              {notifMessage && (
                <div className="my-4 p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{notifMessage}</span>
                </div>
              )}
              {notifError && (
                <div className="my-4 p-4 bg-red-50 text-red-700 rounded-xl text-xs font-medium border border-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{notifError}</span>
                </div>
              )}

              {notifLoading ? (
                <div className="py-6 text-xs text-slate-500">Loading preferences...</div>
              ) : (
                <div className="flex flex-col divide-y divide-slate-100 pt-2">
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#0b1c30]">Candidate Application Stage Updates (Email)</span>
                      <span className="text-xs text-slate-500">Receive email alerts when candidates submit new applications or stages change.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.stageEmail}
                      onChange={(e) => setNotifications({ ...notifications, stageEmail: e.target.checked })}
                      className="w-4 h-4 text-[#00288e] rounded border-slate-300 focus:ring-[#00288e]"
                    />
                  </div>

                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#0b1c30]">Direct Candidate Inquiries &amp; Messages (Email)</span>
                      <span className="text-xs text-slate-500">Receive email notifications when candidate replies or recruiter messages are exchanged.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.inboundEmail}
                      onChange={(e) => setNotifications({ ...notifications, inboundEmail: e.target.checked })}
                      className="w-4 h-4 text-[#00288e] rounded border-slate-300 focus:ring-[#00288e]"
                    />
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      disabled={notifLoading || notifSaving}
                      onClick={handleSaveNotifications}
                      className="px-5 py-2.5 rounded-xl bg-[#00288e] text-white hover:bg-[#1e40af] text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                    >
                      {notifSaving ? 'Saving...' : 'Save Preferences'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </StaggerItem>

        </StaggerContainer>
      </main>
      <EmployerFooter />
    </PageTransition>
  );
}
