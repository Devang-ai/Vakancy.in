import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
  Briefcase,
  Building2,
  MapPin,
  CheckCircle2,
  XCircle,
  Search,
  Eye,
  Plus,
  Edit,
  Archive,
  RotateCcw,
  Users,
  Shield,
  Filter,
  History,
  PhoneCall,
  Calendar,
  Lock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Sparkles,
  SlidersHorizontal,
  Share2,
  X
} from 'lucide-react';
import API from '../services/api';
import AdminJobFormModal from '../components/jobs/AdminJobFormModal';
import AdminJobDetailsModal from '../components/jobs/AdminJobDetailsModal';
import useModalA11y from '../hooks/useModalA11y';

const AdminJobs = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Filters State
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [recommendedOnly, setRecommendedOnly] = useState(searchParams.get('recommended') === 'true');
  const [companyFilter, setCompanyFilter] = useState(searchParams.get('company') || '');
  const [locationFilter, setLocationFilter] = useState(searchParams.get('location') || '');
  const [recruiterFilter, setRecruiterFilter] = useState(searchParams.get('recruiter') || '');
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');

  // Filter Dropdowns
  const [teamMembers, setTeamMembers] = useState([]);
  const activeRecruiters = teamMembers.filter(
    (m) => m.role === 'recruiter' && (m.is_active === 1 || m.is_active === true)
  );
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

  const [detailsModalJobId, setDetailsModalJobId] = useState(null);
  const [detailsModalTab, setDetailsModalTab] = useState('overview');

  // Archive / Restore Modals
  const [archiveTargetJob, setArchiveTargetJob] = useState(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [restoreTargetJob, setRestoreTargetJob] = useState(null);
  const [restoreTargetStatus, setRestoreTargetStatus] = useState('open');
  const [restoreNote, setRestoreNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useModalA11y(Boolean(archiveTargetJob || restoreTargetJob), () => {
    if (archiveTargetJob) setArchiveTargetJob(null);
    else if (restoreTargetJob) setRestoreTargetJob(null);
  });

  // Lock background scroll when any modal is open
  useEffect(() => {
    if (isFormModalOpen || detailsModalJobId || archiveTargetJob || restoreTargetJob) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isFormModalOpen, detailsModalJobId, archiveTargetJob, restoreTargetJob]);

  // Notifications
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(''), 4000);
  };

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const res = await API.get('/admin/team');
      if (res.success) {
        setTeamMembers(res.team || []);
      }
    } catch (_) {}
  };

  const fetchJobs = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', pagination.limit);

      if (search) params.append('search', search);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (recommendedOnly) params.append('recommended_only', 'true');
      if (companyFilter) params.append('company', companyFilter);
      if (locationFilter) params.append('location', locationFilter);
      if (recruiterFilter) params.append('recruiter', recruiterFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await API.get(`/admin/jobs?${params.toString()}`);
      if (res.success) {
        setJobs(res.jobs || []);
        setPagination({
          page: res.pagination?.page ?? res.page ?? page,
          limit: res.pagination?.limit ?? pagination.limit,
          total: res.pagination?.total ?? res.total ?? (res.jobs?.length || 0),
          totalPages: res.pagination?.totalPages ?? res.totalPages ?? 1
        });
      }
    } catch (err) {
      console.warn('Error fetching admin jobs:', err.message);
      showToast(err.message || 'Error loading jobs', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, recommendedOnly, companyFilter, locationFilter, recruiterFilter, startDate, endDate, pagination.limit]);

  useEffect(() => {
    fetchJobs(1);
  }, [statusFilter, recommendedOnly, recruiterFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchJobs(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setRecommendedOnly(false);
    setCompanyFilter('');
    setLocationFilter('');
    setRecruiterFilter('');
    setStartDate('');
    setEndDate('');
    fetchJobs(1);
  };

  // Toggle Candidate Access
  const handleToggleCandidateAccess = async (job) => {
    const newAccess = !job.allow_candidate_access;
    try {
      const res = await API.put(`/admin/jobs/${job.id}/candidate-access`, {
        allow_candidate_access: newAccess
      });
      if (res.success) {
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, allow_candidate_access: newAccess ? 1 : 0 } : j));
        showToast(`Candidate access ${newAccess ? 'ENABLED' : 'RESTRICTED (Callback Gate Activated)'} for "${job.title}".`);
      }
    } catch (err) {
      showToast(err.message || 'Failed to toggle candidate access.', 'error');
    }
  };

  // Handle Archive Submission
  const submitArchive = async () => {
    if (!archiveTargetJob) return;
    try {
      setActionLoading(true);
      const res = await API.put(`/admin/jobs/${archiveTargetJob.id}/archive`, {
        reason: archiveReason.trim() || 'Archived by Admin'
      });
      if (res.success) {
        showToast(`Job "${archiveTargetJob.title}" archived successfully.`);
        setArchiveTargetJob(null);
        setArchiveReason('');
        fetchJobs(pagination.page);
      }
    } catch (err) {
      showToast(err.message || 'Error archiving job.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Restore Submission
  const submitRestore = async () => {
    if (!restoreTargetJob) return;
    try {
      setActionLoading(true);
      const res = await API.put(`/admin/jobs/${restoreTargetJob.id}/restore`, {
        target_status: restoreTargetStatus,
        restore_note: restoreNote.trim() || 'Restored by Admin'
      });
      if (res.success) {
        showToast(`Job "${restoreTargetJob.title}" restored with status "${restoreTargetStatus}".`);
        setRestoreTargetJob(null);
        setRestoreNote('');
        fetchJobs(pagination.page);
      }
    } catch (err) {
      showToast(err.message || 'Error restoring job.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openDetailsModal = (jobId, tab = 'overview') => {
    setDetailsModalJobId(jobId);
    setDetailsModalTab(tab);
  };

  const handleEditClick = (job) => {
    if (job.created_by_type === 'EMPLOYER') {
      showToast('Strict Governance Rule: Employer-created job specifications cannot be modified through Admin.', 'error');
      return;
    }
    setEditingJob(job);
    setIsFormModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border flex items-center gap-2.5 text-xs font-bold animate-fadeIn ${
          toastType === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          {toastType === 'error' ? <AlertCircle className="w-4 h-4 shrink-0 text-red-600" /> : <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />}
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-heading flex items-center gap-2.5">
            <Briefcase className="w-6 h-6 text-blue-700" />
            Job Postings & Requisitions
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage employer mandates, admin internal requisitions, candidate access gates, and ATS applications
          </p>
        </div>

        <button
          onClick={() => {
            setEditingJob(null);
            setIsFormModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs hover:shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Job Posting
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 w-full lg:w-auto">
            {['all', 'open', 'draft', 'closed', 'archived'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {st}
              </button>
            ))}

            <label className="flex items-center gap-1.5 ml-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={recommendedOnly}
                onChange={(e) => setRecommendedOnly(e.target.checked)}
                className="rounded text-blue-700"
              />
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Recommended Only
            </label>
          </div>

          {/* Search Bar & Advanced Toggle */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 lg:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="admin-jobs-search-input"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search job title, company, location..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-700 focus:bg-white"
              />
            </form>

            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`p-2 rounded-xl border transition-colors ${
                showAdvancedFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title="Advanced Filters"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Filters */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Assigned Recruiter</label>
              <select
                value={recruiterFilter}
                onChange={(e) => setRecruiterFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800"
              >
                <option value="">All Recruiters</option>
                {activeRecruiters.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Company</label>
              <input
                type="text"
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                placeholder="Filter company..."
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Location</label>
              <input
                type="text"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                placeholder="Filter location..."
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Created From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Created To</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800"
                />
                <button
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                  title="Reset Filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Jobs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">Job Title & Code</th>
                <th className="p-4">Company & Contact</th>
                <th className="p-4">Location</th>
                <th className="p-4">Type & Recruiter</th>
                <th className="p-4 text-center">Applicants</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Candidate Access</th>
                <th className="p-4">Provenance & Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading job requisitions...
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-500">
                    No jobs found matching your criteria.
                  </td>
                </tr>
              ) : (
                jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Job Title */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openDetailsModal(j.id, 'overview')}
                          className="font-bold text-slate-900 text-sm hover:text-blue-700 text-left line-clamp-1"
                        >
                          {j.title}
                        </button>
                        {j.is_recommended === 1 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold shrink-0">
                            ★ REC
                          </span>
                        )}
                        {j.is_archived === 1 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[9px] font-bold shrink-0">
                            ARCHIVED
                          </span>
                        )}
                      </div>
                      <div className="text-slate-400 text-[10px] font-mono mt-0.5">
                        ID: {j.id.slice(0, 8)}...
                      </div>
                    </td>

                    {/* Company & Contact Person */}
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{j.company_name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span>{j.contact_person || 'N/A'}</span>
                        {j.contact_masked && (
                          <span className="text-[9px] text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                            Masked
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">{j.contact_phone}</div>
                    </td>

                    {/* Location */}
                    <td className="p-4">
                      <div className="font-medium text-slate-800">{j.location || 'Remote'}</div>
                      <div className="text-[10px] text-slate-500">{j.workplace_type || 'On-Site'}</div>
                    </td>

                    {/* Type & Recruiter */}
                    <td className="p-4">
                      <div className="font-medium text-slate-800">{j.employment_type || 'Full-Time'}</div>
                      <div className="text-[11px] text-blue-700 font-semibold mt-0.5">
                        {j.assigned_recruiter_name ? `Recruiter: ${j.assigned_recruiter_name}` : <span className="text-slate-400 italic font-normal">Unassigned</span>}
                      </div>
                    </td>

                    {/* Applicants */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => openDetailsModal(j.id, 'applicants')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 text-xs transition-colors"
                        title="View Applicants"
                      >
                        <Users className="w-3.5 h-3.5" />
                        {j.applicants_count || 0}
                      </button>
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        j.is_archived === 1 ? 'bg-slate-100 text-slate-700 border border-slate-300' :
                        j.status === 'open' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        j.status === 'draft' ? 'bg-slate-100 text-slate-800 border border-slate-200' :
                        'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {j.is_archived === 1 ? 'Archived' : j.status}
                      </span>
                    </td>

                    {/* Candidate Access Toggle Switch */}
                    <td className="p-4 text-center">
                      <button
                        id={`btn-toggle-job-candidate-access-${j.id}`}
                        onClick={() => handleToggleCandidateAccess(j)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          j.allow_candidate_access ? 'bg-blue-700' : 'bg-slate-300'
                        }`}
                        title={j.allow_candidate_access ? 'Candidate Access ON: Direct Viewing' : 'Candidate Access OFF: Callback Gate'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            j.allow_candidate_access ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                        {j.allow_candidate_access ? 'ON' : 'OFF'}
                      </div>
                    </td>

                    {/* Provenance & Date */}
                    <td className="p-4">
                      <div className="font-semibold text-slate-800">
                        {j.source_type === 'EXECUTIVE_SEARCH' ? (
                          <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 text-[10px] font-bold">
                            <Sparkles className="w-3 h-3 text-purple-600" /> Executive Search
                          </span>
                        ) : j.source_type === 'BD_LEAD' ? (
                          <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 text-[10px] font-bold">
                            <Briefcase className="w-3 h-3 text-blue-600" /> BD Lead
                          </span>
                        ) : j.created_by_type === 'EMPLOYER' ? (
                          <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 text-[10px] font-bold">
                            <Building2 className="w-3 h-3 text-slate-400" /> Employer
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 text-[10px] font-bold">
                            <Shield className="w-3 h-3 text-blue-600" /> Admin Staff
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {j.created_at ? new Date(j.created_at).toLocaleDateString() : ''}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Details */}
                        <button
                          onClick={() => openDetailsModal(j.id, 'overview')}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-slate-100 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Candidate Shortlist & Sharing Quick Action (for Admin created & Executive Search jobs) */}
                        {(j.created_by_type === 'ADMIN' || j.created_by_type !== 'EMPLOYER' || j.is_internal_only === 1 || j.source_type === 'EXECUTIVE_SEARCH') && (
                          <button
                            id={`btn-job-share-shortlist-${j.id}`}
                            onClick={() => openDetailsModal(j.id, 'executive_shortlist')}
                            className="p-1.5 rounded-lg text-purple-700 hover:text-purple-900 hover:bg-purple-50 transition-colors"
                            title="Share Candidate Shortlist (Admin Created Job)"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* View History */}
                        <button
                          onClick={() => openDetailsModal(j.id, 'history')}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-700 hover:bg-slate-100 transition-colors"
                          title="View Audit History"
                        >
                          <History className="w-4 h-4" />
                        </button>

                        {/* Edit Job (Enabled for Admin, Disabled for Employer) */}
                        {j.created_by_type === 'ADMIN' ? (
                          <button
                            onClick={() => handleEditClick(j)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-slate-100 transition-colors"
                            title="Edit Requisition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        ) : (
                          <span
                            className="p-1.5 rounded-lg text-slate-300 cursor-not-allowed"
                            title="Employer-created job cannot be edited by Admin staff"
                          >
                            <Lock className="w-4 h-4" />
                          </span>
                        )}

                        {/* Archive / Restore Button */}
                        {j.is_archived === 1 ? (
                          <button
                            onClick={() => {
                              setRestoreTargetJob(j);
                              setRestoreTargetStatus('open');
                              setRestoreNote('');
                            }}
                            className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors"
                            title="Restore Job Mandate"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setArchiveTargetJob(j);
                              setArchiveReason('');
                            }}
                            className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-50 transition-colors"
                            title="Archive Job Mandate"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing Page <span className="font-bold text-slate-900">{pagination.page}</span> of{' '}
            <span className="font-bold text-slate-900">{pagination.totalPages || 1}</span> ({pagination.total} total jobs)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchJobs(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <button
              onClick={() => fetchJobs(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Archive Confirmation Modal */}
      {archiveTargetJob && createPortal(
        <div
          className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setArchiveTargetJob(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 max-h-[calc(100vh-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Archive className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Archive Job Requirement</h3>
            </div>
            <p className="text-xs text-slate-600">
              Archiving removes "<strong>{archiveTargetJob.title}</strong>" from candidate discovery while fully preserving candidate applications, resumes, and historical records.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Archive Reason</label>
              <textarea
                rows={2}
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                placeholder="e.g. Mandate filled / Client requested pause..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-600"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setArchiveTargetJob(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitArchive}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'Archiving...' : 'Confirm Archive'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Restore Modal */}
      {restoreTargetJob && createPortal(
        <div
          className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setRestoreTargetJob(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 max-h-[calc(100vh-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Restore Job Requirement</h3>
            </div>
            <p className="text-xs text-slate-600">
              Select the target publishing status for "<strong>{restoreTargetJob.title}</strong>":
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Status</label>
              <select
                value={restoreTargetStatus}
                onChange={(e) => setRestoreTargetStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-700 bg-white"
              >
                <option value="open">Open (Publicly Discoverable)</option>
                <option value="draft">Draft (Internal Only)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Restoration Note</label>
              <textarea
                rows={2}
                value={restoreNote}
                onChange={(e) => setRestoreNote(e.target.value)}
                placeholder="e.g. Mandate reopened by client..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-700"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRestoreTargetJob(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRestore}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'Restoring...' : 'Restore Requisition'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Create / Edit Form Modal */}
      <AdminJobFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingJob(null);
        }}
        onSuccess={() => fetchJobs(pagination.page)}
        initialJob={editingJob}
      />

      {/* Details Modal */}
      <AdminJobDetailsModal
        isOpen={Boolean(detailsModalJobId)}
        onClose={() => setDetailsModalJobId(null)}
        jobId={detailsModalJobId}
        initialTab={detailsModalTab}
        onJobUpdated={() => fetchJobs(pagination.page)}
      />
    </div>
  );
};

export default AdminJobs;
