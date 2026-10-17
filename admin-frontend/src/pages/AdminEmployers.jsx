import React, { useState, useEffect } from 'react';
import { Building2, CheckCircle2, XCircle, Globe, Mail, Phone, Search } from 'lucide-react';
import API from '../services/api';
import AdminBadge from '../components/common/AdminBadge';

const AdminEmployers = () => {
  const [employers, setEmployers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchEmployers();
  }, []);

  const fetchEmployers = async () => {
    try {
      setLoading(true);
      const res = await API.get('/admin/employers');
      if (res.success) setEmployers(res.employers || []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await API.put(`/admin/employers/${id}/approve`);
      fetchEmployers();
    } catch (err) {
      console.warn(err.message);
    }
  };

  const handleReject = async (id) => {
    try {
      await API.put(`/admin/employers/${id}/reject`);
      fetchEmployers();
    } catch (err) {
      console.warn(err.message);
    }
  };

  const filteredEmployers = employers.filter((e) => {
    const matchesFilter = filter === 'all' || e.approval_status === filter;
    const matchesSearch =
      !search ||
      e.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.email?.toLowerCase().includes(search.toLowerCase()) ||
      e.industry?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 font-heading">Employer Management & Verification</h1>
        <p className="text-xs text-slate-500 mt-1">Review registered employer profiles, verify company details, and approve or reject access</p>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {['all', 'pending', 'approved', 'rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                filter === st
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, email, industry..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-700"
          />
        </div>
      </div>

      {/* Employers Table */}
      <div className="ep-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">Company Name</th>
                <th className="p-4">Industry</th>
                <th className="p-4">Contact Info</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {filteredEmployers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No employers found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployers.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-sm">{e.company_name}</div>
                      {e.website && (
                        <a
                          href={e.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-blue-700 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <Globe className="w-3 h-3" /> {e.website}
                        </a>
                      )}
                    </td>
                    <td className="p-4 text-slate-700">{e.industry || 'General'}</td>
                    <td className="p-4 text-slate-500 space-y-0.5">
                      <div className="flex items-center gap-1 text-slate-800">
                        <Mail className="w-3 h-3 text-slate-400" /> {e.email}
                      </div>
                      {e.phone && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <Phone className="w-3 h-3 text-slate-400" /> {e.phone}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <AdminBadge status={e.approval_status || 'approved'} />
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {e.approval_status !== 'approved' && (
                        <button
                          onClick={() => handleApprove(e.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 font-semibold inline-flex items-center gap-1 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                      )}
                      {e.approval_status !== 'rejected' && (
                        <button
                          onClick={() => handleReject(e.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 font-semibold inline-flex items-center gap-1 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
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

export default AdminEmployers;

