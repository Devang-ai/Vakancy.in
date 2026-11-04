import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Briefcase,
  Building2,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  UserCheck,
  Shield,
  FileText,
  Layers,
  History,
  PhoneCall,
  Download,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Lock,
  Tag,
  Share2,
  Copy,
  Check,
  Sparkles,
  Eye,
  ShieldCheck,
  CheckSquare,
  Square,
  Search,
  Trash2,
  Mail,
  Archive,
  RefreshCw,
  UserPlus,
  Plus
} from 'lucide-react';
import API from '../../services/api';
import useModalA11y from '../../hooks/useModalA11y';

const AdminJobDetailsModal = ({ isOpen, onClose, jobId, initialTab = 'overview', onJobUpdated }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [history, setHistory] = useState([]);
  const [callbacks, setCallbacks] = useState([]);

  // ATS Stage changing
  const [updatingStageAppId, setUpdatingStageAppId] = useState(null);
  const [rejectionModalApp, setRejectionModalApp] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [stageError, setStageError] = useState('');
  const [stageSuccess, setStageSuccess] = useState('');

  // Selected snapshot preview modal
  const [previewSnapshot, setPreviewSnapshot] = useState(null);

  // Secure resume viewing
  const [downloadingResumeId, setDownloadingResumeId] = useState(null);
  const [resumeError, setResumeError] = useState('');

  // Executive Search Candidate Shortlist Sharing State
  const [executiveCandidates, setExecutiveCandidates] = useState([]);
  const [executiveShares, setExecutiveShares] = useState([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
  const [candidateNotes, setCandidateNotes] = useState({});
  const [shareTitle, setShareTitle] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(14);
  const [allowResumeDownload, setAllowResumeDownload] = useState(true);
  const [maskContactInfo, setMaskContactInfo] = useState(true);
  const [notifyEmployer, setNotifyEmployer] = useState(false);
  const [isPublishingShare, setIsPublishingShare] = useState(false);
  const [newlyGeneratedShare, setNewlyGeneratedShare] = useState(null);
  const [copiedShareId, setCopiedShareId] = useState(null);
  const [activityModalShare, setActivityModalShare] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [revokingShareId, setRevokingShareId] = useState(null);
  const [execMessage, setExecMessage] = useState({ text: '', type: 'success' });

  // Simplified Employer Sharing Modal State
  const [showShareEmployerModal, setShowShareEmployerModal] = useState(false);
  const [shareRecipientEmail, setShareRecipientEmail] = useState('');
  const [shareAdditionalEmails, setShareAdditionalEmails] = useState('');
  const [shareCustomMessage, setShareCustomMessage] = useState('');
  const [shareModalError, setShareModalError] = useState('');
  const [shareModalSuccess, setShareModalSuccess] = useState('');
  const [createdShareData, setCreatedShareData] = useState(null);
  const [showLinkHistoryModal, setShowLinkHistoryModal] = useState(false);
  const [candidateToPreview, setCandidateToPreview] = useState(null);
  const [shortlistingId, setShortlistingId] = useState(null);

  // Share option enabled for all jobs created from Admin Panel / Executive Search / Internal
  const canShareCandidates = Boolean(
    job?.created_by_type === 'ADMIN' ||
    job?.created_by_type !== 'EMPLOYER' ||
    job?.is_internal_only === 1 ||
    job?.source_type === 'EXECUTIVE_SEARCH'
  );

  useModalA11y(isOpen || !!rejectionModalApp || !!previewSnapshot, () => {
    if (rejectionModalApp) {
      setRejectionModalApp(null);
    } else if (previewSnapshot) {
      setPreviewSnapshot(null);
    } else if (isOpen) {
      onClose();
    }
  });

  useEffect(() => {
    if (isOpen && jobId) {
      setActiveTab(initialTab || 'overview');
      fetchAllJobData(jobId);
    }
  }, [isOpen, jobId, initialTab]);

  const fetchAllJobData = async (id) => {
    try {
      setLoading(true);
      const [jobRes, appsRes, histRes] = await Promise.allSettled([
        API.get(`/admin/jobs/${id}`),
        API.get(`/admin/jobs/${id}/applicants`),
        API.get(`/admin/jobs/${id}/history`)
      ]);

      if (jobRes.status === 'fulfilled' && jobRes.value.success) {
        setJob(jobRes.value.job);
        setCallbacks(jobRes.value.job.callbacks || []);
      }
      if (appsRes.status === 'fulfilled' && appsRes.value.success) {
        setApplicants(appsRes.value.applicants || []);
      }
      if (histRes.status === 'fulfilled' && histRes.value.success) {
        setHistory(histRes.value.history || []);
      }
      // Load executive search candidates and shares
      fetchExecutiveShortlistData(id);
    } catch (e) {
      console.warn('Error loading job details modal data:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutiveShortlistData = async (id, search = '') => {
    try {
      const [candRes, sharesRes] = await Promise.allSettled([
        API.get(`/admin/jobs/${id}/executive-candidates${search ? `?search=${encodeURIComponent(search)}` : ''}`),
        API.get(`/admin/jobs/${id}/executive-shares`)
      ]);
      if (candRes.status === 'fulfilled' && candRes.value.success) {
        setExecutiveCandidates(candRes.value.candidates || []);
      }
      if (sharesRes.status === 'fulfilled' && sharesRes.value.success) {
        setExecutiveShares(sharesRes.value.shares || []);
      }
    } catch (e) {
      console.warn('Error loading executive shortlist data:', e.message);
    }
  };

  const handleAddToShortlist = async (candidateId, applicationId = null, source = 'APPLICANT') => {
    try {
      setShortlistingId(candidateId);
      setExecMessage({ text: '', type: 'success' });
      const res = await API.post(`/admin/jobs/${jobId}/shortlist`, {
        candidate_id: candidateId,
        application_id: applicationId,
        source
      });
      if (res.success) {
        setExecMessage({ text: res.message || 'Candidate added to shortlist successfully!', type: 'success' });
        await fetchExecutiveShortlistData(jobId);
        const appsRes = await API.get(`/admin/jobs/${jobId}/applicants`);
        if (appsRes.success) setApplicants(appsRes.applicants || []);
      } else {
        setExecMessage({ text: res.message || 'Failed to shortlist candidate.', type: 'error' });
      }
    } catch (err) {
      setExecMessage({ text: err.message || 'Failed to shortlist candidate.', type: 'error' });
    } finally {
      setShortlistingId(null);
    }
  };

  const handleRemoveFromShortlist = async (candidateId) => {
    try {
      setShortlistingId(candidateId);
      setExecMessage({ text: '', type: 'success' });
      const res = await API.delete(`/admin/jobs/${jobId}/shortlist/${candidateId}`);
      if (res.success) {
        setExecMessage({ text: res.message || 'Candidate removed from shortlist.', type: 'success' });
        setSelectedCandidateIds(prev => prev.filter(id => id !== candidateId));
        await fetchExecutiveShortlistData(jobId);
        const appsRes = await API.get(`/admin/jobs/${jobId}/applicants`);
        if (appsRes.success) setApplicants(appsRes.applicants || []);
      } else {
        setExecMessage({ text: res.message || 'Failed to remove candidate from shortlist.', type: 'error' });
      }
    } catch (err) {
      setExecMessage({ text: err.message || 'Failed to remove candidate from shortlist.', type: 'error' });
    } finally {
      setShortlistingId(null);
    }
  };

  const toggleSelectCandidate = (candId) => {
    setSelectedCandidateIds(prev =>
      prev.includes(candId) ? prev.filter(id => id !== candId) : [...prev, candId]
    );
  };

  const handleSelectAllCandidates = () => {
    if (selectedCandidateIds.length === executiveCandidates.length) {
      setSelectedCandidateIds([]);
    } else {
      setSelectedCandidateIds(executiveCandidates.map(c => c.id));
    }
  };

  const handleOpenShareWithEmployer = () => {
    if (selectedCandidateIds.length === 0) {
      setExecMessage({ text: 'Please select at least one candidate from the shortlist to share.', type: 'error' });
      return;
    }
    setShareTitle(`Candidate Shortlist - ${job?.title || 'Mandate'} (${job?.company_name || 'Vakancy'})`);
    setShareRecipientEmail(job?.employer_email || job?.contact_email || '');
    setShareAdditionalEmails('');
    setShareCustomMessage('');
    setExpiresInDays(14);
    setMaskContactInfo(true);
    setShareModalError('');
    setShareModalSuccess('');
    setCreatedShareData(null);
    setShowShareEmployerModal(true);
  };

  const handleExecuteShare = async ({ sendEmail = false, openPreview = false, copyOnly = false } = {}) => {
    try {
      setShareModalError('');
      setShareModalSuccess('');
      if (sendEmail && (!shareRecipientEmail || !shareRecipientEmail.includes('@'))) {
        setShareModalError('Please provide a valid recipient email address to send the shortlist.');
        return;
      }
      setIsPublishingShare(true);
      const payload = {
        candidate_ids: selectedCandidateIds,
        title: shareTitle || `Candidate Shortlist - ${job?.title || 'Mandate'}`,
        expires_in_days: Number(expiresInDays) || 14,
        allow_resume_download: Boolean(allowResumeDownload),
        mask_contact_info: Boolean(maskContactInfo),
        recipient_email: shareRecipientEmail.trim() || null,
        additional_recipient_emails: shareAdditionalEmails ? shareAdditionalEmails.split(',').map(e => e.trim()).filter(Boolean) : null,
        custom_message: shareCustomMessage.trim() || null,
        send_email: Boolean(sendEmail),
        candidate_notes: candidateNotes
      };

      const res = await API.post(`/admin/jobs/${jobId}/executive-shares`, payload);
      if (res && res.success) {
        setCreatedShareData(res);
        setNewlyGeneratedShare(res);

        const origin = window.location.origin.includes(':5174')
          ? window.location.origin.replace(':5174', ':5173')
          : window.location.origin;
        const fullLink = `${origin}/executive-search/shortlist/${res.share_token}`;

        if (copyOnly || !sendEmail) {
          try {
            await navigator.clipboard.writeText(fullLink);
            setShareModalSuccess('Secure shortlist link generated and copied to clipboard!');
          } catch (_) {
            setShareModalSuccess('Secure shortlist link generated successfully!');
          }
        }

        if (sendEmail) {
          setShareModalSuccess(
            res.email_sent
              ? `Candidate shortlist email successfully dispatched to ${shareRecipientEmail}!`
              : `Shortlist generated. Email status: ${res.email_error || 'Processed via SMTP'}`
          );
        }

        if (openPreview) {
          window.open(fullLink, '_blank', 'noopener,noreferrer');
        }

        // Refresh shares list
        const sharesRes = await API.get(`/admin/jobs/${jobId}/executive-shares`);
        if (sharesRes.success) setExecutiveShares(sharesRes.shares || []);
      } else {
        setShareModalError(res?.message || 'Failed to generate shortlist link.');
      }
    } catch (err) {
      setShareModalError(err.message || 'Error creating shortlist share.');
    } finally {
      setIsPublishingShare(false);
    }
  };

  const handleRevokeShare = async (shareId) => {
    if (!window.confirm('Are you sure you want to revoke this candidate shortlist link immediately? The employer will no longer be able to access these candidate profiles.')) {
      return;
    }
    try {
      setRevokingShareId(shareId);
      const res = await API.post(`/admin/jobs/${jobId}/executive-shares/${shareId}/revoke`);
      if (res.success) {
        setExecMessage({ text: 'Shortlist link has been revoked immediately.', type: 'success' });
        const sharesRes = await API.get(`/admin/jobs/${jobId}/executive-shares`);
        if (sharesRes.success) setExecutiveShares(sharesRes.shares || []);
      } else {
        setExecMessage({ text: res.message || 'Failed to revoke link.', type: 'error' });
      }
    } catch (err) {
      setExecMessage({ text: err.message || 'Failed to revoke link.', type: 'error' });
    } finally {
      setRevokingShareId(null);
    }
  };

  const handleViewActivity = async (share) => {
    try {
      setActivityModalShare(share);
      setLoadingActivity(true);
      const res = await API.get(`/admin/jobs/${jobId}/executive-shares/${share.id}/activity`);
      if (res.success) {
        setActivityLogs(res.logs || []);
      }
    } catch (err) {
      console.warn('Failed to load activity logs:', err.message);
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleCopyLink = (shareToken, shareId) => {
    const origin = window.location.origin.includes(':5174') 
      ? window.location.origin.replace(':5174', ':5173') 
      : window.location.origin;
    const fullUrl = `${origin}/executive-search/shortlist/${shareToken}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedShareId(shareId);
    setTimeout(() => setCopiedShareId(null), 3000);
  };

  const handleStageChange = async (appId, newStatus) => {
    if (newStatus === 'rejected') {
      const app = applicants.find(a => a.id === appId);
      setRejectionModalApp(app || { id: appId });
      setRejectionReason('');
      return;
    }

    try {
      setUpdatingStageAppId(appId);
      setStageError('');
      const res = await API.put(`/admin/applications/${appId}/stage`, { status: newStatus });
      if (res.success) {
        setApplicants(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
        setStageSuccess(`Applicant moved to ${newStatus.replace('_', ' ').toUpperCase()}`);
        setTimeout(() => setStageSuccess(''), 3000);
        // Refresh history
        const histRes = await API.get(`/admin/jobs/${jobId}/history`);
        if (histRes.success) setHistory(histRes.history || []);
      }
    } catch (err) {
      setStageError(err.message || 'Failed to update application stage.');
    } finally {
      setUpdatingStageAppId(null);
    }
  };

  const submitRejection = async () => {
    if (!rejectionModalApp) return;
    try {
      setUpdatingStageAppId(rejectionModalApp.id);
      const res = await API.put(`/admin/applications/${rejectionModalApp.id}/stage`, {
        status: 'rejected',
        rejection_reason: rejectionReason.trim() || 'Did not meet requirements'
      });
      if (res.success) {
        setApplicants(prev => prev.map(a =>
          a.id === rejectionModalApp.id
            ? { ...a, status: 'rejected', rejection_reason: rejectionReason.trim() }
            : a
        ));
        setRejectionModalApp(null);
        setStageSuccess('Applicant status updated to REJECTED.');
        setTimeout(() => setStageSuccess(''), 3000);
        const histRes = await API.get(`/admin/jobs/${jobId}/history`);
        if (histRes.success) setHistory(histRes.history || []);
      }
    } catch (err) {
      setStageError(err.message || 'Failed to reject applicant.');
    } finally {
      setUpdatingStageAppId(null);
    }
  };

  const handleViewResume = async (appId) => {
    try {
      setDownloadingResumeId(appId);
      setResumeError('');
      const res = await API.get(`/admin/applications/${appId}/resume`);
      if (res && res.success && res.url) {
        window.open(res.url, '_blank', 'noopener,noreferrer');
      } else {
        setResumeError(res?.message || 'Unable to open resume at this time.');
      }
    } catch (err) {
      console.error('Error fetching resume:', err);
      setResumeError(err.response?.data?.message || err.message || 'Error opening resume.');
    } finally {
      setDownloadingResumeId(null);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-5xl max-h-[calc(100vh-1.5rem)] max-h-[calc(100dvh-1.5rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center text-white shadow-xs">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-heading line-clamp-1">
                  {job?.title || 'Job Mandate Details'}
                </h2>
                {job?.is_archived === 1 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold uppercase">
                    Archived
                  </span>
                )}
                {job?.is_recommended === 1 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold uppercase">
                    ★ Featured
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                <span>{job?.company_name || 'Direct Employer'}</span>
                <span>•</span>
                <span>{job?.location || 'Remote'}</span>
                <span>•</span>
                <span className="font-semibold text-blue-300">
                  {job?.created_by_type === 'EMPLOYER' ? 'Created by Employer' : 'Created by Admin Staff'}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canShareCandidates && (
              <button
                type="button"
                id="btn-header-share-profiles"
                onClick={() => {
                  setActiveTab('executive_shortlist');
                  fetchExecutiveShortlistData(jobId);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                title="Create and share candidate shortlist with client / employer"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share Candidate Profiles
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="shrink-0 flex items-center border-b border-slate-200 bg-slate-50 px-6 gap-2 text-xs font-bold text-slate-600 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'overview'
                ? 'border-blue-700 text-blue-700 bg-white shadow-2xs font-extrabold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" /> Overview & Specs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('applicants')}
            className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'applicants'
                ? 'border-blue-700 text-blue-700 bg-white shadow-2xs font-extrabold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Applicants (ATS)
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 text-[10px]">
              {applicants.length}
            </span>
          </button>
          {canShareCandidates && (
            <button
              type="button"
              id="tab-executive-shortlist"
              onClick={() => {
                setActiveTab('executive_shortlist');
                fetchExecutiveShortlistData(jobId);
              }}
              className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'executive_shortlist'
                  ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs font-extrabold'
                  : 'border-transparent hover:text-slate-900 text-indigo-950 font-bold'
              }`}
            >
              <Share2 className="w-4 h-4 text-indigo-600" />
              Candidate Shortlist &amp; Sharing
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                {executiveCandidates.length}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('callbacks')}
            className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'callbacks'
                ? 'border-blue-700 text-blue-700 bg-white shadow-2xs font-extrabold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <PhoneCall className="w-4 h-4" />
            Callbacks
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px]">
              {callbacks.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'history'
                ? 'border-blue-700 text-blue-700 bg-white shadow-2xs font-extrabold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" /> Audit History
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 text-xs text-slate-700">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
              <div className="w-8 h-8 border-3 border-blue-700 border-t-transparent rounded-full animate-spin mb-3" />
              <span>Loading job details...</span>
            </div>
          ) : !job ? (
            <div className="p-8 text-center text-slate-500">Job not found.</div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Status Banner */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                        job.status === 'open' ? 'bg-emerald-100 text-emerald-800' :
                        job.status === 'draft' ? 'bg-slate-200 text-slate-800' : 'bg-red-100 text-red-800'
                      }`}>
                        Status: {job.status}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        job.allow_candidate_access ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        Candidate Access: {job.allow_candidate_access ? 'ON (Direct View)' : 'OFF (Callback Gate)'}
                      </span>
                    </div>

                    <div className="text-slate-500 text-[11px]">
                      Created: <span className="font-semibold text-slate-700">{job.created_at ? new Date(job.created_at).toLocaleString() : 'N/A'}</span> by <span className="font-semibold text-slate-900">{job.created_by_name || job.created_by_type}</span>
                    </div>
                  </div>

                  {/* Ownership Governance Note */}
                  {job.created_by_type === 'EMPLOYER' ? (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2.5">
                      <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-bold">Employer-Created Job Mandate</strong>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          Per Vakancy Governance rules, original job specifications (title, compensation, skills, requirements) submitted by an employer cannot be edited by Admin staff to preserve contractual authenticity. Only internal workflow controls (candidate access toggle, recruiter assignment, archiving) can be managed.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5">
                        <Shield className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-bold">Admin-Created Recruitment Requirement</strong>
                          <p className="text-[11px] text-blue-700 mt-0.5">
                            This requisition was created internally by Vakancy Staff and can be fully updated with field-level change history tracked in the audit trail.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('executive_shortlist');
                          fetchExecutiveShortlistData(jobId);
                        }}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        title="Share candidate shortlist for this job"
                      >
                        <Share2 className="w-3.5 h-3.5" /> Share Candidates
                      </button>
                    </div>
                  )}

                  {/* Company & Contact Card */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white">
                    <h4 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-700" /> Company & Point of Contact
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Company Name</span>
                        <span className="font-bold text-slate-900">{job.company_name}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Contact Person</span>
                        <span className="font-semibold text-slate-800">
                          {job.contact_person || 'N/A'}
                          {job.contact_masked && (
                            <span className="ml-1 text-[10px] text-amber-600 bg-amber-50 px-1 rounded">Masked</span>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Phone</span>
                        <span className="font-semibold text-slate-800">
                          {job.contact_phone || 'N/A'}
                          {job.contact_masked && (
                            <span className="ml-1 text-[10px] text-amber-600 bg-amber-50 px-1 rounded">Masked</span>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Email</span>
                        <span className="font-semibold text-slate-800">{job.contact_email || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Key Specifications Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Employment Type</span>
                      <span className="font-bold text-slate-900">{job.employment_type || 'Full-Time'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Workplace</span>
                      <span className="font-bold text-slate-900">{job.workplace_type || 'On-Site'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Experience</span>
                      <span className="font-bold text-slate-900">{job.min_experience} - {job.max_experience} yrs</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Compensation</span>
                      <span className="font-bold text-slate-900">
                        {job.min_salary ? `${job.currency || '₹'} ${(job.min_salary / 100000).toFixed(1)}L - ${(job.max_salary / 100000).toFixed(1)}L` : 'Disclosed on request'}
                      </span>
                    </div>
                  </div>

                  {/* Skills & Keywords */}
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs mb-1.5 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-blue-700" /> Required Skills:
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {job.skills && job.skills.length > 0 ? (
                          job.skills.map((s, idx) => (
                            <span key={idx} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-medium border border-blue-200 text-[11px]">
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">None specified</span>
                        )}
                      </div>
                    </div>

                    {job.keywords && job.keywords.length > 0 && (
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs mb-1.5">Search Keywords:</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {job.keywords.map((k, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-medium text-[11px]">
                              #{k}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Job Description Text */}
                  <div className="space-y-3 border-t border-slate-200 pt-4">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs mb-1">Description:</h4>
                      <p className="whitespace-pre-line text-slate-700 leading-relaxed font-sans">
                        {job.description || 'No description provided.'}
                      </p>
                    </div>

                    {job.responsibilities && (
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs mb-1">Responsibilities:</h4>
                        <p className="whitespace-pre-line text-slate-700 leading-relaxed font-sans">
                          {job.responsibilities}
                        </p>
                      </div>
                    )}

                    {job.requirements && (
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs mb-1">Requirements:</h4>
                        <p className="whitespace-pre-line text-slate-700 leading-relaxed font-sans">
                          {job.requirements}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Internal Notes */}
                  {job.internal_notes && (
                    <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200">
                      <h4 className="font-bold text-slate-900 text-xs mb-1">Internal Notes (Staff Only):</h4>
                      <p className="text-slate-700">{job.internal_notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: APPLICANTS (ATS) */}
              {activeTab === 'applicants' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-bold text-slate-900 text-sm">
                        Job Applicants ({applicants.length})
                      </h3>
                      {canShareCandidates && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('executive_shortlist');
                            fetchExecutiveShortlistData(jobId);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          title="Share candidate shortlist for this job"
                        >
                          <Share2 className="w-3.5 h-3.5" /> Share Candidates
                        </button>
                      )}
                    </div>
                    {stageSuccess && (
                      <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                        {stageSuccess}
                      </span>
                    )}
                    {stageError && (
                      <span className="text-red-700 font-semibold bg-red-50 px-2 py-1 rounded-lg border border-red-200">
                        {stageError}
                      </span>
                    )}
                    {resumeError && (
                      <span className="text-rose-700 font-semibold bg-rose-50 px-2 py-1 rounded-lg border border-rose-200">
                        {resumeError}
                      </span>
                    )}
                  </div>

                  {applicants.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                      No candidate applications submitted for this job opening yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="p-3.5">Candidate</th>
                            <th className="p-3.5">Experience & Org</th>
                            <th className="p-3.5">Applied Date</th>
                            <th className="p-3.5">Pinned Resume</th>
                            <th className="p-3.5">ATS Stage</th>
                            {canShareCandidates && <th className="p-3.5 text-right">Shortlist Action</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {applicants.map((app) => (
                            <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3.5">
                                <div className="font-bold text-slate-900 text-sm">{app.candidate_name}</div>
                                <div className="text-[11px] text-slate-500">{app.candidate_email} • {app.candidate_phone}</div>
                                {app.snapshot && (
                                  <button
                                    onClick={() => setPreviewSnapshot(app.snapshot)}
                                    className="text-[10px] text-blue-700 hover:underline mt-0.5 block font-medium"
                                  >
                                    View Application-Time Snapshot
                                  </button>
                                )}
                              </td>
                              <td className="p-3.5">
                                <div className="font-medium text-slate-800">{app.total_experience || 0} years exp</div>
                                <div className="text-slate-500 text-[11px]">{app.professional_headline || app.current_location || 'N/A'}</div>
                              </td>
                              <td className="p-3.5 text-slate-600">
                                {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="p-3.5">
                                {app.resume_url || app.resume_id ? (
                                  <button
                                    type="button"
                                    disabled={downloadingResumeId === app.id}
                                    onClick={() => handleViewResume(app.id)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-semibold text-xs transition-colors disabled:opacity-50"
                                    title={app.resume_filename ? `View ${app.resume_filename}` : 'View Resume'}
                                  >
                                    {downloadingResumeId === app.id ? (
                                      <span className="w-3.5 h-3.5 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <FileText className="w-3.5 h-3.5" />
                                    )}
                                    <span className="max-w-[130px] truncate">{app.resume_filename || 'View Resume'}</span>
                                    <ExternalLink className="w-3 h-3 text-blue-500 shrink-0" />
                                  </button>
                                ) : (
                                  <span className="text-slate-400 italic text-xs">No resume on file</span>
                                )}
                              </td>
                              <td className="p-3.5">
                                <select
                                  value={app.status || 'applied'}
                                  disabled={updatingStageAppId === app.id}
                                  onChange={(e) => handleStageChange(app.id, e.target.value)}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold text-xs focus:outline-none focus:border-blue-700"
                                >
                                  <option value="applied">Applied</option>
                                  <option value="under_review">Under Review</option>
                                  <option value="shortlisted">Shortlisted</option>
                                  <option value="interview">Interview</option>
                                  <option value="selected">Selected</option>
                                  <option value="rejected">Rejected</option>
                                  <option value="on_hold">On Hold</option>
                                </select>
                                {app.rejection_reason && (
                                  <div className="text-[10px] text-red-600 mt-1 max-w-xs">
                                    Reason: {app.rejection_reason}
                                  </div>
                                )}
                              </td>
                              {canShareCandidates && (
                                <td className="p-3.5 text-right">
                                  {executiveCandidates.some(c => c.id === app.candidate_id || c.application_id === app.id) ? (
                                    <div className="inline-flex items-center gap-1.5 justify-end">
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                                        <Check className="w-3 h-3 text-emerald-600" />
                                        Shortlisted
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveFromShortlist(app.candidate_id)}
                                        disabled={shortlistingId === app.candidate_id}
                                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                        title="Remove applicant from shortlist"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleAddToShortlist(app.candidate_id, app.id, 'APPLICANT')}
                                      disabled={shortlistingId === app.candidate_id}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs transition-colors shadow-2xs disabled:opacity-50"
                                      title="Explicitly add applicant to executive candidate shortlist"
                                    >
                                      <UserPlus className="w-3.5 h-3.5" />
                                      {shortlistingId === app.candidate_id ? 'Adding...' : 'Add to Shortlist'}
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CALLBACKS */}
              {activeTab === 'callbacks' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Employer Callback Requests ({callbacks.length})
                  </h3>

                  {callbacks.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                      No callback requests received for this job posting.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {callbacks.map((cb) => (
                        <div key={cb.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              cb.status === 'NEW' ? 'bg-blue-100 text-blue-800' :
                              cb.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' :
                              cb.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                            }`}>
                              {cb.status}
                            </span>
                            <span className="text-slate-500 text-[11px]">
                              {cb.created_at ? new Date(cb.created_at).toLocaleString() : ''}
                            </span>
                          </div>
                          <div className="text-slate-900 font-semibold">
                            Request Note: "{cb.callback_reason || 'Employer requested discussion for applicants'}"
                          </div>
                          {cb.resolution_outcome && (
                            <div className="p-2.5 rounded-lg bg-slate-50 text-[11px] text-slate-700">
                              <strong>Outcome:</strong> {cb.resolution_outcome}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: AUDIT HISTORY */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Activity & Audit Trail ({history.length} events)
                  </h3>

                  {history.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                      No auditable events logged for this job requirement.
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-blue-200 ml-4 space-y-4 py-2">
                      {history.map((h) => (
                        <div key={h.id} className="relative pl-6">
                          <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-xs" />
                          <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="font-bold text-slate-900">
                                {h.performed_by_name || 'Staff User'} ({h.performed_by_role || 'Staff'})
                              </span>
                              <span className="text-slate-400">
                                {h.created_at ? new Date(h.created_at).toLocaleString() : ''}
                              </span>
                            </div>
                            <div className="text-slate-700 font-medium">
                              {h.description}
                            </div>
                            {h.changed_field && (
                              <div className="mt-1 text-[11px] text-slate-500 font-mono bg-slate-50 p-1 rounded inline-block">
                                {h.changed_field}: "{String(h.previous_value ?? 'none')}" → "{String(h.new_value ?? 'none')}"
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: EXECUTIVE SHORTLIST & SHARING */}
              {activeTab === 'executive_shortlist' && (
                <div className="space-y-6">
                  {/* Status Banner */}
                  {execMessage.text && (
                    <div className={`p-4 rounded-xl text-xs flex items-center justify-between ${
                      execMessage.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    }`}>
                      <div className="flex items-center gap-2">
                        {execMessage.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0 text-red-600" /> : <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />}
                        <span className="font-semibold">{execMessage.text}</span>
                      </div>
                      <button type="button" onClick={() => setExecMessage({ text: '', type: 'success' })} className="font-bold hover:underline">Dismiss</button>
                    </div>
                  )}

                  {/* Newly Generated Share Card */}
                  {newlyGeneratedShare && (
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white shadow-lg border border-indigo-700/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-indigo-400" />
                          <h4 className="font-bold text-sm text-white">Shortlist Ready &amp; Published!</h4>
                        </div>
                        <span className="text-[11px] text-indigo-200 bg-indigo-800/60 px-2.5 py-0.5 rounded-full border border-indigo-600">
                          Expires {new Date(newlyGeneratedShare.expires_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        A secure, unguessable link has been generated. The employer will be able to review approved candidate cards and download resumes.
                      </p>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                        <input
                          type="text"
                          readOnly
                          value={`${window.location.origin.includes(':5174') ? window.location.origin.replace(':5174', ':5173') : window.location.origin}/executive-search/shortlist/${newlyGeneratedShare.share_token}`}
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-mono text-indigo-200 select-all focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleCopyLink(newlyGeneratedShare.share_token, newlyGeneratedShare.share_id)}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                        >
                          {copiedShareId === newlyGeneratedShare.share_id ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-300" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" /> Copy Link
                            </>
                          )}
                        </button>
                        <a
                          href={`${window.location.origin.includes(':5174') ? window.location.origin.replace(':5174', ':5173') : window.location.origin}/executive-search/shortlist/${newlyGeneratedShare.share_token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1 border border-slate-700 transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Preview
                        </a>
                      </div>
                    </div>
                  )}

                  {/* 2-Metric Independent Accurate Header */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('applicants')}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50 transition-all text-left group cursor-pointer shadow-2xs"
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-indigo-600 transition-colors">
                        1. Job Applicants (ATS)
                      </div>
                      <div className="text-2xl font-black text-slate-900 mt-1">
                        {applicants.length}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                        Review and add applicants to shortlist →
                      </div>
                    </button>

                    <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 text-left shadow-2xs">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                        2. Shortlisted Candidates
                      </div>
                      <div className="text-2xl font-black text-indigo-950 mt-1">
                        {executiveCandidates.length}
                      </div>
                      <div className="text-[11px] text-indigo-700 mt-1">
                        Eligible for employer sharing
                      </div>
                    </div>
                  </div>

                  {/* Candidate Shortlist Panel */}
                  <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-indigo-600" />
                          Shortlisted Candidates ({executiveCandidates.length})
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Candidates shortlisted from this job's applicants. Select candidates to share directly with the hiring team.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {executiveShares.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowLinkHistoryModal(true)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            title="View historical sharing links and revoke access"
                          >
                            <History className="w-3.5 h-3.5 text-slate-500" />
                            Link History ({executiveShares.length})
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => fetchExecutiveShortlistData(jobId)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                          title="Refresh candidates"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Shortlist Empty State or Table */}
                    {executiveCandidates.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-3">
                        <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
                          <UserCheck className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm">No Candidates Shortlisted Yet</h4>
                        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                          Only candidates who applied to this specific job through Vakancy.in can be shortlisted. Review applicants in the <strong>Applicants (ATS)</strong> tab and click <em>"Add to Shortlist"</em>.
                        </p>
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setActiveTab('applicants')}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                          >
                            <UserCheck className="w-4 h-4" /> Go to Job Applicants ({applicants.length})
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                        {/* Table Header / Select All Control */}
                        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                          <button
                            type="button"
                            onClick={handleSelectAllCandidates}
                            className="inline-flex items-center gap-1.5 text-indigo-700 hover:text-indigo-900 cursor-pointer"
                          >
                            {selectedCandidateIds.length === executiveCandidates.length && executiveCandidates.length > 0 ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                            <span>
                              Select All ({selectedCandidateIds.length}/{executiveCandidates.length})
                            </span>
                          </button>
                          <span className="text-[11px] text-slate-500 font-normal">
                            Check candidates to include in the employer shortlist.
                          </span>
                        </div>

                        {/* Candidate Rows */}
                        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                          {executiveCandidates.map((cand) => {
                            const isSelected = selectedCandidateIds.includes(cand.id);

                            return (
                              <div
                                key={cand.id}
                                className={`p-3.5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                  isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/70'
                                }`}
                              >
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectCandidate(cand.id)}
                                    className="w-4 h-4 mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                                  />
                                  <div className="space-y-0.5 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-slate-900 text-xs">{cand.name}</span>
                                      <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded font-semibold">
                                        Applicant
                                      </span>
                                      {cand.resume_id && (
                                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold flex items-center gap-0.5">
                                          <FileText className="w-2.5 h-2.5" /> Resume
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-600 truncate">
                                      {cand.current_designation || cand.professional_headline || 'Candidate'}
                                      {cand.current_organization ? ` • ${cand.current_organization}` : ''}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      ⏱️ {cand.total_experience || 0} yrs exp • 📍 {cand.current_location || 'India'}
                                      {cand.shortlisted_at && (
                                        <span> • Shortlisted {new Date(cand.shortlisted_at).toLocaleDateString()}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                  {/* Candidate Preview button */}
                                  <button
                                    type="button"
                                    onClick={() => setCandidateToPreview(cand)}
                                    className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Preview candidate summary"
                                  >
                                    <Eye className="w-3 h-3 text-slate-500" /> Preview
                                  </button>

                                  {/* Resume View button */}
                                  {cand.application_id ? (
                                    <button
                                      type="button"
                                      onClick={() => handleViewResume(cand.application_id)}
                                      disabled={downloadingResumeId === cand.application_id}
                                      className="px-2 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                      title="Open primary resume in new tab"
                                    >
                                      <FileText className="w-3 h-3" />
                                      {downloadingResumeId === cand.application_id ? 'Opening...' : 'Resume'}
                                    </button>
                                  ) : cand.resume_filename ? (
                                    <span className="text-[10px] text-slate-400 italic">Resume on file</span>
                                  ) : null}

                                  {/* Optional per-candidate note */}
                                  {isSelected && (
                                    <div className="w-full sm:w-48">
                                      <input
                                        type="text"
                                        value={candidateNotes[cand.id] || ''}
                                        onChange={(e) => setCandidateNotes({ ...candidateNotes, [cand.id]: e.target.value })}
                                        placeholder="Note for employer..."
                                        className="w-full px-2 py-1 rounded border border-indigo-200 bg-white text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                                      />
                                    </div>
                                  )}

                                  {/* Remove from Shortlist */}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFromShortlist(cand.id)}
                                    disabled={shortlistingId === cand.id}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                    title="Remove candidate from shortlist"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Primary Share with Employer Action Bar */}
                    <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100">
                      <div>
                        {selectedCandidateIds.length === 0 ? (
                          <div className="text-[11px] text-slate-500">
                            Select candidates using the checkboxes above to share with employer.
                          </div>
                        ) : (
                          <div className="text-xs text-slate-700">
                            <strong className="text-indigo-700 font-bold">{selectedCandidateIds.length}</strong> of {executiveCandidates.length} candidate(s) selected
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        id="btn-share-with-employer"
                        onClick={handleOpenShareWithEmployer}
                        disabled={selectedCandidateIds.length === 0}
                        className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Share2 className="w-4 h-4" />
                        Share with Employer ({selectedCandidateIds.length})
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Rejection Prompt Modal */}
        {rejectionModalApp && createPortal(
          <div
            className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setRejectionModalApp(null)}
          >
            <div
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[calc(100vh-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" /> Confirm Applicant Rejection
              </h3>
              <p className="text-xs text-slate-600">
                Please provide an internal reason for rejecting this candidate application for audit records:
              </p>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Insufficient years of hands-on React experience..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-red-600"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectionModalApp(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitRejection}
                  className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold shadow-xs"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Snapshot Preview Modal */}
        {previewSnapshot && createPortal(
          <div
            className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setPreviewSnapshot(null)}
          >
            <div
              className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[calc(100vh-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  Application-Time Profile Snapshot
                </h3>
                <button type="button" onClick={() => setPreviewSnapshot(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <pre className="text-[11px] font-mono bg-slate-50 p-3 rounded-xl border border-slate-200 overflow-x-auto text-slate-800">
                {JSON.stringify(previewSnapshot, null, 2)}
              </pre>
            </div>
          </div>,
          document.body
        )}

        {/* Explicit Confirmation Before Publishing Shortlist */}
        {/* MODAL 1: Simplified Share with Employer Modal */}
        {showShareEmployerModal && createPortal(
          <div
            className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowShareEmployerModal(false)}
          >
            <div
              className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[calc(100vh-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Share with Employer</h3>
                    <p className="text-[11px] text-slate-500">
                      Deliver candidate shortlist directly to the employer
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowShareEmployerModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Job & Company Overview */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Job Title:</span>
                  <span className="font-bold text-slate-900">{job?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Company:</span>
                  <span className="font-bold text-slate-900">{job?.company_name || 'Direct Client'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Selected Candidates:</span>
                  <span className="font-bold text-indigo-700">{selectedCandidateIds.length} candidate(s)</span>
                </div>
              </div>

              {/* Selected Candidates Pills */}
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1">
                {executiveCandidates.filter(c => selectedCandidateIds.includes(c.id)).map(c => (
                  <span key={c.id} className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-semibold flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-indigo-600" />
                    {c.name}
                  </span>
                ))}
              </div>

              {/* Form Fields */}
              <div className="space-y-3 pt-1">
                {/* Recipient Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Recipient Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={shareRecipientEmail}
                    onChange={(e) => setShareRecipientEmail(e.target.value)}
                    placeholder="e.g. hiring.manager@company.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Supports both registered Vakancy employers and external employers via email verification.
                  </p>
                </div>

                {/* Additional Recipient Emails */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Additional Recipient Emails <span className="text-slate-400 font-normal">(optional, comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    value={shareAdditionalEmails}
                    onChange={(e) => setShareAdditionalEmails(e.target.value)}
                    placeholder="hr@company.com, director@company.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                {/* Optional Message */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Optional Message to Employer
                  </label>
                  <textarea
                    rows={2}
                    value={shareCustomMessage}
                    onChange={(e) => setShareCustomMessage(e.target.value)}
                    placeholder="Add a personalized note or instructions for the hiring manager..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                {/* Link Expiration Window */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Link Expiration Window
                  </label>
                  <select
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600"
                  >
                    <option value={7}>7 Days (1 Week)</option>
                    <option value={14}>14 Days (Default - Recommended)</option>
                    <option value={30}>30 Days (1 Month)</option>
                  </select>
                </div>

                {/* Mask Candidate Contact Information Toggle (Default: ON) */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={maskContactInfo}
                      onChange={(e) => setMaskContactInfo(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-800 block">
                        Mask Candidate Contact Information (Recommended)
                      </span>
                      <span className="text-slate-500 text-[11px] block mt-0.5">
                        {maskContactInfo
                          ? 'Candidate email and phone numbers will be masked in the employer dossier (e.g. ra***@gmail.com, ******4321).'
                          : 'Candidate email and phone numbers will be visible in full to the verified employer (e.g. rahul@gmail.com, 9876544321).'}
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Feedback messages */}
              {shareModalError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{shareModalError}</span>
                </div>
              )}
              {shareModalSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{shareModalSuccess}</span>
                </div>
              )}

              {/* Generated link display box if already created */}
              {createdShareData && (
                <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
                    Secure Shortlist Link Generated
                  </span>
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin.includes(':5174') ? window.location.origin.replace(':5174', ':5173') : window.location.origin}/executive-search/shortlist/${createdShareData.share_token}`}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 text-xs font-mono text-indigo-200 border border-slate-700 select-all"
                  />
                </div>
              )}

              {/* Action Buttons: Preview, Copy Secure Link, Send Email */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleExecuteShare({ openPreview: true })}
                  disabled={isPublishingShare}
                  className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Preview Shortlist
                </button>

                <button
                  type="button"
                  onClick={() => handleExecuteShare({ copyOnly: true })}
                  disabled={isPublishingShare}
                  className="px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy Secure Link
                </button>

                <button
                  type="button"
                  id="btn-modal-send-email"
                  onClick={() => handleExecuteShare({ sendEmail: true })}
                  disabled={isPublishingShare || !shareRecipientEmail}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isPublishingShare ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Mail className="w-3.5 h-3.5" />
                  )}
                  Send Email
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* MODAL 2: Admin Link Management & History Modal (Secondary Action) */}
        {showLinkHistoryModal && createPortal(
          <div
            className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowLinkHistoryModal(false)}
          >
            <div
              className="bg-white rounded-2xl p-6 max-w-3xl w-full shadow-2xl space-y-4 max-h-[calc(100vh-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Shortlist Link History</h3>
                    <p className="text-xs text-slate-500">
                      Manage generated candidate links, view activity, and revoke access for this job.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLinkHistoryModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {executiveShares.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl">
                  No shortlist links generated for this job yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3">Title / Recipient</th>
                        <th className="p-3">Candidates</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Expires</th>
                        <th className="p-3 text-center">Activity</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {executiveShares.map((s) => {
                        const isRevoked = s.effective_status === 'REVOKED';
                        const isExpired = s.effective_status === 'EXPIRED';

                        return (
                          <tr key={s.id} className="hover:bg-slate-50/70">
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{s.title || 'Executive Shortlist'}</div>
                              <div className="text-[10px] text-slate-400">
                                {s.recipient_email ? `Shared with: ${s.recipient_email}` : `Created by: ${s.created_by_name || 'Staff'}`}
                                {s.created_at ? ` • ${new Date(s.created_at).toLocaleDateString()}` : ''}
                              </div>
                            </td>
                            <td className="p-3 font-semibold text-slate-800">
                              {s.candidate_count || 0} candidates
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isRevoked ? 'bg-red-100 text-red-800 border border-red-200' :
                                isExpired ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}>
                                {s.effective_status}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600">
                              {s.expires_at ? new Date(s.expires_at).toLocaleDateString() : 'Never'}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleViewActivity(s)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                                title="View access and download audit activity"
                              >
                                <Eye className="w-3 h-3 text-slate-500" />
                                Logs
                              </button>
                            </td>
                            <td className="p-3 text-right">
                              {!isRevoked && !isExpired ? (
                                <button
                                  type="button"
                                  onClick={() => handleRevokeShare(s.id)}
                                  disabled={revokingShareId === s.id}
                                  className="px-2 py-1 rounded-md text-red-600 hover:bg-red-50 text-[11px] font-bold border border-red-200 transition-colors disabled:opacity-50 cursor-pointer"
                                  title="Revoke link immediately"
                                >
                                  {revokingShareId === s.id ? 'Revoking...' : 'Revoke'}
                                </button>
                              ) : (
                                <span className="text-slate-400 text-[10px] italic">{s.effective_status}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowLinkHistoryModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs"
                >
                  Close History
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* MODAL 3: Candidate Summary Preview Modal */}
        {candidateToPreview && createPortal(
          <div
            className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setCandidateToPreview(null)}
          >
            <div
              className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[calc(100vh-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{candidateToPreview.name}</h3>
                  <p className="text-xs text-slate-500">
                    {candidateToPreview.current_designation || candidateToPreview.professional_headline || 'Candidate Profile'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCandidateToPreview(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Experience</span>
                    <span className="font-semibold text-slate-900">{candidateToPreview.total_experience || 0} Years</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Current Location</span>
                    <span className="font-semibold text-slate-900">{candidateToPreview.current_location || 'Not Specified'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Current Company</span>
                    <span className="font-semibold text-slate-900">{candidateToPreview.current_organization || 'Not Specified'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Shortlisted By</span>
                    <span className="font-semibold text-slate-900">{candidateToPreview.shortlisted_by_name || 'Admin'}</span>
                  </div>
                </div>

                {candidateToPreview.professional_summary && (
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">Professional Summary</h4>
                    <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                      {candidateToPreview.professional_summary}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                {candidateToPreview.application_id && (
                  <button
                    type="button"
                    onClick={() => {
                      handleViewResume(candidateToPreview.application_id);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" /> View Resume
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCandidateToPreview(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-semibold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Shortlist Access & Download Activity Modal */}
        {activityModalShare && createPortal(
          <div
            className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setActivityModalShare(null)}
          >
            <div
              className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[calc(100vh-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Access &amp; Download Activity Log
                  </h3>
                  <p className="text-[11px] text-slate-500">{activityModalShare.title || 'Executive Shortlist'}</p>
                </div>
                <button type="button" onClick={() => setActivityModalShare(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {loadingActivity ? (
                <div className="p-8 text-center text-slate-400 text-xs">Loading activity logs...</div>
              ) : activityLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                  No access or download events recorded for this link yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-72">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="p-2.5">Timestamp</th>
                        <th className="p-2.5">Action</th>
                        <th className="p-2.5">Details</th>
                        <th className="p-2.5">Client IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {activityLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="p-2.5 text-slate-500">
                            {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                          </td>
                          <td className="p-2.5 font-bold text-slate-900">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                              log.action === 'VIEW_SHORTLIST' ? 'bg-blue-100 text-blue-800' :
                              log.action === 'BULK_DOWNLOAD_RESUMES' ? 'bg-purple-100 text-purple-800' :
                              'bg-emerald-100 text-emerald-800'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-600">
                            {log.candidate_name ? `Candidate: ${log.candidate_name}` : 'Shortlist Page'}
                          </td>
                          <td className="p-2.5 font-mono text-[10px] text-slate-400">
                            {log.ip_address || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

        {/* Footer */}
        <div className="shrink-0 px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors text-xs"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AdminJobDetailsModal;
