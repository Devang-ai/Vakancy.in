import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  PhoneCall,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertCircle,
  Building2,
  Briefcase,
  Calendar,
  X,
  MessageSquare,
  Sparkles,
  Users
} from 'lucide-react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import useModalA11y from '../hooks/useModalA11y';

const AdminCallbacks = () => {
  const { user } = useAuth();
  const isDirector = user?.role === 'director' || user?.role === 'main_admin' || user?.is_main_admin === 1;

  const [callbacks, setCallbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);

  // Edit / Status update modal
  const [selectedCallback, setSelectedCallback] = useState(null);
  const [updateStatus, setUpdateStatus] = useState('NEW');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [resolutionOutcome, setResolutionOutcome] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useModalA11y(Boolean(selectedCallback), () => setSelectedCallback(null));

  // Lock background scroll when modal is open
  useEffect(() => {
    if (selectedCallback) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedCallback]);

  useEffect(() => {
    fetchCallbacks();
    fetchTeamMembers();
  }, [filter]);

  const fetchCallbacks = async () => {
    try {
      setLoading(true);
      const query = filter !== 'all' ? `?status=${filter}` : '';
      const res = await API.get(`/admin/callbacks${query}`);
      if (res.success) {
        setCallbacks(res.callbacks || []);
      }
    } catch (err) {
      console.warn('Error fetching callbacks:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const res = await API.get('/admin/team');
      if (res.success) {
        setTeamMembers(res.users || res.team || []);
      }
    } catch (_) {}
  };

  const openUpdateModal = (cb) => {
    setSelectedCallback(cb);
    setUpdateStatus(cb.status || 'NEW');
    setAssignedUserId(cb.assigned_to_user_id || '');
    setFollowUpDate(cb.follow_up_date ? String(cb.follow_up_date).split('T')[0] : '');
    setInternalNotes(cb.internal_notes || '');
    setResolutionOutcome(cb.resolution_outcome || '');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSaveUpdate = async (e) => {
    e.preventDefault();
    if (!selectedCallback) return;
    try {
      setSubmitting(true);
      setErrorMsg('');
      const payload = {
        status: updateStatus,
        follow_up_date: followUpDate || null,
        internal_notes: internalNotes || null,
        resolution_outcome: resolutionOutcome || null
      };

      if (isDirector || user?.role === 'tl_coordinator') {
        payload.assigned_to_user_id = assignedUserId || null;
      }

      const res = await API.put(`/admin/callbacks/${selectedCallback.id}`, payload);

      if (res.success) {
        setSuccessMsg('Callback updated successfully!');
        setTimeout(() => {
          setSelectedCallback(null);
          fetchCallbacks();
        }, 900);
      } else {
        setErrorMsg(res.message || 'Update failed.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error updating callback.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeRecruiters = teamMembers.filter(
    (m) => m.role === 'recruiter' && (m.is_active === 1 || m.is_active === true)
  );

  const filteredCallbacks = callbacks.filter((cb) => {
    if (sourceFilter !== 'all') {
      if (sourceFilter === 'CANDIDATE_DATABASE' && cb.source !== 'CANDIDATE_DATABASE') return false;
      if (sourceFilter === 'JOB_APPLICANTS' && cb.source === 'CANDIDATE_DATABASE') return false;
    }

    if (!search) return true;
    const s = search.toLowerCase();
    return (
      cb.job_title?.toLowerCase().includes(s) ||
      cb.company_name?.toLowerCase().includes(s) ||
      cb.requested_by_name?.toLowerCase().includes(s) ||
      cb.requested_by_email?.toLowerCase().includes(s) ||
      cb.requested_by_phone?.includes(s)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-heading flex items-center gap-2.5">
            <PhoneCall className="w-6 h-6 text-blue-700" />
            Employer Callback Requests
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Requests generated when talent database access or applicant contact is requested by employers
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Status:</span>
          {['all', 'NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                filter === st
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-700"
          >
            <option value="all">All Sources</option>
            <option value="CANDIDATE_DATABASE">Candidate Database</option>
            <option value="JOB_APPLICANTS">Job Applicants</option>
          </select>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, job, caller..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-700"
            />
          </div>
        </div>
      </div>

      {/* Callbacks Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">Employer & Context</th>
                <th className="p-4">Requested By</th>
                <th className="p-4">Source</th>
                <th className="p-4">Status</th>
                <th className="p-4">Assigned Staff</th>
                <th className="p-4">Created Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading callback requests...
                  </td>
                </tr>
              ) : filteredCallbacks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-500">
                    No callback requests found matching the current criteria.
                  </td>
                </tr>
              ) : (
                filteredCallbacks.map((cb) => {
                  const isCandidateDb = cb.source === 'CANDIDATE_DATABASE';
                  return (
                    <tr key={cb.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{cb.company_name || 'Employer Callback'}</span>
                        </div>
                        <div className="text-slate-500 text-[11px] flex items-center gap-1.5 mt-0.5">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-xs">
                            {cb.job_title || (isCandidateDb ? 'Talent Database Access Request' : 'General Callback Request')}
                          </span>
                        </div>
                        {cb.callback_reason && (
                          <div className="text-[11px] text-slate-600 italic mt-1 bg-slate-50 p-1.5 rounded border border-slate-200/60 max-w-sm">
                            "{cb.callback_reason}"
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-slate-900">{cb.requested_by_name || 'Employer Contact'}</div>
                        <div className="text-[11px] text-slate-500">{cb.requested_by_email}</div>
                        {cb.requested_by_phone && (
                          <div className="text-[11px] text-slate-500">{cb.requested_by_phone}</div>
                        )}
                      </td>

                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                          isCandidateDb
                            ? 'bg-teal-100 text-teal-800 border border-teal-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {isCandidateDb && <Sparkles className="w-2.5 h-2.5 text-teal-600" />}
                          {isCandidateDb ? 'Candidate DB' : 'Job Applicants'}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          cb.status === 'NEW' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          cb.status === 'ASSIGNED' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                          cb.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          cb.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {cb.status}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="font-medium text-slate-800 flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                          <span>{cb.assigned_to_name || <span className="text-slate-400 italic">Unassigned</span>}</span>
                        </span>
                        {cb.follow_up_date && (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            Follow-up: {new Date(cb.follow_up_date).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                      <td className="p-4 text-slate-500 whitespace-nowrap text-[11px]">
                        {cb.created_at ? new Date(cb.created_at).toLocaleString() : 'N/A'}
                      </td>

                      <td className="p-4 text-right">
                        <button
                          onClick={() => openUpdateModal(cb)}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold border border-blue-200 transition-colors cursor-pointer text-xs"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Callback Modal */}
      {selectedCallback && createPortal(
        <div
          className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedCallback(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100vh-1.5rem)] max-h-[calc(100dvh-1.5rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 flex items-center justify-between border-b border-slate-200 p-6 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-blue-700" />
                Manage Callback Request
              </h3>
              <button
                type="button"
                onClick={() => setSelectedCallback(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUpdate} className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 text-xs">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">
                    {errorMsg}
                  </div>
                )}
                {successMsg && (
                  <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Requester & Company Card */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{selectedCallback.company_name || 'Employer Callback'}</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      selectedCallback.source === 'CANDIDATE_DATABASE'
                        ? 'bg-teal-100 text-teal-800 border border-teal-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                      {selectedCallback.source === 'CANDIDATE_DATABASE' ? 'Candidate Database' : 'Job Applicants'}
                    </span>
                  </div>

                  <div className="text-slate-600 text-xs space-y-1">
                    <div>
                      <span className="font-semibold text-slate-700">Requester: </span>
                      {selectedCallback.requested_by_name || 'Employer Contact'} ({selectedCallback.requested_by_email})
                    </div>
                    {selectedCallback.requested_by_phone && (
                      <div>
                        <span className="font-semibold text-slate-700">Phone: </span>
                        {selectedCallback.requested_by_phone}
                      </div>
                    )}
                    <div>
                      <span className="font-semibold text-slate-700">Mandate / Scope: </span>
                      {selectedCallback.job_title || (selectedCallback.source === 'CANDIDATE_DATABASE' ? 'Talent Database Access Request' : 'Direct Employer Callback')}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Received: {new Date(selectedCallback.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Callback Status</label>
                  <select
                    value={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-700 bg-white"
                  >
                    <option value="NEW">NEW</option>
                    <option value="ASSIGNED">ASSIGNED</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assign Recruiter {isDirector ? '' : '(Director Managed)'}
                  </label>
                  {isDirector || user?.role === 'tl_coordinator' ? (
                    <select
                      value={assignedUserId}
                      onChange={(e) => setAssignedUserId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-700 bg-white"
                    >
                      <option value="">Unassigned</option>
                      {activeRecruiters.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name || m.email} (Recruiter)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-medium">
                      {selectedCallback.assigned_to_name || selectedCallback.assigned_to_email || 'Unassigned'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Follow-up Date</label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-700 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Internal Notes</label>
                  <textarea
                    rows={2}
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Notes from initial employer consultation call..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Resolution Outcome</label>
                  <textarea
                    rows={2}
                    value={resolutionOutcome}
                    onChange={(e) => setResolutionOutcome(e.target.value)}
                    placeholder="e.g. Discussed candidate requirements, agreed on search terms, candidate access verified."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>

              <div className="shrink-0 px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCallback(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer hover:bg-slate-100 transition-colors text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-700 text-white font-bold hover:bg-blue-800 disabled:opacity-50 cursor-pointer shadow-xs transition-colors text-xs"
                >
                  {submitting ? 'Saving...' : 'Save Callback'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminCallbacks;
