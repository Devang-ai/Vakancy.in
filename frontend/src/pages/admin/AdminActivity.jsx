import React, { useState, useEffect } from 'react';
import {
  Activity,
  Search,
  Filter,
  Clock,
  Shield,
  User,
  Calendar
} from 'lucide-react';
import API from '../../services/api';

export const AdminActivity = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const url = actionFilter ? `/admin/activity?action_type=${actionFilter}` : '/admin/activity';
      const res = await API.get(url);
      if (res.success) {
        setLogs(res.activity || []);
      }
    } catch (err) {
      console.warn('Error fetching activity log:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(l =>
    !search.trim() ||
    (l.description || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.actor_email || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.action_type || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Recruitment Audit & Activity Log</h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable system audit trail tracking candidate views, pipeline transitions, approvals, handovers, and security events.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activity by actor email, description, or action..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-600"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 bg-white focus:outline-hidden focus:border-blue-600"
          >
            <option value="">All Action Types</option>
            <option value="VIEW_CANDIDATE_PROFILE">Candidate Profile Views</option>
            <option value="UPDATE_APPLICATION_STAGE">Stage Updates</option>
            <option value="PROPOSE_CANDIDATE_SHARE">Share Proposals</option>
            <option value="APPROVE_CANDIDATE_SHARE">Share Approvals</option>
            <option value="REVOKE_CANDIDATE_SHARE">Share Revocations</option>
            <option value="CREATE_LEAD">Lead Creations</option>
            <option value="HANDOVER_LEAD">Lead Handovers</option>
            <option value="UPDATE_PERMISSIONS">Permission Changes</option>
          </select>
        </div>
      </div>

      {/* Activity Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Action Type</th>
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5">Actor (Staff)</th>
                <th className="px-5 py-3.5">Target Entity</th>
                <th className="px-5 py-3.5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400">Loading audit trail...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400">
                    <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-600">No activity logs recorded</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">System operations will produce immutable records here.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {log.action_type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium">
                      {log.description}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <div>
                        <span className="font-semibold text-slate-800 block">{log.actor_email || 'System'}</span>
                        <span className="text-[10px] text-blue-700 font-medium capitalize block">{log.actor_role}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {log.entity_type ? `${log.entity_type} (${(log.entity_id || '').slice(0, 8)})` : 'Platform'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminActivity;
