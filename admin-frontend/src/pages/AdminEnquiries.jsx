import React, { useState, useEffect } from 'react';
import { HelpCircle, Mail, Phone, Building2, CheckCircle2, Clock, UserCheck } from 'lucide-react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

const AdminEnquiries = () => {
  const { user } = useAuth();
  const [enquiries, setEnquiries] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [enqRes, teamRes] = await Promise.all([
        API.get('/admin/enquiries').catch(() => ({ success: false })),
        API.get('/admin/team').catch(() => ({ success: false })),
      ]);
      if (enqRes.success) setEnquiries(enqRes.enquiries || []);
      if (teamRes.success) setTeamMembers(teamRes.users || []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus, currentHandler) => {
    try {
      const handlerToUse = currentHandler || user?.id;
      await API.put(`/admin/enquiries/${id}/status`, {
        status: newStatus,
        handled_by: handlerToUse,
      });
      fetchData();
    } catch (err) {
      console.warn(err.message);
    }
  };

  const filteredEnquiries = enquiries.filter((e) => {
    if (filter === 'all') return true;
    return e.status === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-heading">Recruitment & Employer Enquiries</h1>
          <p className="text-xs text-slate-500 mt-1">Track incoming employer interest, assign staff handlers, and record enquiry fulfillment activity</p>
        </div>

        <div className="flex items-center gap-2">
          {['all', 'pending', 'in_progress', 'resolved'].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                filter === st
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="ep-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">Sender / Company</th>
                <th className="p-4">Enquiry Type / Message</th>
                <th className="p-4">Status</th>
                <th className="p-4">Handled By</th>
                <th className="p-4">Timestamp</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {filteredEnquiries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No enquiries found for selected filter.
                  </td>
                </tr>
              ) : (
                filteredEnquiries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-sm">{e.name || e.company_name || 'Contact'}</div>
                      <div className="text-[11px] text-slate-500 space-y-0.5 mt-0.5">
                        <div className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" /> {e.email}</div>
                        {e.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {e.phone}</div>}
                      </div>
                    </td>
                    <td className="p-4 max-w-xs">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 uppercase block w-fit mb-1">
                        {e.enquiry_type || 'General'}
                      </span>
                      <p className="text-slate-800 text-xs truncate">{e.message || e.subject}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                        e.status === 'resolved'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : e.status === 'in_progress'
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {(e.status || 'pending').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-slate-700">
                      {e.handler_name || e.handler_email ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-800">
                          <UserCheck className="w-3.5 h-3.5 text-blue-700" />
                          <span>{e.handler_name || e.handler_email}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-500 whitespace-nowrap">
                      {new Date(e.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {e.status !== 'in_progress' && (
                        <button
                          onClick={() => handleUpdateStatus(e.id, 'in_progress', e.handled_by)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 hover:bg-blue-100 text-[11px] font-semibold border border-blue-200 transition-colors"
                        >
                          Mark In Progress
                        </button>
                      )}
                      {e.status !== 'resolved' && (
                        <button
                          onClick={() => handleUpdateStatus(e.id, 'resolved', e.handled_by)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-[11px] font-semibold border border-emerald-200 transition-colors"
                        >
                          Mark Resolved
                        </button>
                      )}
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

export default AdminEnquiries;

