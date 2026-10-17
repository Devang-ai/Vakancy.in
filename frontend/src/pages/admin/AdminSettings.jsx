import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, Shield, ToggleLeft, ToggleRight } from 'lucide-react';
import API from '../../services/api';

const AdminSettings = () => {
  const [settingsMap, setSettingsMap] = useState({
    site_name: 'Vakancy.in Recruitment Platform',
    support_email: 'support@vakancy.in',
    require_job_approval: 'false',
    maintenance_mode: 'false'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await API.get('/admin/settings');
      if (res.success && Array.isArray(res.settings)) {
        const map = { ...settingsMap };
        res.settings.forEach((s) => {
          if (s.setting_key) map[s.setting_key] = s.setting_value;
        });
        setSettingsMap(map);
      }
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: '', text: '' });
    try {
      const payload = Object.keys(settingsMap).map((key) => ({
        setting_key: key,
        setting_value: String(settingsMap[key])
      }));
      const res = await API.put('/admin/settings', { settings: payload });
      if (res.success) {
        setMsg({ type: 'success', text: 'Platform settings updated successfully.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold text-white font-heading">Platform Operational Settings</h1>
        <p className="text-xs text-slate-400">Configure global Vakancy.in recruitment platform rules, support contacts, and moderation policies</p>
      </div>

      {msg.text && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'}`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{msg.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5 p-6 rounded-2xl bg-slate-900/80 border border-white/10">
        <div>
          <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1">Platform Brand / Site Name</label>
          <input
            type="text"
            required
            value={settingsMap.site_name || ''}
            onChange={(e) => setSettingsMap({ ...settingsMap, site_name: e.target.value })}
            className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1">Support Contact Email</label>
          <input
            type="email"
            required
            value={settingsMap.support_email || ''}
            onChange={(e) => setSettingsMap({ ...settingsMap, support_email: e.target.value })}
            className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white"
          />
        </div>

        <div className="pt-2 border-t border-white/10 space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-white/5">
            <div>
              <span className="font-bold text-white text-xs block">Require Admin Job Posting Approval</span>
              <span className="text-[11px] text-slate-400">When enabled, newly posted jobs require admin approval before becoming publicly visible.</span>
            </div>
            <button
              type="button"
              onClick={() => setSettingsMap({ ...settingsMap, require_job_approval: settingsMap.require_job_approval === 'true' ? 'false' : 'true' })}
              className="text-slate-300 hover:text-white"
            >
              {settingsMap.require_job_approval === 'true' ? (
                <ToggleRight className="w-8 h-8 text-rose-400" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-500" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-white/5">
            <div>
              <span className="font-bold text-white text-xs block">Platform Maintenance Mode</span>
              <span className="text-[11px] text-slate-400">Restrict non-admin user access for routine maintenance windows.</span>
            </div>
            <button
              type="button"
              onClick={() => setSettingsMap({ ...settingsMap, maintenance_mode: settingsMap.maintenance_mode === 'true' ? 'false' : 'true' })}
              className="text-slate-300 hover:text-white"
            >
              {settingsMap.maintenance_mode === 'true' ? (
                <ToggleRight className="w-8 h-8 text-rose-400" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-500" />
              )}
            </button>
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-500/20 flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving Settings...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminSettings;
