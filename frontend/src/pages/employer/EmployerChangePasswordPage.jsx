import React, { useState } from 'react';
import { PageTransition, StaggerContainer, StaggerItem } from '../../components/common/Motion';
import EmployerFooter from '../../components/employer/EmployerFooter';
import { useOutletContext } from 'react-router-dom';
import API from '../../services/api';

export default function EmployerChangePasswordPage() {
  const { setSidebarOpen } = useOutletContext();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation password do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (currentPassword === newPassword) {
      setError('New password cannot be the same as your current password.');
      return;
    }

    setLoading(true);
    try {
      const res = await API.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      if (res.success) {
        setMessage('Password successfully changed.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(res.message || 'Failed to change password.');
      }
    } catch (err) {
      setError(err?.message || err?.response?.data?.message || 'Unable to update your password right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition className="w-full flex-1 flex flex-col bg-[#f8fafc] font-sans text-[#0f172a] antialiased">
      
      
      <main className="w-full flex-1 bg-[#f8fafc] pb-12">
        <StaggerContainer className="px-6 py-8 max-w-3xl mx-auto w-full space-y-6">
          <StaggerItem index={0}>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 md:p-8">
              <h1 className="text-xl font-bold text-[#0b1c30] mb-6">Change Password</h1>
              
              {message && (
                <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-xl text-sm font-medium border border-green-100">
                  {message}
                </div>
              )}
              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-100">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    placeholder="Enter current password"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    placeholder="Enter new password"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    placeholder="Confirm new password"
                    required
                  />
                </div>
                
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full md:w-auto px-6 py-2.5 bg-[#00288e] text-white text-sm font-bold rounded-xl hover:bg-[#1e40af] transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </StaggerItem>
        </StaggerContainer>
      </main>
      <EmployerFooter />
    </PageTransition>
  );
}
