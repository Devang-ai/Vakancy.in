import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, CheckCircle2, XCircle, Globe, Mail, Phone, Search } from 'lucide-react';
import API from '../services/api';
import AdminBadge from '../components/common/AdminBadge';

const AdminEmployers = () => {
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get('status') || 'all';
  const [employers, setEmployers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(initialFilter);
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState('');
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchEmployers();
  }, []);

  const fetchEmployers = async () => {
    try {
      setLoading(true);
      setActionError('');
      const res = await API.get('/admin/employers');
      if (res.success) setEmployers(res.employers || []);
    } catch (err) {
      console.warn(err.message);
      setActionError(err.message || 'Unable to load employer accounts.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      setProcessingId(id);
      setActionError('');
      await API.put(`/admin/employers/${id}/approve`);
      await fetchEmployers();
    } catch (err) {
      console.warn(err.message);
      setActionError(err.message || 'Failed to approve employer account.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id) => {
    try {
      setProcessingId(id);
      setActionError('');
      await API.put(`/admin/employers/${id}/reject`);
      await fetchEmployers();
    } catch (err) {
      console.warn(err.message);
      setActionError(err.message || 'Failed to reject employer account.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleCandidateAccess = async (employer) => {
    const currentAccess = Boolean(employer.candidate_access_enabled);
    const newAccess = !currentAccess;
    try {
      setProcessingId(employer.id);
      setActionError('');
      setEmployers((prev) =>
        prev.map((e) => (e.id === employer.id ? { ...e, candidate_access_enabled: newAccess ? 1 : 0 } : e))
      );
      const res = await API.put(`/admin/employers/${employer.id}/candidate-access`, {
        candidate_access_enabled: newAccess
      });
      if (!res.success) {
        throw new Error(res.message || 'Failed to update candidate access');
      }
    } catch (err) {
      console.warn(err.message);
      setActionError(err.message || 'Failed to toggle candidate database access.');
      setEmployers((prev) =>
        prev.map((e) => (e.id === employer.id ? { ...e, candidate_access_enabled: currentAccess ? 1 : 0 } : e))
      );
    } finally {
      setProcessingId(null);
    }
  };

  const filteredEmployers = employers.filter((e) => {
    const matchesFilter = filter === 'all' || e.approval_status === filter;
    const searchLower = search.toLowerCase();
    const matchesSearch =
      !search ||
      e.company_name?.toLowerCase().includes(searchLower) ||
      e.official_email?.toLowerCase().includes(searchLower) ||
      e.contact_email?.toLowerCase().includes(searchLower) ||
      e.user_email?.toLowerCase().includes(searchLower) ||
      e.contact_person_name?.toLowerCase().includes(searchLower) ||
      e.industry?.toLowerCase().includes(searchLower);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 font-heading">Employer Management & Verification</h1>
        <p className="text-xs text-slate-500 mt-1">Review registered employer profiles, verify company details, and approve or reject access</p>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium" role="alert">
          {actionError}
        </div>
      )}

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
                <th className="p-4">Account Status</th>
                <th className="p-4 text-center">Candidate DB Access</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {filteredEmployers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
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
                        <Mail className="w-3 h-3 text-slate-400" /> {e.official_email || e.contact_email || e.user_email || e.email || 'No email provided'}
                      </div>
                      {(e.official_phone || e.contact_phone || e.phone) && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <Phone className="w-3 h-3 text-slate-400" /> {e.official_phone || e.contact_phone || e.phone}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <AdminBadge status={e.approval_status || 'approved'} />
                    </td>
                    <td className="p-4 text-center">
                      <button
                        id={`btn-toggle-candidate-access-${e.id}`}
                        type="button"
                        onClick={() => handleToggleCandidateAccess(e)}
                        disabled={processingId === e.id}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50 ${
                          e.candidate_access_enabled
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                        }`}
                        title={
                          e.candidate_access_enabled
                            ? 'Candidate Talent Database Access is ON (Direct candidate evaluation unlocked). Click to lock.'
                            : 'Candidate Talent Database Access is OFF (Locked behind Request Callback). Click to unlock.'
                        }
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            e.candidate_access_enabled ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'
                          }`}
                        />
                        <span>{e.candidate_access_enabled ? 'Access ON' : 'Access OFF'}</span>
                      </button>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {e.approval_status !== 'approved' && (
                        <button
                          onClick={() => handleApprove(e.id)}
                          disabled={processingId === e.id}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 font-semibold inline-flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> {processingId === e.id ? 'Updating…' : 'Approve'}
                        </button>
                      )}
                      {e.approval_status !== 'rejected' && (
                        <button
                          onClick={() => handleReject(e.id)}
                          disabled={processingId === e.id}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 font-semibold inline-flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <XCircle className="w-3.5 h-3.5" /> {processingId === e.id ? 'Updating…' : 'Reject'}
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

