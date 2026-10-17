import React, { useState } from 'react';
import { Settings, Save, CheckCircle2, Shield } from 'lucide-react';

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    siteName: 'Vakancy.in',
    supportEmail: 'support@vakancy.in',
    requireEmployerApproval: true,
    requireJobApproval: false,
  });
  const [msg, setMsg] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    setMsg('Platform settings updated successfully.');
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 font-heading">Platform Global Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Configure global platform metadata, security controls, and operational approval policies</p>
      </div>

      {msg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {msg}
        </div>
      )}

      <form onSubmit={handleSave} className="ep-card p-6 space-y-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Platform Brand Name</label>
            <input
              type="text"
              value={settings.siteName}
              onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
              className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Support Email Address</label>
            <input
              type="email"
              value={settings.supportEmail}
              onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
              className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-700"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 space-y-3">
          <h3 className="text-xs font-bold text-slate-900 font-heading uppercase tracking-wider">Approval & Security Rules</h3>
          
          <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200/80 cursor-pointer">
            <div>
              <span className="font-bold text-slate-900 text-xs block">Mandatory Employer Verification</span>
              <span className="text-[11px] text-slate-500">Require staff approval before new employer accounts can post jobs</span>
            </div>
            <input
              type="checkbox"
              checked={settings.requireEmployerApproval}
              onChange={(e) => setSettings({ ...settings, requireEmployerApproval: e.target.checked })}
              className="w-4 h-4 accent-blue-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200/80 cursor-pointer">
            <div>
              <span className="font-bold text-slate-900 text-xs block">Job Post Moderation</span>
              <span className="text-[11px] text-slate-500">Require staff approval before employer jobs appear publicly</span>
            </div>
            <input
              type="checkbox"
              checked={settings.requireJobApproval}
              onChange={(e) => setSettings({ ...settings, requireJobApproval: e.target.checked })}
              className="w-4 h-4 accent-blue-600 rounded"
            />
          </label>
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 rounded-lg bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-colors"
        >
          <Save className="w-4 h-4" /> Save Configuration
        </button>
      </form>
    </div>
  );
};

export default AdminSettings;

