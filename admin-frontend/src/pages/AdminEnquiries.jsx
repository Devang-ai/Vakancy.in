import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  HelpCircle,
  Mail,
  Phone,
  Building2,
  CheckCircle2,
  Clock,
  UserCheck,
  Search,
  Filter,
  X,
  Calendar,
  Briefcase,
  MapPin,
  Users,
  AlertCircle,
  ExternalLink,
  Sparkles,
  MessageSquare,
  ArrowRight,
  UserPlus,
  RefreshCw,
  PlusCircle,
  History,
  ShieldCheck,
  PhoneCall,
  Send,
  Eye
} from 'lucide-react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import useModalA11y from '../hooks/useModalA11y';
import AdminJobFormModal from '../components/jobs/AdminJobFormModal';
import AdminJobDetailsModal from '../components/jobs/AdminJobDetailsModal';
import { SUPPORT_EMAIL } from '../config/constants';

const AdminEnquiries = () => {
  const { user } = useAuth();
  const isDirector = user?.role === 'director' || user?.role === 'main_admin' || user?.is_main_admin === 1;
  const isRecruiter = user?.role === 'recruiter';

  const [enquiries, setEnquiries] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all'); // 'all', 'unassigned', 'assigned'
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Dedicated Recruiter Assignment Modal State
  const [assignModalEnquiry, setAssignModalEnquiry] = useState(null);
  const [assignRecruiterId, setAssignRecruiterId] = useState('');
  const [assignSearch, setAssignSearch] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignModalError, setAssignModalError] = useState('');

  // Detailed Modal state
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [modalStatus, setModalStatus] = useState('NEW');
  const [modalAssignedId, setModalAssignedId] = useState('');
  const [modalFollowUp, setModalFollowUp] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reply via Email State
  const [showReplySection, setShowReplySection] = useState(false);
  const [replySubject, setReplySubject] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [replySuccess, setReplySuccess] = useState('');

  // History & Linked Jobs for Inspect Modal
  const [enquiryHistory, setEnquiryHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [linkedJobs, setLinkedJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  // Job Creation Modal from Enquiry
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [enquiryForJob, setEnquiryForJob] = useState(null);
  const [viewJobId, setViewJobId] = useState(null);

  useModalA11y(Boolean(selectedEnquiry), () => setSelectedEnquiry(null));
  useModalA11y(Boolean(assignModalEnquiry), () => closeAssignModal());
  useModalA11y(Boolean(viewJobId), () => setViewJobId(null));

  // Lock background scroll when any modal is open
  useEffect(() => {
    if (selectedEnquiry || assignModalEnquiry || jobModalOpen || viewJobId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedEnquiry, assignModalEnquiry, jobModalOpen, viewJobId]);

  const openAssignModal = (enq) => {
    setAssignModalEnquiry(enq);
    setAssignRecruiterId(enq.assigned_to_user_id || '');
    setAssignSearch('');
    setAssignModalError('');
  };

  const closeAssignModal = () => {
    setAssignModalEnquiry(null);
    setAssignRecruiterId('');
    setAssignSearch('');
    setAssignModalError('');
  };

  const handleConfirmAssignment = async (e) => {
    if (e) e.preventDefault();
    if (!assignModalEnquiry || isAssigning) return;
    if (!assignRecruiterId) {
      setAssignModalError('Please select an active recruiter to assign.');
      return;
    }

    try {
      setIsAssigning(true);
      setAssignModalError('');

      const res = await API.put(`/admin/enquiries/${assignModalEnquiry.id}/assign`, {
        assigned_to_user_id: assignRecruiterId
      });

      if (res && res.success) {
        const assignedRecruiter = activeRecruiters.find(r => r.id === assignRecruiterId);
        const name = assignedRecruiter?.name || assignedRecruiter?.email || 'Recruiter';
        setActionSuccess(res.message || `Enquiry successfully assigned to ${name}.`);
        closeAssignModal();
        await fetchData();
      } else {
        setAssignModalError(res?.message || 'Failed to assign recruiter.');
      }
    } catch (err) {
      setAssignModalError(err.message || 'Error saving recruiter assignment.');
    } finally {
      setIsAssigning(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filter, sourceFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setActionError('');
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
      if (sourceFilter !== 'all') params.append('source', sourceFilter);

      const [enqRes, teamRes] = await Promise.all([
        API.get(`/admin/enquiries?${params.toString()}`).catch((err) => ({ success: false, message: err.message })),
        API.get('/admin/team').catch(() => ({ success: false })),
      ]);

      if (enqRes.success) {
        setEnquiries(enqRes.enquiries || []);
      } else {
        setActionError(enqRes.message || 'Unable to load enquiries.');
      }

      if (teamRes.success) {
        setTeamMembers(teamRes.users || teamRes.team || []);
      }
    } catch (err) {
      console.warn('fetchData error:', err.message);
      setActionError(err.message || 'Unable to load enquiries.');
    } finally {
      setLoading(false);
    }
  };

  const activeRecruiters = teamMembers.filter(
    (m) => m.role === 'recruiter' && (m.is_active === 1 || m.is_active === true)
  );

  const loadEnquiryHistory = async (enquiryId) => {
    try {
      setHistoryLoading(true);
      const res = await API.get(`/admin/enquiries/${enquiryId}/history`);
      if (res.success) {
        setEnquiryHistory(res.history || []);
      } else {
        setEnquiryHistory([]);
      }
    } catch (err) {
      console.warn('Error loading history:', err.message);
      setEnquiryHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadLinkedJobs = async (enquiryId) => {
    try {
      setJobsLoading(true);
      const res = await API.get(`/admin/enquiries/${enquiryId}/jobs`);
      if (res.success) {
        setLinkedJobs(res.jobs || []);
      } else {
        setLinkedJobs([]);
      }
    } catch (err) {
      console.warn('Error loading linked jobs:', err.message);
      setLinkedJobs([]);
    } finally {
      setJobsLoading(false);
    }
  };

  const openInspectionModal = (enq) => {
    setSelectedEnquiry(enq);
    setModalStatus(enq.status ? enq.status.toUpperCase() : 'NEW');
    setModalAssignedId(enq.assigned_to_user_id || '');
    setModalFollowUp(enq.follow_up_date ? String(enq.follow_up_date).split('T')[0] : '');
    setModalNotes(enq.notes || '');
    setActionError('');
    setActionSuccess('');

    // Reset Reply state
    setShowReplySection(false);
    setReplySubject(enq.subject ? `Re: ${enq.subject}` : 'Regarding your inquiry with Vakancy.in');
    setReplyMessage('');
    setReplyError('');
    setReplySuccess('');

    // Fetch related activity history & linked job mandates
    loadEnquiryHistory(enq.id);
    loadLinkedJobs(enq.id);
  };

  const handleSendEmailReply = async (e) => {
    if (e) e.preventDefault();
    if (!selectedEnquiry || isSendingReply) return;
    if (!replySubject.trim() || !replyMessage.trim()) {
      setReplyError('Subject and reply message are required.');
      return;
    }

    try {
      setIsSendingReply(true);
      setReplyError('');
      setReplySuccess('');

      const res = await API.post(`/admin/enquiries/${selectedEnquiry.id}/reply`, {
        subject: replySubject.trim(),
        reply_message: replyMessage.trim()
      });

      if (res && res.success) {
        setReplySuccess(res.message || 'Reply email dispatched successfully.');
        setReplyMessage('');
        setModalStatus('IN_PROGRESS');
        await loadEnquiryHistory(selectedEnquiry.id);
        await fetchData();
      } else {
        setReplyError(res?.message || 'Failed to dispatch reply email.');
      }
    } catch (err) {
      setReplyError(err.message || 'Failed to send reply email via SMTP.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleSaveEnquiry = async (e) => {
    e.preventDefault();
    if (!selectedEnquiry) return;
    try {
      setIsSubmitting(true);
      setActionError('');
      setActionSuccess('');

      // 1. If assigned user changed and user is Director
      if (isDirector && modalAssignedId !== (selectedEnquiry.assigned_to_user_id || '')) {
        await API.put(`/admin/enquiries/${selectedEnquiry.id}/assign`, {
          assigned_to_user_id: modalAssignedId || null
        });
      }

      // 2. Update status, notes, follow-up date
      const detailsPayload = {
        status: modalStatus,
        notes: modalNotes,
        follow_up_date: modalFollowUp || null
      };
      if (isDirector) {
        detailsPayload.assigned_to_user_id = modalAssignedId || null;
      }

      const res = await API.put(`/admin/enquiries/${selectedEnquiry.id}/details`, detailsPayload);
      if (res.success) {
        setActionSuccess('Enquiry details saved successfully.');
        await loadEnquiryHistory(selectedEnquiry.id);
        await fetchData();
        setTimeout(() => {
          setSelectedEnquiry(null);
        }, 900);
      } else {
        setActionError(res.message || 'Failed to update enquiry.');
      }
    } catch (err) {
      console.error('Save enquiry error:', err);
      setActionError(err.message || 'Error updating enquiry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenJobCreation = (enq) => {
    setEnquiryForJob(enq || selectedEnquiry);
    setJobModalOpen(true);
  };

  const handleJobCreatedSuccess = async (createdJob) => {
    setActionSuccess('Job mandate successfully created from enquiry!');
    setJobModalOpen(false);
    setEnquiryForJob(null);
    if (selectedEnquiry) {
      await loadLinkedJobs(selectedEnquiry.id);
      await loadEnquiryHistory(selectedEnquiry.id);
    }
    await fetchData();
  };

  const filteredEnquiries = enquiries.filter((e) => {
    // Assignment filter (for Director)
    if (isDirector && assignmentFilter === 'unassigned' && e.assigned_to_user_id) return false;
    if (isDirector && assignmentFilter === 'assigned' && !e.assigned_to_user_id) return false;

    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (e.contact_name && e.contact_name.toLowerCase().includes(s)) ||
      (e.contact_email && e.contact_email.toLowerCase().includes(s)) ||
      (e.contact_phone && e.contact_phone.includes(s)) ||
      (e.company_name && e.company_name.toLowerCase().includes(s)) ||
      (e.subject && e.subject.toLowerCase().includes(s)) ||
      (e.display_subject && e.display_subject.toLowerCase().includes(s)) ||
      (e.location && e.location.toLowerCase().includes(s)) ||
      (e.enquiry_type && e.enquiry_type.toLowerCase().includes(s)) ||
      (e.assigned_to_name && e.assigned_to_name.toLowerCase().includes(s))
    );
  });

  const filteredRecruiters = activeRecruiters.filter((r) => {
    if (!assignSearch.trim()) return true;
    const term = assignSearch.toLowerCase();
    return (
      (r.name && r.name.toLowerCase().includes(term)) ||
      (r.email && r.email.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 font-heading flex items-center gap-2.5">
              <Briefcase className="w-6 h-6 text-blue-700" />
              {isRecruiter ? 'Assigned Enquiries (Recruiter Workspace)' : 'Executive Search & Recruitment Enquiries'}
            </h1>
            {isRecruiter && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                My Workspace
              </span>
            )}
            {isDirector && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                Director Oversight
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isRecruiter
              ? 'Review and manage your assigned executive search mandates, record follow-ups, and convert to jobs'
              : 'Review incoming executive mandates, assign recruitment consultants, and record follow-ups'}
          </p>
        </div>

        {/* Global Feedback Alert */}
        {actionError && (
          <div className="w-full sm:w-auto p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2" role="alert">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
        {actionSuccess && (
          <div className="w-full sm:w-auto p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2" role="status">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Status:</span>
          {['all', 'NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                filter === st
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Assignment Filter for Director */}
          {isDirector && (
            <select
              value={assignmentFilter}
              onChange={(e) => setAssignmentFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-700"
            >
              <option value="all">All Assignments</option>
              <option value="unassigned">Unassigned Only</option>
              <option value="assigned">Assigned Only</option>
            </select>
          )}

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-700"
          >
            <option value="all">All Sources</option>
            <option value="EXECUTIVE_SERVICE">Executive Search</option>
            <option value="CONTACT_US">General Contact</option>
          </select>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, contact, role..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-700"
            />
          </div>
        </div>
      </div>

      {/* Enquiries Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto min-w-full">
          <table className="min-w-[1150px] w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4 min-w-[230px]">Company & Contact</th>
                <th className="p-4 min-w-[260px]">Position / Requirement</th>
                <th className="p-4 min-w-[140px]">Source</th>
                <th className="p-4 min-w-[120px]">Status</th>
                <th className="p-4 min-w-[200px]">Assigned Recruiter</th>
                <th className="p-4 min-w-[140px]">Submission Date</th>
                <th className="p-4 min-w-[220px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading enquiries...
                  </td>
                </tr>
              ) : filteredEnquiries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-500">
                    {isRecruiter
                      ? 'No executive search enquiries currently assigned to you.'
                      : 'No enquiries found matching current filters.'}
                  </td>
                </tr>
              ) : (
                filteredEnquiries.map((e) => {
                  const isExec = e.source === 'EXECUTIVE_SERVICE' || e.enquiry_type === 'Executive Search';
                  return (
                    <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 min-w-[230px]">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5 break-words">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{e.company_name || 'Individual Inquiry'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 space-y-1 mt-1">
                          <div className="font-medium text-slate-700">{e.contact_name || 'N/A'}</div>
                          
                          {/* Email with mailto */}
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            {e.contact_email && !e.contact_email.includes('***') ? (
                              <a
                                href={`mailto:${e.contact_email}?subject=Regarding%20your%20Executive%20Search%20Enquiry%20-%20Vakancy.in`}
                                className="text-blue-700 hover:underline hover:text-blue-900 break-all"
                                title="Click to email contact person"
                              >
                                {e.contact_email}
                              </a>
                            ) : (
                              <span className="font-mono text-slate-400">{e.contact_email || 'Masked'}</span>
                            )}
                          </div>

                          {/* Phone with tel */}
                          {e.contact_phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              {!e.contact_phone.includes('***') ? (
                                <a
                                  href={`tel:${e.contact_phone}`}
                                  className="text-blue-700 hover:underline hover:text-blue-900"
                                  title="Click to call contact phone"
                                >
                                  {e.contact_phone}
                                </a>
                              ) : (
                                <span className="font-mono text-slate-400">{e.contact_phone}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-4 min-w-[260px]">
                        <div className="font-bold text-slate-900 text-xs break-words leading-snug">
                          {e.subject || e.display_subject || 'Executive Mandate'}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                          {e.openings_count && (
                            <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-600">
                              <Users className="w-3 h-3 text-slate-400" /> {e.openings_count} {e.openings_count === 1 ? 'opening' : 'openings'}
                            </span>
                          )}
                          {e.location && (
                            <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-[10px] text-slate-600">
                              <MapPin className="w-3 h-3 text-slate-400" /> {e.location}
                            </span>
                          )}
                          {e.linked_jobs_count > 0 && (
                            <span className="flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                              <Briefcase className="w-3 h-3 text-emerald-600" /> {e.linked_jobs_count} {e.linked_jobs_count === 1 ? 'job mandate' : 'job mandates'}
                            </span>
                          )}
                        </div>
                        {e.message && (
                          <p className="text-slate-500 text-[11px] line-clamp-2 mt-1.5 leading-relaxed break-words" title={e.message}>
                            {e.message}
                          </p>
                        )}
                      </td>

                      <td className="p-4 min-w-[140px]">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                          isExec
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {isExec && <Sparkles className="w-2.5 h-2.5 text-purple-600" />}
                          {isExec ? 'Executive Search' : 'Contact Us'}
                        </span>
                      </td>

                      <td className="p-4 min-w-[120px]">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block ${
                          e.status === 'RESOLVED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : e.status === 'CLOSED'
                            ? 'bg-slate-100 text-slate-700 border border-slate-300'
                            : e.status === 'IN_PROGRESS'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : e.status === 'ASSIGNED'
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {(e.status || 'NEW').replace('_', ' ')}
                        </span>
                      </td>

                      <td className="p-4 min-w-[200px]">
                        {e.assigned_to_name || e.assigned_to_email ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                              <UserCheck className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                              <span className="font-bold text-slate-900">{e.assigned_to_name || e.assigned_to_email}</span>
                            </div>
                            {e.assigned_to_email && (
                              <div className="text-[11px] text-slate-500 pl-5 truncate max-w-[170px]" title={e.assigned_to_email}>
                                {e.assigned_to_email}
                              </div>
                            )}
                            {isDirector && (
                              <div className="pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => openAssignModal(e)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-[11px] font-semibold transition-colors cursor-pointer"
                                  title="Reassign enquiry to a different active Recruiter"
                                >
                                  <RefreshCw className="w-3 h-3 text-slate-500" />
                                  <span>Reassign</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <span className="text-[11px] text-slate-400 italic block">Unassigned</span>
                            {isDirector && (
                              <button
                                type="button"
                                onClick={() => openAssignModal(e)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
                                title="Assign this enquiry to an active Recruiter"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Assign Recruiter</span>
                              </button>
                            )}
                          </div>
                        )}
                        {e.follow_up_date && (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            Follow-up: {new Date(e.follow_up_date).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                      <td className="p-4 min-w-[140px] text-slate-500 whitespace-nowrap text-[11px]">
                        {e.created_at ? new Date(e.created_at).toLocaleString() : 'N/A'}
                      </td>

                      <td className="p-4 min-w-[220px] text-right space-x-2 whitespace-nowrap">
                        {isDirector && (
                          <button
                            type="button"
                            onClick={() => openAssignModal(e)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5 ${
                              e.assigned_to_user_id
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            {e.assigned_to_user_id ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                                <span>Reassign</span>
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Assign</span>
                              </>
                            )}
                          </button>
                        )}
                        <button
                          id={`btn-inspect-enquiry-${e.id}`}
                          data-action="inspect"
                          type="button"
                          onClick={() => openInspectionModal(e)}
                          className="btn-inspect-enquiry px-3.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold border border-blue-200 transition-colors cursor-pointer text-xs shadow-2xs inline-flex items-center gap-1"
                        >
                          <span>Inspect & Manage</span>
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

      {/* Detailed Enquiry Inspection & Management Modal (Phase 4, 5, 6) */}
      {selectedEnquiry && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedEnquiry(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100vh-1.5rem)] max-h-[calc(100dvh-1.5rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="shrink-0 flex items-center justify-between border-b border-slate-200 p-6 pb-4 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-xs">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Enquiry Fulfillment & Mandate Management
                  </h3>
                  <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-2">
                    <span>Ticket Ref: <span className="font-mono text-slate-800 font-semibold">{selectedEnquiry.id}</span></span>
                    <span>•</span>
                    <span className="font-medium">{selectedEnquiry.source === 'EXECUTIVE_SERVICE' ? 'Executive Search Service' : 'Contact Enquiry'}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEnquiry(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleSaveEnquiry} className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 text-xs">
                {actionError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{actionError}</span>
                  </div>
                )}
                {actionSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{actionSuccess}</span>
                  </div>
                )}

                {/* 1. Company & Contact Section */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-blue-700" />
                      1. Company & Contact Details
                    </h4>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                      selectedEnquiry.source === 'EXECUTIVE_SERVICE' || selectedEnquiry.enquiry_type === 'Executive Search'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                      {selectedEnquiry.source === 'EXECUTIVE_SERVICE' && <Sparkles className="w-3 h-3 text-purple-600" />}
                      {selectedEnquiry.source === 'EXECUTIVE_SERVICE' ? 'Executive Search' : 'Contact Us'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Company Name</span>
                      <span className="font-bold text-slate-900 text-sm">{selectedEnquiry.company_name || 'Individual Inquiry'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact Person</span>
                      <span className="font-semibold text-slate-800 text-xs">{selectedEnquiry.contact_name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
                      {selectedEnquiry.contact_email && !selectedEnquiry.contact_email.includes('***') ? (
                        <a
                          href={`mailto:${selectedEnquiry.contact_email}?subject=Regarding%20your%20Executive%20Search%20Enquiry%20-%20Vakancy.in`}
                          className="font-semibold text-blue-700 hover:text-blue-900 hover:underline text-xs flex items-center gap-1 mt-0.5"
                          title="Click to compose email"
                        >
                          <Mail className="w-3.5 h-3.5 text-blue-600" />
                          <span className="break-all">{selectedEnquiry.contact_email}</span>
                        </a>
                      ) : (
                        <span className="font-semibold text-slate-500 text-xs">{selectedEnquiry.contact_email || 'Masked'}</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</span>
                      {selectedEnquiry.contact_phone && !selectedEnquiry.contact_phone.includes('***') ? (
                        <a
                          href={`tel:${selectedEnquiry.contact_phone}`}
                          className="font-semibold text-blue-700 hover:text-blue-900 hover:underline text-xs flex items-center gap-1 mt-0.5"
                          title="Click to dial phone"
                        >
                          <Phone className="w-3.5 h-3.5 text-blue-600" />
                          <span>{selectedEnquiry.contact_phone}</span>
                        </a>
                      ) : (
                        <span className="font-semibold text-slate-500 text-xs">{selectedEnquiry.contact_phone || 'N/A'}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Hiring Requirement Section */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-3">
                    <Briefcase className="w-4 h-4 text-blue-700" />
                    2. Hiring Requirement Specifications
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Role / Mandate Subject</span>
                      <span className="font-bold text-slate-900 text-xs">{selectedEnquiry.subject || selectedEnquiry.display_subject || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Number of Openings</span>
                      <span className="font-semibold text-slate-800 text-xs">{selectedEnquiry.openings_count || '1'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Location</span>
                      <span className="font-semibold text-slate-800 text-xs">{selectedEnquiry.location || 'Remote / Flexible'}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Submitted Message / Mandate Description
                    </span>
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
                      {selectedEnquiry.message || 'No additional message was supplied.'}
                    </div>
                  </div>
                </div>

                {/* Reply via Official Support Email Card */}
                <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-200/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200/60 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-700 text-white flex items-center justify-center">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                          Reply via Official Mailbox
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Dispatched directly from <span className="font-mono font-semibold text-blue-800">{SUPPORT_EMAIL}</span> to <span className="font-mono text-slate-700">{selectedEnquiry.contact_email}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowReplySection(!showReplySection)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 font-bold text-xs transition-colors cursor-pointer self-start sm:self-auto"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{showReplySection ? 'Hide Reply Form' : 'Reply via Email'}</span>
                    </button>
                  </div>

                  {showReplySection && (
                    <div className="space-y-3 pt-1">
                      {replyError && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>{replyError}</span>
                        </div>
                      )}
                      {replySuccess && (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{replySuccess}</span>
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Subject</label>
                        <input
                          type="text"
                          value={replySubject}
                          onChange={(e) => setReplySubject(e.target.value)}
                          placeholder="Re: Enquiry regarding..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Official Response Message</label>
                        <textarea
                          rows={4}
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          placeholder={`Dear ${selectedEnquiry.contact_name || 'Client'},\n\nThank you for reaching out to Vakancy.in...`}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-y"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Logged in audit activity timeline
                        </span>
                        <button
                          type="button"
                          onClick={handleSendEmailReply}
                          disabled={isSendingReply || !replyMessage.trim()}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {isSendingReply ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Dispatching...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Send Official Email</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Ownership & Status Section */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-3">
                    <UserCheck className="w-4 h-4 text-blue-700" />
                    3. Ownership, Workflow Status & Follow-Up
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Status Select */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Enquiry Status *</label>
                      <select
                        value={modalStatus}
                        onChange={(e) => setModalStatus(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-700 bg-white font-medium text-xs"
                      >
                        <option value="NEW">NEW</option>
                        <option value="ASSIGNED">ASSIGNED</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="CLOSED">CLOSED</option>
                      </select>
                    </div>

                    {/* Assigned Recruiter Select */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Assigned Recruiter {isDirector ? '' : '(Director Managed)'}
                      </label>
                      {isDirector ? (
                        activeRecruiters.length === 0 ? (
                          <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                            No active recruiters available
                          </div>
                        ) : (
                          <select
                            value={modalAssignedId}
                            onChange={(e) => setModalAssignedId(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-700 bg-white font-medium text-xs"
                          >
                            <option value="">-- Unassigned --</option>
                            {activeRecruiters.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name || m.email} (Recruiter)
                              </option>
                            ))}
                          </select>
                        )
                      ) : (
                        <div className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-semibold text-xs">
                          {selectedEnquiry.assigned_to_name || selectedEnquiry.assigned_to_email || 'Unassigned'}
                        </div>
                      )}
                    </div>

                    {/* Follow-up Date */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Next Follow-up Date</label>
                      <input
                        type="date"
                        value={modalFollowUp}
                        onChange={(e) => setModalFollowUp(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-700 bg-white text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Recruiter Follow-up Notes</label>
                    <textarea
                      rows={3}
                      value={modalNotes}
                      onChange={(e) => setModalNotes(e.target.value)}
                      placeholder="Enter recruiter discussion notes, client feedback, screening progress, salary budget..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-700 bg-white text-xs"
                    />
                  </div>
                </div>

                {/* 4. Linked Job Mandates Section */}
                {/* 4. Linked Job Mandates Section */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-blue-700" />
                        4. Linked Recruitment Job Mandates
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Job requisitions created from this confirmed executive search requirement
                      </p>
                    </div>

                    <button
                      id="btn-create-job-from-enquiry"
                      type="button"
                      onClick={() => handleOpenJobCreation(selectedEnquiry)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>{linkedJobs.length > 0 ? 'Create Another Mandate' : 'Create Job from Enquiry'}</span>
                    </button>
                  </div>

                  {jobsLoading ? (
                    <div className="p-4 text-center text-slate-400">Loading linked mandates...</div>
                  ) : linkedJobs.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center text-slate-500 text-xs">
                      No recruitment mandates linked yet. Click "Create Job from Enquiry" to launch the job creation workflow.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {linkedJobs.map((job) => (
                        <div
                          key={job.id}
                          className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                              <span>{job.title}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                job.status === 'open'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : job.status === 'draft'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}>
                                {job.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3">
                              <span>Location: <strong className="text-slate-700">{job.location || 'Remote'}</strong></span>
                              <span>•</span>
                              <span>Openings: <strong className="text-slate-700">{job.openings_count || 1}</strong></span>
                              <span>•</span>
                              <span>Created: {job.created_at ? new Date(job.created_at).toLocaleDateString() : 'N/A'}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => setViewJobId(job.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-blue-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                              title="View full job specifications"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Job</span>
                            </button>
                            <a
                              href={`/jobs?search=${encodeURIComponent(job.title)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                              title="Open in Admin Job Postings page"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Job Postings</span>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 5. Follow-up & Activity History Section */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-3">
                    <History className="w-4 h-4 text-blue-700" />
                    5. Follow-Up & Activity History
                  </h4>

                  {historyLoading ? (
                    <div className="p-4 text-center text-slate-400">Loading activity timeline...</div>
                  ) : enquiryHistory.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-xs italic">
                      No recorded activity history for this enquiry yet.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                      {enquiryHistory.map((act) => (
                        <div
                          key={act.id}
                          className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between text-slate-500 text-[11px]">
                            <span className="font-semibold text-slate-800">
                              {act.performed_by_name || act.performed_by_email || 'Staff'} ({act.performed_by_role || 'staff'})
                            </span>
                            <span>{act.created_at ? new Date(act.created_at).toLocaleString() : ''}</span>
                          </div>
                          <p className="text-slate-800 font-medium">{act.description}</p>
                          {act.changed_field && (
                            <div className="text-[11px] text-slate-500">
                              Changed <span className="font-mono text-slate-700">{act.changed_field}</span> from "{act.previous_value}" to "{act.new_value}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer with Actions */}
              <div className="shrink-0 px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <button
                    type="button"
                    onClick={() => handleOpenJobCreation(selectedEnquiry)}
                    className="px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold border border-blue-200 transition-colors flex items-center gap-1.5 cursor-pointer text-xs"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                    <span>{linkedJobs.length > 0 ? 'Create Another Mandate' : 'Create Job from Enquiry'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedEnquiry(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer hover:bg-slate-100 transition-colors text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-save-enquiry-details"
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-blue-700 text-white font-bold hover:bg-blue-800 disabled:opacity-50 cursor-pointer shadow-xs transition-colors text-xs"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Dedicated Recruiter Assignment Modal (Phase 2) */}
      {assignModalEnquiry && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          onClick={closeAssignModal}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="shrink-0 flex items-center justify-between border-b border-slate-200 p-6 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {assignModalEnquiry.assigned_to_user_id ? 'Reassign Recruiter' : 'Assign Recruiter'}
                  </h3>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    Ticket #{assignModalEnquiry.id ? assignModalEnquiry.id.substring(0, 8) : ''} • Director Authorized
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={closeAssignModal}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmAssignment} className="p-6 space-y-4 text-xs">
              {assignModalError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{assignModalError}</span>
                </div>
              )}

              {/* Context Summary */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{assignModalEnquiry.company_name || 'Individual Client'}</span>
                </div>
                <div className="text-slate-600 font-medium">
                  {assignModalEnquiry.subject || assignModalEnquiry.display_subject || 'Executive Search Mandate'}
                </div>
                <div className="text-[11px] text-slate-500">
                  Contact: {assignModalEnquiry.contact_name} ({assignModalEnquiry.contact_email || 'Masked'})
                </div>
                {assignModalEnquiry.assigned_to_name && (
                  <div className="text-[11px] text-blue-800 font-semibold pt-1 border-t border-slate-200/60 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Currently Assigned: {assignModalEnquiry.assigned_to_name}</span>
                  </div>
                )}
              </div>

              {/* Searchable Recruiter Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Active Recruiter *
                </label>

                {activeRecruiters.length === 0 ? (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-semibold">No active recruiters available</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Search input for recruiter list */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={assignSearch}
                        onChange={(e) => setAssignSearch(e.target.value)}
                        placeholder="Search recruiter by name or email..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-700 bg-slate-50"
                      />
                    </div>

                    {/* Recruiter Radio Options */}
                    <div className="max-h-44 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-white">
                      {filteredRecruiters.length === 0 ? (
                        <div className="text-center text-slate-400 py-3">No recruiters match search.</div>
                      ) : (
                        filteredRecruiters.map((m) => {
                          const isSelected = assignRecruiterId === m.id;
                          return (
                            <div
                              key={m.id}
                              onClick={() => setAssignRecruiterId(m.id)}
                              className={`p-2.5 rounded-lg border cursor-pointer transition-colors flex items-center justify-between ${
                                isSelected
                                  ? 'bg-blue-50 border-blue-300 text-blue-900'
                                  : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div>
                                <div className="font-bold text-xs">{m.name || 'Unnamed Recruiter'}</div>
                                <div className="text-[11px] text-slate-500">{m.email}</div>
                              </div>
                              <input
                                type="radio"
                                name="recruiter_choice"
                                checked={isSelected}
                                onChange={() => setAssignRecruiterId(m.id)}
                                className="w-4 h-4 text-blue-700 focus:ring-blue-500"
                              />
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Only verified internal staff with the canonical Recruiter role are eligible for assignment.
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={closeAssignModal}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer hover:bg-slate-100 transition-colors text-xs"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-enquiry-assign"
                  type="submit"
                  disabled={isAssigning || !assignRecruiterId || activeRecruiters.length === 0}
                  className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold disabled:opacity-50 cursor-pointer shadow-xs transition-colors text-xs inline-flex items-center gap-1.5"
                >
                  {isAssigning ? (
                    <>Saving Assignment...</>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>{assignModalEnquiry.assigned_to_user_id ? 'Confirm Reassignment' : 'Confirm Assignment'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* AdminJobFormModal invoked when converting enquiry to Job (Phase 6) */}
      {jobModalOpen && (
        <AdminJobFormModal
          isOpen={jobModalOpen}
          onClose={() => {
            setJobModalOpen(false);
            setEnquiryForJob(null);
          }}
          onSuccess={handleJobCreatedSuccess}
          fromEnquiry={enquiryForJob}
        />
      )}

      {/* AdminJobDetailsModal for inspecting linked job mandates */}
      {viewJobId && (
        <AdminJobDetailsModal
          jobId={viewJobId}
          isOpen={Boolean(viewJobId)}
          onClose={() => setViewJobId(null)}
        />
      )}
    </div>
  );
};

export default AdminEnquiries;
