import React, { useState, useEffect } from 'react';
import { Users, Shield, CheckCircle2, UserX, UserCheck } from 'lucide-react';
import API from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await API.get('/admin/users');
      if (res.success) setUsers(res.users || []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId, currentActive) => {
    try {
      await API.put(`/admin/users/${userId}/status`, { is_active: !currentActive });
      fetchUsers();
    } catch (err) {
      console.warn(err.message);
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await API.put(`/admin/users/${userId}/role`, { role: newRole });
      fetchUsers();
    } catch (err) {
      console.warn(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white font-heading">User Directory & Role Authorization</h1>
        <p className="text-xs text-slate-400">Manage account access, toggle user active status, and reassign system roles</p>
      </div>

      <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider border-b border-white/10">
              <tr>
                <th className="p-4">Email</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Registered Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 font-semibold text-white">{u.email}</td>
                  <td className="p-4 text-slate-400">{u.phone || 'N/A'}</td>
                  <td className="p-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleChangeRole(u.id, e.target.value)}
                      className="p-1.5 rounded-lg glass-input text-xs bg-slate-900 uppercase font-bold"
                    >
                      <option value="candidate">Candidate</option>
                      <option value="employer">Employer</option>
                      <option value="recruiter">Recruiter</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={u.is_active ? 'ACTIVE' : 'DEACTIVATED'} />
                  </td>
                  <td className="p-4 text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleToggleStatus(u.id, u.is_active)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ml-auto ${
                        u.is_active
                          ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                      }`}
                    >
                      {u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
