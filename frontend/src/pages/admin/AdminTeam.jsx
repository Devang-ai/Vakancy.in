import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Shield,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Building2,
  Briefcase,
  UserCheck,
  User,
  Edit2,
  Network,
  Phone,
  Mail
} from 'lucide-react';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/admin/StatusBadge';
import ModalDialog from '../../components/admin/ModalDialog';

export const AdminTeam = () => {
  const { user } = useAuth();
  const [teamUsers, setTeamUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form State for creating staff
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'recruiter',
    phone: '',
    reporting_user_id: '',
    team_id: '',
    scope_type: 'scoped',
    profile_photo_url: ''
  });

  // Form State for editing staff administrative profile
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    role: 'recruiter',
    phone: '',
    reporting_user_id: '',
    team_id: '',
    scope_type: 'scoped',
    is_active: 1,
    profile_photo_url: ''
  });

  const [showPassword, setShowPassword] = useState(false);

  const generateSecurePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let pwd = '';
    for (let i = 0; i < 14; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password: pwd }));
    setShowPassword(true);
  };

  const userRole = (user?.role || '').toLowerCase();
  const isDirector = userRole === 'director' || userRole === 'main_admin' || userRole === 'admin' || user?.is_main_admin === 1;

  useEffect(() => {
    fetchTeamUsers();
    fetchMetadata();
  }, []);

  const fetchTeamUsers = async () => {
    try {
      setLoading(true);
      const res = await API.get('/admin/users');
      if (res.success) {
        // Filter to internal staff accounts
        const staff = (res.users || []).filter(u =>
          ['director', 'bd_lead', 'tl_coordinator', 'recruiter', 'admin', 'main_admin'].includes(u.role) ||
          u.is_main_admin === 1 ||
          Boolean(u.role_display_name)
        );
        setTeamUsers(staff);
      }
    } catch (err) {
      console.warn('Error fetching team users:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [teamsRes, rolesRes] = await Promise.all([
        API.get('/admin/teams'),
        API.get('/admin/roles')
      ]);
      if (teamsRes.success) setTeams(teamsRes.teams || []);
      if (rolesRes.success) setRoles(rolesRes.roles || []);
    } catch (_) {}
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!formData.email.trim() || !formData.password) {
      setErrorMessage('Email and initial password are required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim() || null,
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
        phone: formData.phone.trim() || null,
        reporting_user_id: formData.reporting_user_id || null,
        team_id: formData.team_id || null,
        scope_type: formData.scope_type || 'scoped',
        profile_photo_url: formData.profile_photo_url.trim() || null
      };

      const res = await API.post('/admin/team', payload);
      if (res.success) {
        setCreateModalOpen(false);
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'recruiter',
          phone: '',
          reporting_user_id: '',
          team_id: '',
          scope_type: 'scoped',
          profile_photo_url: ''
        });
        fetchTeamUsers();
      } else {
        setErrorMessage(res.message || 'Failed to create team member.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create team member.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (u) => {
    setSelectedUser(u);
    setErrorMessage('');
    setEditFormData({
      name: u.name || '',
      email: u.email || '',
      role: u.role || 'recruiter',
      phone: u.phone || '',
      reporting_user_id: u.reporting_user_id || '',
      team_id: u.team_id || '',
      scope_type: u.scope_type || 'scoped',
      is_active: u.is_active ? 1 : 0,
      profile_photo_url: u.profile_photo_url || ''
    });
    setEditModalOpen(true);
  };

  const handleUpdateAdminProfile = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setErrorMessage('');

    try {
      setSubmitting(true);
      const payload = {
        name: editFormData.name.trim() || null,
        email: editFormData.email.trim(),
        role: editFormData.role,
        phone: editFormData.phone.trim() || null,
        reporting_user_id: editFormData.role === 'director' ? null : (editFormData.reporting_user_id || null),
        team_id: editFormData.team_id || null,
        scope_type: editFormData.scope_type,
        is_active: Number(editFormData.is_active),
        profile_photo_url: editFormData.profile_photo_url.trim() || null
      };

      const res = await API.put(`/admin/users/${selectedUser.id}/admin-profile`, payload);
      if (res.success) {
        setEditModalOpen(false);
        setSelectedUser(null);
        fetchTeamUsers();
      } else {
        setErrorMessage(res.message || 'Failed to update administrative profile.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error updating administrative profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      const res = await API.put(`/admin/users/${userId}/status`);
      if (res.success) {
        fetchTeamUsers();
      } else {
        alert(res.message || 'Failed to update status.');
      }
    } catch (err) {
      alert('Error updating user status: ' + err.message);
    }
  };

  const filteredUsers = teamUsers.filter(u =>
    !search.trim() ||
    (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.role_display_name || u.role).toLowerCase().includes(search.toLowerCase())
  );

  // Eligible reporting heads: active staff members
  const eligibleHeads = teamUsers.filter(u => u.is_active && u.role !== 'candidate' && u.role !== 'employer');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Team Management & Staff Directory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage internal recruitment staff, reporting hierarchy, role assignments, and operational scopes.
          </p>
        </div>
        <div>
          {isDirector && (
            <button
              onClick={() => {
                setErrorMessage('');
                setCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff by name, email, or role..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-600"
          />
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Staff Member</th>
                <th className="px-5 py-3.5">Assigned Role</th>
                <th className="px-5 py-3.5">Reporting Head</th>
                <th className="px-5 py-3.5">Team Group</th>
                <th className="px-5 py-3.5">Operational Scope</th>
                <th className="px-5 py-3.5">Account Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">Loading staff directory...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-600">No staff accounts found</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isUserDirector = u.role === 'director' || u.is_main_admin === 1;
                  const initials = (u.name || u.email || 'U')
                    .split(' ')
                    .map(n => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-slate-900">
                        <div className="flex items-center gap-3">
                          {u.profile_photo_url ? (
                            <img
                              src={u.profile_photo_url}
                              alt={u.name || u.email}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                              {initials}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-semibold block text-slate-900">{u.name || 'Unnamed Staff'}</span>
                            <span className="text-[11px] text-slate-500 block truncate">{u.email}</span>
                            {u.phone && <span className="text-[10px] text-slate-400 block">{u.phone}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold inline-block border ${
                          isUserDirector
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : u.role === 'bd_lead'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : u.role === 'tl_coordinator'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {u.role_display_name || u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {isUserDirector ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                            <Shield className="w-3 h-3" /> Top Hierarchy
                          </span>
                        ) : u.reporting_head_name ? (
                          <div className="text-[11px]">
                            <span className="font-medium text-slate-900 block">{u.reporting_head_name}</span>
                            <span className="text-[10px] text-slate-400 block">{u.reporting_head_email}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">None assigned</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        <span>{u.team_name || 'Core Operations'}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        <span className="capitalize">{u.scope_type || 'global'}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {u.is_active ? (
                          <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="text-rose-600 font-medium inline-flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Deactivated
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        {isDirector && (
                          <>
                            <button
                              onClick={() => openEditModal(u)}
                              className="px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 rounded border border-blue-200 transition-colors inline-flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleToggleStatus(u.id)}
                              className={`px-2.5 py-1 text-xs font-semibold rounded border transition-colors ${
                                u.is_active
                                  ? 'text-rose-700 hover:bg-rose-50 border-rose-200'
                                  : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                              }`}
                            >
                              {u.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Staff Member Modal */}
      <ModalDialog
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add Staff Member"
        subtitle="Create an internal account with role, hierarchical reporting head, and team scoping."
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Tosif Abbasi or Priya Sharma"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. member@vakancy.com"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-700">Initial Password *</label>
              <button
                type="button"
                onClick={generateSecurePassword}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                + Generate Secure
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter or generate a strong password"
                className="w-full px-3 py-1.5 pr-16 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-600 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 hover:text-slate-700 font-medium px-1.5 py-0.5 rounded bg-slate-100"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
              >
                <option value="recruiter">Recruiter</option>
                <option value="tl_coordinator">TL / Client Coordinator</option>
                <option value="bd_lead">BD Lead</option>
                <option value="director">Director (Main Admin)</option>
                {roles
                  .filter(r => !['director', 'bd_lead', 'tl_coordinator', 'recruiter'].includes(r.role_key))
                  .map(r => (
                    <option key={r.role_key} value={r.role_key}>{r.display_name || r.role_key}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Reporting Head</label>
              <select
                value={formData.reporting_user_id}
                onChange={(e) => setFormData({ ...formData, reporting_user_id: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                disabled={formData.role === 'director'}
              >
                <option value="">{formData.role === 'director' ? 'None (Director)' : 'Select Reporting Head...'}</option>
                {eligibleHeads.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.name ? `${h.name} (${h.role})` : `${h.email} (${h.role})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Team Group</label>
              <select
                value={formData.team_id}
                onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
              >
                <option value="">Core Operations (Default)</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Operational Scope</label>
              <select
                value={formData.scope_type}
                onChange={(e) => setFormData({ ...formData, scope_type: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
              >
                <option value="scoped">Scoped (Assigned mandates only)</option>
                <option value="global">Global (Full visibility)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 00000"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Profile Photo URL</label>
              <input
                type="url"
                value={formData.profile_photo_url}
                onChange={(e) => setFormData({ ...formData, profile_photo_url: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Edit Administrative Profile Modal */}
      <ModalDialog
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Staff Administrative Profile"
        subtitle={`Editing account governance for: ${selectedUser?.email}`}
      >
        <form onSubmit={handleUpdateAdminProfile} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              placeholder="e.g. Tosif Abbasi"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={editFormData.email}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Role *</label>
              <select
                value={editFormData.role}
                onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
              >
                <option value="recruiter">Recruiter</option>
                <option value="tl_coordinator">TL / Client Coordinator</option>
                <option value="bd_lead">BD Lead</option>
                <option value="director">Director (Main Admin)</option>
                {roles
                  .filter(r => !['director', 'bd_lead', 'tl_coordinator', 'recruiter'].includes(r.role_key))
                  .map(r => (
                    <option key={r.role_key} value={r.role_key}>{r.display_name || r.role_key}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Reporting Head</label>
              <select
                value={editFormData.reporting_user_id}
                onChange={(e) => setEditFormData({ ...editFormData, reporting_user_id: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                disabled={editFormData.role === 'director'}
              >
                <option value="">{editFormData.role === 'director' ? 'None (Director)' : 'Select Reporting Head...'}</option>
                {eligibleHeads
                  .filter(h => h.id !== selectedUser?.id)
                  .map(h => (
                    <option key={h.id} value={h.id}>
                      {h.name ? `${h.name} (${h.role})` : `${h.email} (${h.role})`}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Team Group</label>
              <select
                value={editFormData.team_id}
                onChange={(e) => setEditFormData({ ...editFormData, team_id: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
              >
                <option value="">Core Operations (Default)</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Operational Scope</label>
              <select
                value={editFormData.scope_type}
                onChange={(e) => setEditFormData({ ...editFormData, scope_type: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
              >
                <option value="scoped">Scoped (Assigned mandates only)</option>
                <option value="global">Global (Full visibility)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                placeholder="+91 98765 00000"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Account Status</label>
              <select
                value={editFormData.is_active}
                onChange={(e) => setEditFormData({ ...editFormData, is_active: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
              >
                <option value={1}>Active</option>
                <option value={0}>Deactivated</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
};

export default AdminTeam;
