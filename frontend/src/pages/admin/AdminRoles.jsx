import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Check,
  X,
  Save,
  RotateCcw,
  Info,
  CheckCircle2
} from 'lucide-react';
import API from '../../services/api';

const MODULES = [
  { key: 'dashboard', name: 'Dashboard' },
  { key: 'candidates', name: 'Candidates' },
  { key: 'jobs', name: 'Job Requisitions' },
  { key: 'applications', name: 'Applications' },
  { key: 'candidate_sharing', name: 'Candidate Sharing' },
  { key: 'enquiries', name: 'Recruitment Enquiries' },
  { key: 'employers', name: 'Employers / Clients' },
  { key: 'leads', name: 'BD Leads' },
  { key: 'team', name: 'Team Management' },
  { key: 'roles', name: 'Roles & Permissions' },
  { key: 'activity_log', name: 'Activity Log' }
];

const ACTIONS = [
  { key: 'view', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
  { key: 'assign', label: 'Assign' },
  { key: 'approve', label: 'Approve' },
  { key: 'share', label: 'Share' },
  { key: 'export', label: 'Export' }
];

export const AdminRoles = () => {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('director');
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const fetchRolesAndPermissions = async () => {
    try {
      setLoading(true);
      const [rolesRes, permsRes] = await Promise.all([
        API.get('/admin/roles'),
        API.get('/admin/permissions')
      ]);

      if (rolesRes.success) setRoles(rolesRes.roles || []);

      if (permsRes.success) {
        // Group permissions by role_key -> module -> action -> is_granted
        const permMap = {};
        (permsRes.permissions || []).forEach(p => {
          if (!permMap[p.role_key]) permMap[p.role_key] = {};
          if (!permMap[p.role_key][p.module]) permMap[p.role_key][p.module] = {};
          permMap[p.role_key][p.module][p.action] = Boolean(p.is_granted);
        });
        setPermissions(permMap);
      }
    } catch (err) {
      console.warn('Error loading roles/permissions:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (mod, act) => {
    if (selectedRole === 'director') return; // Director permissions are locked on
    setPermissions(prev => {
      const rolePerms = { ...(prev[selectedRole] || {}) };
      const modPerms = { ...(rolePerms[mod] || {}) };
      modPerms[act] = !modPerms[act];
      rolePerms[mod] = modPerms;
      return {
        ...prev,
        [selectedRole]: rolePerms
      };
    });
    setSavedSuccess(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const currentRolePerms = permissions[selectedRole] || {};
      const payloadPerms = [];

      MODULES.forEach(m => {
        ACTIONS.forEach(a => {
          const isGranted = Boolean(currentRolePerms[m.key]?.[a.key]);
          payloadPerms.push({
            module: m.key,
            action: a.key,
            is_granted: isGranted
          });
        });
      });

      const res = await API.put('/admin/permissions', {
        role_key: selectedRole,
        permissions: payloadPerms
      });

      if (res.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      alert('Failed to save permissions: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const isGranted = (mod, act) => {
    if (selectedRole === 'director') return true;
    return Boolean(permissions[selectedRole]?.[mod]?.[act]);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Roles & Dynamic Permissions Matrix</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure module and action permissions persistently in the database. Changes take effect instantly without deployment.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedSuccess && (
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || selectedRole === 'director'}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Permissions'}</span>
          </button>
        </div>
      </div>

      {/* Role Selection Tabs */}
      <div className="flex flex-wrap gap-2">
        {roles.map(r => (
          <button
            key={r.role_key}
            onClick={() => {
              setSelectedRole(r.role_key);
              setSavedSuccess(false);
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              selectedRole === r.role_key
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
            }`}
          >
            {r.display_name}
          </button>
        ))}
      </div>

      {/* Role Info Callout */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-slate-900">
            {roles.find(r => r.role_key === selectedRole)?.display_name || selectedRole}
          </p>
          <p className="text-slate-500 mt-0.5">
            {roles.find(r => r.role_key === selectedRole)?.description || 'Configurable recruitment permissions matrix.'}
          </p>
          {selectedRole === 'director' && (
            <p className="text-blue-700 font-medium text-[11px] mt-1">
              Director possesses global unconstrained authority across all operations by system policy.
            </p>
          )}
        </div>
      </div>

      {/* Permissions Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Module</th>
                {ACTIONS.map(a => (
                  <th key={a.key} className="px-4 py-3.5 text-center">{a.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MODULES.map(m => (
                <tr key={m.key} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-slate-900">
                    {m.name}
                  </td>
                  {ACTIONS.map(a => {
                    const granted = isGranted(m.key, a.key);
                    return (
                      <td key={a.key} className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          disabled={selectedRole === 'director'}
                          onClick={() => togglePermission(m.key, a.key)}
                          className={`w-6 h-6 rounded-md inline-flex items-center justify-center transition-colors ${
                            granted
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-50 text-slate-300 border border-slate-200 hover:border-slate-300'
                          } ${selectedRole === 'director' ? 'cursor-default' : 'cursor-pointer'}`}
                          title={`${granted ? 'Revoke' : 'Grant'} ${a.label} on ${m.name}`}
                        >
                          {granted ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <X className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminRoles;
