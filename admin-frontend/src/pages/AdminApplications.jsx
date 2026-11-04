import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
  FileCheck,
  Search,
  Filter,
  Eye,
  User,
  Briefcase,
  MapPin,
  Mail,
  Phone,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  FileText,
  Building2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import AdminBadge from '../components/common/AdminBadge';
import { LoadingState } from '../components/common/AdminStateBanner';
import useModalA11y from '../hooks/useModalA11y';

const AdminApplications = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'all';

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState(initialStatus);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedApp, setSelectedApp] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [updatingId, setUpdatingId] = useState(null);
  const [downloadingResumeId, setDownloadingResumeId] = useState(null);

  const isViewer = user?.role === 'viewer';

  useModalA11y(Boolean(selectedApp), () => setSelectedApp(null));

  // Lock background scroll when application modal is open
  useEffect(() => {
    if (selectedApp) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedApp]);

  const fetchApplications = useCallback(async (stageFilter = filterStatus, searchTerm = search) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (stageFilter && stageFilter !== 'all') {
        params.append('stage', stageFilter);
      }
      if (searchTerm && searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await API.get(`/admin/applications${queryString}`);
      if (res.success) {
        setApplications(res.applications || []);
      }
    } catch (err) {
      console.warn('Applications fetch warning:', err.message);
      setMsg({ type: 'error', text: err.message || 'Error loading applications' });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search]);

  useEffect(() => {
    fetchApplications(filterStatus, search);
  }, [filterStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchApplications(filterStatus, search);
  };

  const handleViewResume = async (appId) => {
    try {
      setDownloadingResumeId(appId);
      const res = await API.get(`/admin/applications/${appId}/resume`);
      if (res && res.success && res.url) {
        window.open(res.url, '_blank', 'noopener,noreferrer');
      } else {
        setMsg({ type: 'error', text: res?.message || 'Unable to open resume at this time.' });
      }
    } catch (err) {
      console.error('Error opening resume:', err);
      setMsg({ type: 'error', text: err.response?.data?.message || err.message || 'Error opening resume.' });
    } finally {
      setDownloadingResumeId(null);
    }
  };

  const handleUpdateStatus = async (appId, newStatus) => {
    if (isViewer) {
      setMsg({ type: 'error', text: 'Viewer role is read-only. Status updates are restricted.' });
      return;
    }
    setMsg({ type: '', text: '' });
    setUpdatingId(appId);

    try {
      let res;
      try {
        // Primary: Admin-specific stage updater with full differential audit logging
        res = await API.put(`/admin/applications/${appId}/stage`, { status: newStatus });
      } catch (adminErr) {
        if (![404, 405].includes(adminErr.status)) throw adminErr;
        // Compatibility fallback only when the canonical route is unavailable.
        res = await API.put(`/applications/${appId}/status`, { status: newStatus });
      }

      if (res && res.success) {
        const canonicalStatus = newStatus === 'reviewing' ? 'under_review' : (newStatus === 'hired' ? 'selected' : newStatus);
        setMsg({
          type: 'success',
          text: `Application status successfully updated to '${canonicalStatus.replace('_', ' ').toUpperCase()}'.`
        });

        // Update local list state
        setApplications(prev =>
          prev.map(a => (a.id === appId ? { ...a, status: canonicalStatus } : a))
        );

        // Update selected modal view if active
        if (selectedApp?.id === appId) {
          setSelectedApp(prev => ({ ...prev, status: canonicalStatus }));
        }

        setTimeout(() => setMsg({ type: '', text: '' }), 4000);
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to update application status.' });
    } finally {
      setUpdatingId(null);
    }
  };

  // Client-side fallback filter to ensure instantaneous response
  const displayedApps = applications.filter(a => {
    const matchesStatus =
      filterStatus === 'all' ||
      a.status === filterStatus ||
      (filterStatus === 'under_review' && (a.status === 'under_review' || a.status === 'reviewing')) ||
      (filterStatus === 'selected' && (a.status === 'selected' || a.status === 'hired'));

    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      a.candidate_name?.toLowerCase().includes(term) ||
      a.candidate_email?.toLowerCase().includes(term) ||
      a.job_title?.toLowerCase().includes(term) ||
      a.company_name?.toLowerCase().includes(term) ||
      a.id?.toLowerCase().includes(term);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-heading flex items-center gap-2.5">
            <FileCheck className="w-6 h-6 text-blue-700" />
            Internal Recruitment Processing Queue
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review candidate submissions, inspect verified dossiers and resumes, and manage internal ATS recruitment stages
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Stages' },
            { id: 'applied', label: 'Applied' },
            { id: 'under_review', label: 'Under Review' },
            { id: 'shortlisted', label: 'Shortlisted' },
            { id: 'interview', label: 'Interview' },
            { id: 'selected', label: 'Selected' },
            { id: 'rejected', label: 'Rejected' },
            { id: 'on_hold', label: 'On Hold' }
          ].map(st => (
            <button
              key={st.id}
              onClick={() => setFilterStatus(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap ${
                filterStatus === st.id
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toast Notification */}
      {msg.text && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2.5 shadow-xs border animate-fadeIn ${
            msg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search candidate name, email, job, company..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-700 focus:bg-white transition-all"
          />
        </form>

        <div className="text-xs text-slate-500 font-semibold flex items-center gap-2">
          <span>
            Showing <strong className="text-slate-900">{displayedApps.length}</strong> Application Records
          </span>
          {filterStatus !== 'all' && (
            <button
              onClick={() => {
                setFilterStatus('all');
                setSearch('');
                fetchApplications('all', '');
              }}
              className="text-blue-700 hover:underline font-bold text-[11px]"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">Ref Code & Candidate</th>
                <th className="p-4">Target Job & Company</th>
                <th className="p-4">Location / Experience</th>
                <th className="p-4">Resume / Dossier</th>
                <th className="p-4">Current Status</th>
                <th className="p-4">Applied Date</th>
                <th className="p-4 text-right">Recruitment Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <LoadingState message="Loading applications queue..." />
                  </td>
                </tr>
              ) : displayedApps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <FileCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <div className="font-semibold text-slate-600">No applications match current criteria</div>
                    <div className="text-[11px] text-slate-400 mt-1">Try switching stage tabs or clearing your search query</div>
                  </td>
                </tr>
              ) : (
                displayedApps.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Ref Code & Candidate */}
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200 uppercase block w-fit mb-1">
                        APP-{a.id.substring(0, 6).toUpperCase()}
                      </span>
                      <span className="font-bold text-slate-900 text-sm block">{a.candidate_name || 'Candidate'}</span>
                      <span className="text-[11px] text-slate-500">{a.candidate_email}</span>
                      {a.candidate_phone && (
                        <span className="text-[10px] text-slate-400 block font-mono">{a.candidate_phone}</span>
                      )}
                    </td>

                    {/* Target Job & Company */}
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-xs">{a.job_title || 'Direct Mandate'}</div>
                      <div className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        {a.company_name || 'Direct Client'}
                      </div>
                      {a.job_location && (
                        <div className="text-[10px] text-slate-400 mt-0.5">{a.job_location}</div>
                      )}
                    </td>

                    {/* Location / Experience */}
                    <td className="p-4 space-y-0.5">
                      <div className="text-slate-800 font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {a.current_location || 'Remote / Flexible'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {a.total_experience ? `${a.total_experience} yrs exp` : (a.professional_headline || 'Experienced')}
                      </div>
                      {a.current_designation && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                          {a.current_designation} {a.current_organization ? `@ ${a.current_organization}` : ''}
                        </div>
                      )}
                    </td>

                    {/* Resume / Snapshot */}
                    <td className="p-4">
                      {a.resume_url || a.resume_id ? (
                        <button
                          type="button"
                          disabled={downloadingResumeId === a.id}
                          onClick={() => handleViewResume(a.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-[11px] border border-blue-200 transition-colors disabled:opacity-50"
                          title={a.resume_filename || 'View application-time resume'}
                        >
                          {downloadingResumeId === a.id ? (
                            <span className="w-3 h-3 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <FileText className="w-3.5 h-3.5" />
                          )}
                          <span className="truncate max-w-[120px]">{a.resume_filename || 'Resume.pdf'}</span>
                          <ExternalLink className="w-3 h-3 text-blue-500 shrink-0" />
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No File Attached</span>
                      )}
                    </td>

                    {/* Current Status */}
                    <td className="p-4">
                      <AdminBadge status={a.status || 'applied'} />
                    </td>

                    {/* Applied Date */}
                    <td className="p-4 text-slate-500 whitespace-nowrap text-xs">
                      {new Date(a.applied_at || a.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>

                    {/* Recruitment Actions */}
                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedApp(a)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold inline-flex items-center gap-1 transition-colors"
                        title="Inspect Candidate Profile & Application Snapshot"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-700" /> Inspect
                      </button>

                      {!isViewer ? (
                        <select
                          value={a.status || 'applied'}
                          onChange={e => handleUpdateStatus(a.id, e.target.value)}
                          disabled={updatingId === a.id}
                          className="p-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold uppercase text-slate-800 cursor-pointer focus:outline-none focus:border-blue-700 disabled:opacity-50"
                        >
                          <option value="applied">Applied</option>
                          <option value="under_review">Under Review</option>
                          <option value="shortlisted">Shortlisted</option>
                          <option value="interview">Interview</option>
                          <option value="selected">Selected</option>
                          <option value="rejected">Rejected</option>
                          <option value="on_hold">On Hold</option>
                        </select>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Read-Only</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Internal Candidate Application Detail Inspection Modal */}
      {selectedApp && createPortal(
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedApp(null)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl max-h-[calc(100vh-1.5rem)] max-h-[calc(100dvh-1.5rem)] overflow-hidden flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="shrink-0 p-6 pb-4 border-b border-slate-200 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200 uppercase">
                    APP-{selectedApp.id.substring(0, 6).toUpperCase()}
                  </span>
                  <AdminBadge status={selectedApp.status || 'applied'} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-heading">{selectedApp.candidate_name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Applied for <span className="text-slate-900 font-semibold">{selectedApp.job_title}</span> at{' '}
                  <span className="text-slate-700 font-semibold">{selectedApp.company_name}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 font-bold text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 text-xs">
              {/* Contact & Profile Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 text-slate-800">
                  <Mail className="w-4 h-4 text-blue-700 shrink-0" />
                  <span className="truncate">{selectedApp.candidate_email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800">
                  <Phone className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>{selectedApp.candidate_phone || 'Not Provided'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800">
                  <MapPin className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>{selectedApp.current_location || 'Not Specified'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800">
                  <Briefcase className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>
                    {selectedApp.total_experience ? `${selectedApp.total_experience} Years Experience` : 'Profile Registered'}
                  </span>
                </div>
              </div>

              {/* Resume Download / View */}
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-blue-700" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Candidate Application-Time Resume</span>
                    <span className="text-[11px] text-slate-500">
                      {selectedApp.resume_filename || 'Pinned Candidate Resume Document'}
                    </span>
                  </div>
                </div>
                {selectedApp.resume_url || selectedApp.resume_id ? (
                  <button
                    type="button"
                    disabled={downloadingResumeId === selectedApp.id}
                    onClick={() => handleViewResume(selectedApp.id)}
                    className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {downloadingResumeId === selectedApp.id ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    View / Download
                  </button>
                ) : (
                  <span className="text-xs text-slate-400 italic">No Resume Uploaded</span>
                )}
              </div>

              {/* Professional Experience & Headline */}
              {selectedApp.professional_headline && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Headline / Specialization
                  </span>
                  <span className="text-slate-800 font-semibold">{selectedApp.professional_headline}</span>
                </div>
              )}

              {/* Rejection Reason if present */}
              {selectedApp.rejection_reason && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider block mb-1">Rejection Reason:</span>
                  <p>{selectedApp.rejection_reason}</p>
                </div>
              )}
            </div>

            {/* Status Update Action Bar inside Modal */}
            {!isViewer && (
              <div className="shrink-0 px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-700">Update Lifecycle Status:</span>
                <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                  {[
                    { id: 'under_review', label: 'Under Review' },
                    { id: 'shortlisted', label: 'Shortlist' },
                    { id: 'interview', label: 'Interview' },
                    { id: 'selected', label: 'Select' },
                    { id: 'rejected', label: 'Reject' },
                    { id: 'on_hold', label: 'On Hold' }
                  ].map(st => (
                    <button
                      key={st.id}
                      type="button"
                      disabled={updatingId === selectedApp.id}
                      onClick={() => handleUpdateStatus(selectedApp.id, st.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                        selectedApp.status === st.id
                          ? 'bg-blue-700 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminApplications;
