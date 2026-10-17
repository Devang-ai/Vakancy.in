import React, { useState, useEffect } from 'react';
import {  useParams, Link, useNavigate , useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageTransition, StaggerContainer, StaggerItem, FadeInSection } from '../../components/common/Motion';

/**
 * Vakancy.in - Employer Applicants Management Page
 * Stitch Screen: 16763d9caa244b2eb96c67aa1b762b56
 * Route: /recruiter/jobs/:id/applicants
 *
 * Privacy & Security Boundary:
 * - Candidate contact details and private dossiers are strictly managed by Vakancy.in.
 * - Employer views application counts, reference numbers, received dates, and high-level recruitment statuses.
 * - Employer can raise an enquiry/request to Vakancy.in team regarding an applicant.
 */
export default function EmployerApplicantsPage() {
  const { id: jobId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  // Component State
  const [job, setJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    new_received: 0,
    under_review: 0,
    shortlisted: 0,
    interview: 0,
    selected: 0,
    enquiries_total: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [activeTab, setActiveTab] = useState('all'); // all, applied, reviewing, shortlisted, interview, hired
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  // Enquiry Modal State
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);
  const [enquiryType, setEnquiryType] = useState('Request Candidate Discussion');
  const [enquiryMessage, setEnquiryMessage] = useState('');
  const [submittingEnquiry, setSubmittingEnquiry] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState(null);

  // View Enquiries History Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyApplicant, setHistoryApplicant] = useState(null);
  const [applicantEnquiries, setApplicantEnquiries] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3800);
  };

  // Fetch Applicants from Backend (Safe, Multi-Tenant Isolated API)
  const fetchApplicants = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/employers/jobs/${jobId}/applicants`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.status === 401) {
        navigate('/login');
        return;
      }

      if (res.status === 403) {
        setError('Access denied: You can only view applicants for your own jobs.');
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.success) {
        setJob(data.job || null);
        setApplicants(data.applicants || []);
        setMetrics(data.metrics || {
          total: data.applicants?.length || 0,
          new_received: 0,
          under_review: 0,
          shortlisted: 0,
          interview: 0,
          selected: 0,
          enquiries_total: 0
        });
      } else {
        setError(data.message || 'Failed to load applicants.');
      }
    } catch (err) {
      console.error('Error fetching applicants:', err);
      setError('Network connection error while loading applicants list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jobId && token) {
      fetchApplicants();
    }
  }, [jobId, token]);

  // Handle Enquiry Submission
  const handleOpenEnquiryModal = (applicant) => {
    setSelectedApplicant(applicant);
    setEnquiryType('Request Candidate Discussion');
    setEnquiryMessage('');
    setEnquirySuccess(null);
    setEnquiryModalOpen(true);
  };

  const handleSubmitEnquiry = async (e) => {
    e.preventDefault();
    if (!selectedApplicant) return;

    setSubmittingEnquiry(true);
    try {
      const res = await fetch(`/api/employers/applications/${selectedApplicant.id}/enquiry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          enquiry_type: enquiryType,
          message: enquiryMessage
        })
      });

      const data = await res.json();
      if (data.success) {
        setEnquirySuccess('Enquiry successfully dispatched to Vakancy.in recruitment desk!');
        showToast('Enquiry sent! A Vakancy.in recruitment specialist will reach out shortly.');
        setTimeout(() => {
          setEnquiryModalOpen(false);
          setSelectedApplicant(null);
          fetchApplicants();
        }, 1400);
      } else {
        showToast(data.message || 'Failed to submit enquiry.', 'error');
      }
    } catch (err) {
      showToast('Network error submitting enquiry. Please try again.', 'error');
    } finally {
      setSubmittingEnquiry(false);
    }
  };

  // View Enquiry History for an Applicant
  const handleViewHistory = async (applicant) => {
    setHistoryApplicant(applicant);
    setHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/employers/applications/${applicant.id}/enquiries`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setApplicantEnquiries(data.enquiries || []);
      }
    } catch (_) {
      setApplicantEnquiries([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Filter Applicants
  const filteredApplicants = applicants.filter((app) => {
    // Tab filter
    if (activeTab === 'applied' && app.status !== 'applied') return false;
    if (activeTab === 'reviewing' && app.status !== 'reviewing' && app.status !== 'screening') return false;
    if (activeTab === 'shortlisted' && app.status !== 'shortlisted') return false;
    if (activeTab === 'interview' && app.status !== 'interview') return false;
    if (activeTab === 'hired' && app.status !== 'hired' && app.status !== 'selected') return false;

    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const matchRef = (app.reference_number || '').toLowerCase().includes(query);
      const matchId = (app.id || '').toLowerCase().includes(query);
      if (!matchRef && !matchId) return false;
    }

    return true;
  });

  // Helpers
  const formatDate = (isoString) => {
    if (!isoString) return 'Recent';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (_) {
      return isoString;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'applied':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#dde1ff] text-[#00288e] text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00288e]" />
            Application Received
          </span>
        );
      case 'reviewing':
      case 'screening':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            Under Review
          </span>
        );
      case 'shortlisted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#86f2e4]/40 text-[#006f66] text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#006a61]" />
            Shortlisted by Team
          </span>
        );
      case 'interview':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
            Interview Stage
          </span>
        );
      case 'hired':
      case 'selected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            Selected
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Not Proceeded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#eff4ff] text-[#0b1c30] text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00288e]" />
            {status}
          </span>
        );
    }
  };

  return (
    <PageTransition
      className="min-h-screen bg-[#f8fafc] text-[#0f172a] flex flex-col font-sans"
      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
    >
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-semibold text-white animate-in slide-in-from-top-2 ${
          toast.type === 'error' ? 'bg-[#ba1a1a]' : 'bg-[#00288e]'
        }`}>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          REQUISITION CONTEXT & BREADCRUMB HEADER
      ───────────────────────────────────────────────────────── */}
      <section className="w-full bg-white border-b border-slate-200 shadow-xs px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col gap-3">
          {/* Breadcrumb row */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#444653]">
            <div className="flex items-center gap-2">
              <Link to="/recruiter/jobs" className="hover:text-[#00288e] transition-colors font-medium">
                Jobs &amp; Requisitions
              </Link>
              <span>/</span>
              <span className="text-[#0b1c30] font-semibold truncate max-w-xs sm:max-w-md">
                {job?.title || 'Job Requisition'}
              </span>
              <span>/</span>
              <span className="text-[#00288e] font-bold">Applicants</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Notification Button */}
              

              <Link
                to="/recruiter/jobs"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#00288e] hover:underline"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to All Jobs</span>
              </Link>
            </div>
          </div>

          {/* Job Title & Summary Band */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#00288e] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#0b1c30] tracking-tight">
                  {job?.title || 'Loading position details...'}
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[#444653] font-mono text-xs font-semibold">
                  #REQ-{jobId?.substring(0, 6)?.toUpperCase()}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#444653] pt-0.5">
                <span className="flex items-center gap-1 font-medium">
                  <svg className="w-3.5 h-3.5 text-[#00288e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {job?.location || 'India (Hybrid)'} ({job?.workplace_type || 'Hybrid'})
                </span>
                <span>•</span>
                <span>Department: <strong className="text-[#0b1c30]">{job?.department || 'General'}</strong></span>
                <span>•</span>
                <span>Type: <strong className="text-[#0b1c30]">{job?.employment_type || 'Full-time'}</strong></span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <Link
                to={`/recruiter/jobs/${jobId}/review`}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-[#0b1c30] text-xs font-semibold hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5 text-[#444653]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>View Job Spec</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────
          SCOREBOARD METRICS CARDS
      ───────────────────────────────────────────────────────── */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-5">
        <StaggerContainer className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Total Received */}
          <StaggerItem index={0} className="p-4 rounded-2xl bg-white border border-slate-200/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-xs text-[#444653]">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Total Applications</span>
              <span className="w-7 h-7 rounded-lg bg-[#eff4ff] text-[#00288e] flex items-center justify-center font-bold">
                #
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] font-mono">
                {metrics.total}
              </span>
              <span className="text-[11px] text-[#006f66] font-semibold">
                received
              </span>
            </div>
            <p className="text-[10px] text-[#444653] mt-1">Total inbound candidate applications</p>
          </StaggerItem>

          {/* Card 2: New Received */}
          <StaggerItem index={1} className="p-4 rounded-2xl bg-white border border-slate-200/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-xs text-[#444653]">
              <span className="font-semibold uppercase tracking-wider text-[11px]">New Applications</span>
              <span className="w-7 h-7 rounded-lg bg-[#dde1ff] text-[#173bab] flex items-center justify-center font-bold">
                ★
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#00288e] font-mono">
                {metrics.new_received}
              </span>
              <span className="text-[11px] text-[#173bab] font-semibold">
                awaiting review
              </span>
            </div>
            <p className="text-[10px] text-[#444653] mt-1">Fresh applications ready for processing</p>
          </StaggerItem>

          {/* Card 3: In Pipeline */}
          <StaggerItem index={2} className="p-4 rounded-2xl bg-white border border-slate-200/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-xs text-[#444653]">
              <span className="font-semibold uppercase tracking-wider text-[11px]">In Screening Pipeline</span>
              <span className="w-7 h-7 rounded-lg bg-[#86f2e4]/30 text-[#006f66] flex items-center justify-center font-bold">
                ✓
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#006a61] font-mono">
                {metrics.under_review + metrics.shortlisted + metrics.interview}
              </span>
              <span className="text-[11px] text-[#006f66] font-semibold">
                active
              </span>
            </div>
            <p className="text-[10px] text-[#444653] mt-1">Shortlisted &amp; interview stage candidates</p>
          </StaggerItem>

          {/* Card 4: Enquiries */}
          <StaggerItem index={3} className="p-4 rounded-2xl bg-white border border-slate-200/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-xs text-[#444653]">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Enquiries Dispatched</span>
              <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                ✉
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] font-mono">
                {metrics.enquiries_total}
              </span>
              <span className="text-[11px] text-amber-700 font-semibold">
                requests
              </span>
            </div>
            <p className="text-[10px] text-[#444653] mt-1">Communication threads with Vakancy.in team</p>
          </StaggerItem>
        </StaggerContainer>
      </section>

      {/* ─────────────────────────────────────────────────────────
          VAKANCY.IN MANAGED RECRUITMENT REASSURANCE BANNER
      ───────────────────────────────────────────────────────── */}
      <FadeInSection className="w-full px-4 sm:px-6 lg:px-8 mb-4">
        <div className="max-w-7xl mx-auto rounded-2xl bg-gradient-to-r from-[#eff4ff] via-white to-[#eff4ff] border border-[#dde1ff] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3.5 max-w-3xl">
            <div className="w-10 h-10 rounded-xl bg-[#00288e] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#00288e]">
                Vakancy.in Managed Recruitment &amp; Privacy Shield
              </h3>
              <p className="text-xs text-[#444653] leading-relaxed">
                Candidate personal contact details, verified resumes, and dossiers are handled directly by the Vakancy.in recruitment team to protect job seeker privacy and ensure fair qualification screening. To initiate discussions, schedule interviews, or request candidate summaries, click <strong>"Contact Vakancy.in"</strong> on any application below.
              </p>
            </div>
          </div>

          <div className="flex-shrink-0">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-[#dde1ff] text-xs font-semibold text-[#00288e] shadow-xs">
              <svg className="w-4 h-4 text-[#006a61]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Zero Spam • Verified Matching
            </span>
          </div>
        </div>
      </FadeInSection>

      {/* ─────────────────────────────────────────────────────────
          APPLICANTS TABLE & FILTER SECTION
      ───────────────────────────────────────────────────────── */}
      <FadeInSection className="w-full px-4 sm:px-6 lg:px-8 pb-12 flex-1">
        <div className="max-w-7xl mx-auto bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
          {/* Stage Tabs Ribbon */}
          <div className="px-4 py-2 border-b border-slate-200 bg-[#eff4ff]/40 flex items-center justify-between gap-4 overflow-x-auto">
            <div className="flex items-center gap-1.5 min-w-max">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-[#00288e] text-white shadow-xs'
                    : 'bg-white text-[#444653] hover:bg-slate-100'
                }`}
              >
                All Applications ({metrics.total})
              </button>

              <button
                onClick={() => setActiveTab('applied')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'applied'
                    ? 'bg-[#00288e] text-white shadow-xs'
                    : 'bg-white text-[#444653] hover:bg-slate-100'
                }`}
              >
                New Received ({metrics.new_received})
              </button>

              <button
                onClick={() => setActiveTab('reviewing')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'reviewing'
                    ? 'bg-[#00288e] text-white shadow-xs'
                    : 'bg-white text-[#444653] hover:bg-slate-100'
                }`}
              >
                Under Review ({metrics.under_review})
              </button>

              <button
                onClick={() => setActiveTab('shortlisted')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'shortlisted'
                    ? 'bg-[#00288e] text-white shadow-xs'
                    : 'bg-white text-[#444653] hover:bg-slate-100'
                }`}
              >
                Shortlisted ({metrics.shortlisted})
              </button>

              <button
                onClick={() => setActiveTab('interview')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'interview'
                    ? 'bg-[#00288e] text-white shadow-xs'
                    : 'bg-white text-[#444653] hover:bg-slate-100'
                }`}
              >
                Interview Stage ({metrics.interview})
              </button>
            </div>

            <span className="text-xs text-[#444653] whitespace-nowrap hidden sm:inline">
              Showing <strong>{filteredApplicants.length}</strong> applicant(s)
            </span>
          </div>

          {/* Search & Omnibar */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white">
            <div className="relative flex-1 max-w-md">
              <svg className="w-4 h-4 text-[#444653] absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Application Reference (e.g. APP-8821)..."
                className="w-full pl-9 pr-8 py-2 bg-[#f8f9ff] text-[#0b1c30] placeholder:text-[#444653] text-xs rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] border border-slate-200 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ×
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchApplicants}
                className="p-2 rounded-xl border border-slate-200 text-[#444653] hover:text-[#00288e] hover:bg-[#eff4ff] transition-colors"
                title="Refresh List"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Loading / Error / Empty / Table States */}
          {loading ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-[#00288e] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-[#444653]">Loading candidate applications...</p>
            </div>
          ) : error ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#ba1a1a] flex items-center justify-center mx-auto">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-[#ba1a1a]">{error}</p>
              <button
                onClick={fetchApplicants}
                className="px-4 py-1.5 rounded-xl bg-[#00288e] text-white text-xs font-semibold hover:bg-[#1e40af]"
              >
                Retry
              </button>
            </div>
          ) : filteredApplicants.length === 0 ? (
            /* Empty State */
            <div className="p-16 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-[#eff4ff] text-[#00288e] flex items-center justify-center mx-auto shadow-xs">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#0b1c30]">
                  {searchQuery ? 'No matching applicants found' : 'No applications received yet'}
                </h3>
                <p className="text-xs text-[#444653] leading-relaxed">
                  {searchQuery
                    ? `No applications matched "${searchQuery}". Try clearing search filters.`
                    : 'Once candidates discover this job and submit their applications on Vakancy.in, application entries will appear here in real-time.'}
                </p>
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-[#00288e] font-semibold hover:bg-slate-50"
                >
                  Clear Search Filter
                </button>
              )}
            </div>
          ) : (
            /* Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#0b1c30]">
                <thead className="bg-[#f8f9ff] text-[11px] font-semibold uppercase tracking-wider text-[#444653] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Application Ref</th>
                    <th className="py-3 px-4">Received Date</th>
                    <th className="py-3 px-4">Recruitment Stage</th>
                    <th className="py-3 px-4">Screening Data</th>
                    <th className="py-3 px-4">Enquiry Status</th>
                    <th className="py-3 px-4 text-right">Vakancy.in Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {filteredApplicants.map((app, idx) => (
                    <tr key={app.id} className="hover:bg-[#f8f9ff]/70 transition-colors">
                      {/* 1. Reference */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-[#eff4ff] text-[#00288e] flex items-center justify-center font-mono text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <span className="font-mono font-bold text-[#00288e]">
                            {app.reference_number}
                          </span>
                        </div>
                      </td>

                      {/* 2. Received Date */}
                      <td className="py-3.5 px-4 text-[#444653]">
                        <span className="font-medium text-[#0b1c30]">
                          {formatDate(app.applied_at)}
                        </span>
                        <span className="block text-[10px] text-[#444653]">
                          Inbound submission
                        </span>
                      </td>

                      {/* 3. Recruitment Stage */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(app.status)}
                      </td>

                      {/* 4. Screening Status */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#006a61] bg-[#86f2e4]/20 px-2 py-0.5 rounded-md font-medium">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Questionnaire Validated
                        </span>
                      </td>

                      {/* 5. Enquiry Status */}
                      <td className="py-3.5 px-4">
                        {app.enquiries_count > 0 ? (
                          <button
                            onClick={() => handleViewHistory(app)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                          >
                            <span>✉ {app.enquiries_count} Enquiry Raised</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            No active enquiries
                          </span>
                        )}
                      </td>

                      {/* 6. Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEnquiryModal(app)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00288e] text-white hover:bg-[#1e40af] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span>Contact Vakancy.in</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </FadeInSection>

      {/* ─────────────────────────────────────────────────────────
          RAISE ENQUIRY MODAL (COMMERCIAL RECRUITMENT FLOW)
      ───────────────────────────────────────────────────────── */}
      {enquiryModalOpen && selectedApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-[#eff4ff]/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#00288e] text-white flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0b1c30]">
                    Contact Vakancy.in Regarding Applicant
                  </h3>
                  <p className="text-[11px] text-[#444653]">
                    Reference: <strong className="text-[#00288e] font-mono">{selectedApplicant.reference_number}</strong> • Position: {job?.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEnquiryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 text-base leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmitEnquiry} className="p-6 space-y-4">
              {enquirySuccess ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    ✓
                  </div>
                  <h4 className="text-sm font-bold text-emerald-900">Enquiry Dispatched</h4>
                  <p className="text-xs text-emerald-800">{enquirySuccess}</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-[#0b1c30] uppercase tracking-wider mb-1.5">
                      Enquiry Purpose / Action Requested <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <div className="space-y-2 text-xs">
                      {[
                        { id: 'Request Candidate Discussion', desc: 'Discuss candidate qualifications with assigned Vakancy.in recruiter' },
                        { id: 'Request Detailed Screening Summary', desc: 'Receive synthesized technical and screening evaluation report' },
                        { id: 'Request Interview Coordination', desc: 'Coordinate interview slot availability with the candidate' },
                        { id: 'General Recruitment Query', desc: 'Ask a general requisition query regarding this candidate application' }
                      ].map((opt) => (
                        <label
                          key={opt.id}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                            enquiryType === opt.id
                              ? 'border-[#00288e] bg-[#eff4ff]/60 ring-1 ring-[#00288e]'
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="enquiry_type"
                            value={opt.id}
                            checked={enquiryType === opt.id}
                            onChange={(e) => setEnquiryType(e.target.value)}
                            className="mt-0.5 text-[#00288e] focus:ring-[#00288e]"
                          />
                          <div>
                            <span className="font-bold text-[#0b1c30]">{opt.id}</span>
                            <p className="text-[11px] text-[#444653] mt-0.5">{opt.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0b1c30] uppercase tracking-wider mb-1.5">
                      Optional Specific Notes / Questions
                    </label>
                    <textarea
                      rows={3}
                      value={enquiryMessage}
                      onChange={(e) => setEnquiryMessage(e.target.value)}
                      placeholder="e.g. We would like to assess this applicant's availability for a 45-minute technical review next Tuesday..."
                      className="w-full p-3 bg-[#f8f9ff] text-[#0b1c30] placeholder:text-[#444653] text-xs rounded-xl border border-slate-200 outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all resize-none"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-[#444653] flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#006a61] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span>
                      The Vakancy.in recruitment team handles candidate scheduling and verified dossiers directly. No online fees or unlock charges apply.
                    </span>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setEnquiryModalOpen(false)}
                      disabled={submittingEnquiry}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-[#444653] hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingEnquiry}
                      className="px-5 py-2 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      {submittingEnquiry ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Dispatching...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          <span>Send Enquiry</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          VIEW ENQUIRIES HISTORY MODAL
      ───────────────────────────────────────────────────────── */}
      {historyModalOpen && historyApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-[#eff4ff]/60">
              <div>
                <h3 className="text-xs font-bold text-[#0b1c30]">
                  Enquiry History for {historyApplicant.reference_number}
                </h3>
                <p className="text-[10px] text-[#444653]">Communications sent to Vakancy.in recruitment team</p>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 text-sm leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 max-h-80 overflow-y-auto space-y-3">
              {loadingHistory ? (
                <div className="py-8 text-center text-xs text-[#444653]">
                  Loading enquiry history...
                </div>
              ) : applicantEnquiries.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No previous enquiries recorded for this applicant.
                </div>
              ) : (
                applicantEnquiries.map((enq) => (
                  <div key={enq.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#00288e]">{enq.enquiry_type}</span>
                      <span className="px-2 py-0.2 rounded text-[10px] font-semibold bg-[#dde1ff] text-[#173bab]">
                        {enq.status}
                      </span>
                    </div>
                    {enq.message && (
                      <p className="text-[11px] text-[#444653] italic">"{enq.message}"</p>
                    )}
                    <span className="block text-[10px] text-slate-400 pt-0.5">
                      Dispatched on {formatDate(enq.created_at)}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-[#00288e] text-white text-xs font-semibold hover:bg-[#1e40af] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
