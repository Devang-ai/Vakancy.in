import React, { useState, useEffect } from 'react';
import { Building, Globe, CheckCircle2, Loader2 } from 'lucide-react';
import API from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const EmployerProfile = () => {
  const [formData, setFormData] = useState({ company_name: '', industry: '', website: '' });
  const [activeSub, setActiveSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await API.get('/employers/profile');
      if (res.success && res.employer) {
        setFormData({
          company_name: res.employer.company_name || '',
          industry: res.employer.industry || '',
          website: res.employer.website || ''
        });
        setActiveSub(res.employer.active_subscription);
      }
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg({ type: '', text: '' });
    try {
      const res = await API.put('/employers/profile', formData);
      if (res.success) {
        setMsg({ type: 'success', text: 'Company profile updated successfully.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin text-cyan-400" /> Loading Employer Profile...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold text-white font-heading">Company Profile</h1>
        <p className="text-xs text-slate-400">Manage company details, industry categorization, and website info</p>
      </div>

      {msg.text && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-2 ${msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'}`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{msg.text}</span>
        </div>
      )}

      {/* Subscription Summary Badge */}
      <div className="glass-card p-5 rounded-2xl border border-white/10 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Subscription Access</span>
          <h4 className="text-sm font-bold text-white mt-0.5">
            {activeSub ? activeSub.plan_name : 'No Active Subscription Plan'}
          </h4>
          {activeSub && (
            <p className="text-xs text-slate-400 mt-0.5">
              Unlocks remaining: <strong className="text-cyan-400">{activeSub.unlocks_remaining}</strong> / {activeSub.unlock_limit}
            </p>
          )}
        </div>
        <StatusBadge status={activeSub ? 'ACTIVE' : 'INACTIVE'} />
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Company Name *</label>
          <input
            type="text"
            required
            value={formData.company_name}
            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            className="w-full p-2.5 rounded-xl glass-input text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Industry Sector</label>
          <input
            type="text"
            value={formData.industry}
            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            placeholder="e.g. Information Technology & Services"
            className="w-full p-2.5 rounded-xl glass-input text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Company Website</label>
          <input
            type="url"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            placeholder="https://company.com"
            className="w-full p-2.5 rounded-xl glass-input text-xs"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20"
        >
          {submitting ? 'Updating...' : 'Save Profile Details'}
        </button>
      </form>
    </div>
  );
};

export default EmployerProfile;
