import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, Shield, AlertCircle } from 'lucide-react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

const AdminSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    siteName: 'Vakancy.in',
    supportEmail: 'support@vakancy.in',
    requireEmployerApproval: true,
    requireJobApproval: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const canEdit = user?.is_main_admin || ['director', 'main_admin'].includes(user?.role);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await API.get('/admin/settings');
      if (res.success && Array.isArray(res.settings)) {
        const map = {};
        res.settings.forEach((item) => {
          if (item?.setting_key) map[item.setting_key] = item.setting_value;
        });
        setSettings((prev) => ({
          siteName: map.siteName || prev.siteName,
          supportEmail: map.supportEmail || prev.supportEmail,
          requireEmployerApproval:
            map.requireEmployerApproval !== undefined
              ? map.requireEmployerApproval === 'true' || map.requireEmployerApproval === true || map.requireEmployerApproval === '1'
              : prev.requireEmployerApproval,
          requireJobApproval:
            map.requireJobApproval !== undefined
              ? map.requireJobApproval === 'true' || map.requireJobApproval === true || map.requireJobApproval === '1'
              : prev.requireJobApproval,
        }));
      }
    } catch (err) {
      console.warn('Error loading platform settings:', err.message);
      setError(err.message || 'Unable to load platform settings from server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canEdit) {
      setError('Forbidden: Only the Platform Director or Main Admin can update platform settings.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setMsg('');

      const payload = [
        { setting_key: 'siteName', setting_value: settings.siteName },
        { setting_key: 'supportEmail', setting_value: settings.supportEmail },
        { setting_key: 'requireEmployerApproval', setting_value: String(settings.requireEmployerApproval) },
        { setting_key: 'requireJobApproval', setting_value: String(settings.requireJobApproval) },
      ];

      const res = await API.put('/admin/settings', { settings: payload });
      if (res.success) {
        setMsg(res.message || 'Platform settings updated successfully.');
        setTimeout(() => setMsg(''), 4000);
      } else {
        setError(res.message || 'Failed to save settings.');
      }
    } catch (err) {
      setError(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 font-heading">Platform Global Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Configure global platform metadata, security controls, and operational approval policies</p>
      </div>

      {!canEdit && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-700 shrink-0" />
          <span>Platform settings are restricted to the Director. Current settings are displayed in view-only mode.</span>
        </div>
      )}

      {msg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> {msg}
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2" role="alert">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /> {error}
        </div>
      )}

      {loading && (
        <p className="ep-card p-4 text-xs text-slate-600" role="status">
          Loading platform settings…
        </p>
      )}

      <form onSubmit={handleSave} className="ep-card p-6 space-y-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Platform Brand Name</label>
            <input
              type="text"
              required
              disabled={!canEdit || saving}
              value={settings.siteName}
              onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
              className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-700 disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Support Email Address</label>
            <input
              type="email"
              required
              disabled={!canEdit || saving}
              value={settings.supportEmail}
              onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
              className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-700 disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 space-y-3">
          <h3 className="text-xs font-bold text-slate-900 font-heading uppercase tracking-wider">Approval & Security Rules</h3>
          
          <label className={`flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200/80 ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}>
            <div>
              <span className="font-bold text-slate-900 text-xs block">Mandatory Employer Verification</span>
              <span className="text-[11px] text-slate-500">Require staff approval before new employer accounts can post jobs</span>
            </div>
            <input
              type="checkbox"
              disabled={!canEdit || saving}
              checked={settings.requireEmployerApproval}
              onChange={(e) => setSettings({ ...settings, requireEmployerApproval: e.target.checked })}
              className="w-4 h-4 accent-blue-600 rounded"
            />
          </label>

          <label className={`flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200/80 ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}>
            <div>
              <span className="font-bold text-slate-900 text-xs block">Job Post Moderation</span>
              <span className="text-[11px] text-slate-500">Require staff approval before employer jobs appear publicly</span>
            </div>
            <input
              type="checkbox"
              disabled={!canEdit || saving}
              checked={settings.requireJobApproval}
              onChange={(e) => setSettings({ ...settings, requireJobApproval: e.target.checked })}
              className="w-4 h-4 accent-blue-600 rounded"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={!canEdit || saving}
          className="px-5 py-2.5 rounded-lg bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Configuration'}
        </button>
      </form>
    </div>
  );
};

export default AdminSettings;

