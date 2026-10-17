import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, CheckCircle2, UserX, UserCheck, X, AlertCircle } from 'lucide-react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import AdminBadge from '../components/common/AdminBadge';

const AdminTeamMembers = () => {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'recruiter', phone: '' });
  const [msg, setMsg] = useState({ type: '', text: '' });

  const isMainAdmin = user?.is_main_admin || user?.role === 'main_admin';

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const res = await API.get('/admin/team');
      if (res.success) setTeamMembers(res.users || []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId, currentActive) => {
    try {
      await API.put(`/admin/users/${userId}/status`, { is_active: !currentActive });
      fetchTeamMembers();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await API.put(`/admin/users/${userId}/role`, { role: newRole });
      fetchTeamMembers();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const handleCreateTeamMember = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    try {
      const res = await API.post('/admin/team', formData);
      if (res.success) {
        setMsg({ type: 'success', text: res.message || 'Internal team member account created successfully.' });
        setIsModalOpen(false);
        setFormData({ name: '', email: '', password: '', role: 'recruiter', phone: '' });
        fetchTeamMembers();
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-heading">Internal Team Members</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage internal staff accounts, assign operational roles, and set account activation status
          </p>
        </div>

        {isMainAdmin ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-lg bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 self-start sm:self-auto transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Create Team Member
          </button>
        ) : (
          <div className="px-3.5 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Only Main Admin can create team members</span>
          </div>
        )}
      </div>

      {msg.text && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${msg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'}`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{msg.text}</span>
        </div>
      )}

      {/* Role Permissions Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-xs">
          <span className="font-bold text-rose-800 block">MAIN ADMIN</span>
          <span className="text-[11px] text-slate-500">Full system access & exclusive team member creation</span>
        </div>
        <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-xs">
          <span className="font-bold text-indigo-800 block">HR MANAGER</span>
          <span className="text-[11px] text-slate-500">Recruitment operations & enquiry handling</span>
        </div>
        <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-xs">
          <span className="font-bold text-blue-800 block">RECRUITER</span>
          <span className="text-[11px] text-slate-500">Candidate & application lifecycle management</span>
        </div>
        <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-xs">
          <span className="font-bold text-emerald-800 block">HR EXECUTIVE</span>
          <span className="text-[11px] text-slate-500">Assigned recruitment & enquiry operations</span>
        </div>
        <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-xs">
          <span className="font-bold text-slate-700 block">VIEWER</span>
          <span className="text-[11px] text-slate-500">Read-only view of permitted recruitment data</span>
        </div>
      </div>

      <div className="ep-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">Name / Email</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Assigned Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created Date</th>
                {isMainAdmin && <th className="p-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {teamMembers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4">
                    <span className="font-bold text-slate-900 block">{u.name || 'Staff Member'}</span>
                    <span className="text-slate-500 text-[11px]">{u.email}</span>
                  </td>
                  <td className="p-4 text-slate-500">{u.phone || 'N/A'}</td>
                  <td className="p-4">
                    {isMainAdmin && u.id !== user?.id ? (
                      <select
                        value={u.role}
                        onChange={(e) => handleChangeRole(u.id, e.target.value)}
                        className="p-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold uppercase text-slate-800 focus:outline-none focus:border-blue-700"
                      >
                        <option value="main_admin">Main Admin</option>
                        <option value="hr_manager">HR Manager</option>
                        <option value="recruiter">Recruiter</option>
                        <option value="hr_executive">HR Executive</option>
                        <option value="viewer">Viewer (Read-Only)</option>
                      </select>
                    ) : (
                      <AdminBadge status={u.role} />
                    )}
                  </td>
                  <td className="p-4">
                    <AdminBadge status={u.is_active ? 'active' : 'deactivated'} />
                  </td>
                  <td className="p-4 text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                  {isMainAdmin && (
                    <td className="p-4 text-right">
                      {u.id !== user?.id ? (
                        <button
                          onClick={() => handleToggleStatus(u.id, u.is_active)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors ${
                            u.is_active
                              ? 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          {u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">Current User</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Team Member Modal (Only visible if Main Admin) */}
      {isModalOpen && isMainAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 shadow-xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 font-heading mb-1">Create Internal Team Member</h3>
            <p className="text-xs text-slate-500 mb-4">Main Admin Authorized Action</p>

            <form onSubmit={handleCreateTeamMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Rahul Sharma"
                  className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="rahul@vakancy.in"
                  className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-700"
                >
                  <option value="hr_manager">HR Manager</option>
                  <option value="recruiter">Recruiter</option>
                  <option value="hr_executive">HR Executive</option>
                  <option value="viewer">Viewer (Read-Only)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Phone Number</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-700"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs shadow-xs transition-colors"
              >
                Create Team Account
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTeamMembers;

