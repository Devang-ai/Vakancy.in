import React, { useState, useEffect, useRef } from 'react';
import {  Link, useNavigate , useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import Toast from '../../components/ui/Toast';
import EmployerFooter from '../../components/employer/EmployerFooter';
import { PageTransition, StaggerContainer, StaggerItem, FadeInSection } from '../../components/common/Motion';

/**
 * Clean, Standardized Employer Dashboard Page
 * Visual standard: Google Stitch & 2nd screenshot reference
 * 
 * Scope-Enforced Requirements:
 * - Single standardized EmployerSidebar
 * - Clean dashboard header (no fake badges / promotional fluff)
 * - 4 clean KPI cards powered 100% by real backend data
 * - Active Jobs table with clean headers & multi-location support
 * - Real applications feed (no dummy/fake applications)
 * - Zero hardcoded business values or fake statuses
 */
export const EmployerDashboardPage = () => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [jobFilter, setJobFilter] = useState('all'); // 'all' | 'open' | 'inactive'
  const { setSidebarOpen } = useOutletContext();
  const [toast, setToast] = useState(null);

  const toastTimer = useRef(null);

  const showToast = (message, type = 'info', title = null) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    const toastObj = typeof message === 'object' && message !== null ? message : { message, type, title };
    setToast(toastObj);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await API.get('/employers/dashboard-stats');
      if (res && res.success) {
        if (res.employer && res.employer.is_onboarding_completed === false) {
          navigate('/recruiter/onboarding');
          return;
        }
        setDashboardData(res);
      } else {
        setDashboardData({
          stats: { total_jobs: 0, active_jobs: 0, inactive_jobs: 0, total_applicants: 0, enquiries_count: 0 },
          active_jobs: [],
          recent_applications: []
        });
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setDashboardData({
        stats: { total_jobs: 0, active_jobs: 0, inactive_jobs: 0, total_applicants: 0, enquiries_count: 0 },
        active_jobs: [],
        recent_applications: []
      });
    } finally {
      setLoading(false);
    }
  };

  // Derived variables
  const companyName =
    dashboardData?.employer?.company_name ||
    profile?.company_name ||
    user?.company_name ||
    'Employer Account';

  const logoUrl =
    dashboardData?.employer?.logo_url ||
    profile?.logo_url ||
    user?.logo_url ||
    null;

  const [logoError, setLogoError] = useState(false);
  useEffect(() => {
    setLogoError(false);
  }, [logoUrl]);

  const userName =
    user?.name ||
    user?.email?.split('@')[0]?.replace('.', ' ') ||
    'Employer';

  const userDisplayName = userName
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const stats = dashboardData?.stats || {
    total_jobs: 0,
    active_jobs: 0,
    inactive_jobs: 0,
    total_applicants: 0,
    enquiries_count: 0
  };

  const allJobs = dashboardData?.active_jobs || [];
  const recentApplications = dashboardData?.recent_applications || [];

  // Filter jobs
  const filteredJobs = allJobs.filter((job) => {
    if (jobFilter === 'open') return job.status === 'open' || job.status === 'active';
    if (jobFilter === 'inactive') return job.status === 'closed' || job.status === 'draft' || job.status === 'inactive';
    return true;
  });

  // Calculate greeting by time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <PageTransition
      className="w-full flex-1 flex flex-col bg-[#f8fafc] font-sans text-[#0f172a] antialiased"
      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
    >
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Toast
            type={toast.type || 'info'}
            title={toast.title}
            message={toast.message}
            onClose={() => {
              if (toastTimer.current) clearTimeout(toastTimer.current);
              setToast(null);
            }}
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────
          1. STANDARDIZED SIDEBAR NAVIGATION
      ───────────────────────────────────────────── */}
      

      {/* ─────────────────────────────────────────────
          2. MAIN CONTENT WRAPPER
      ───────────────────────────────────────────── */}
        {/* Top Header Bar */}
        

        {/* ─────────────────────────────────────────────
            3. MAIN CONTENT AREA
        ───────────────────────────────────────────── */}
        <main className="w-full flex-1 bg-[#f8fafc]">
          <StaggerContainer className="px-6 py-6 max-w-[80rem] mx-auto w-full space-y-6">
            {/* Clean Screen Header */}
            <StaggerItem index={0} className="flex flex-col gap-3 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-[#00288e] text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs overflow-hidden">
                    {logoUrl && !logoError ? (
                      <img
                        src={logoUrl}
                        alt={companyName}
                        className="w-full h-full object-contain p-1 bg-white"
                        onError={() => setLogoError(true)}
                      />
                    ) : (
                      companyName.charAt(0) || 'E'
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <h1 className="text-2xl font-bold text-[#0b1c30] tracking-tight">
                      {greeting}, {companyName}
                    </h1>
                    <p className="text-sm font-semibold text-[#444653]">
                      {userDisplayName} · Primary Recruiter
                    </p>
                  </div>
                </div>

                {/* Primary Actions Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to="/recruiter/jobs"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#eff4ff] text-[#0b1c30] text-xs font-semibold hover:bg-[#dce9ff] transition-colors border border-slate-200/60"
                  >
                    <svg className="w-4 h-4 text-[#00288e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                    <span>View Jobs</span>
                  </Link>

                  <Link
                    to="/recruiter/jobs/create"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00288e] text-white text-xs font-semibold shadow-sm hover:bg-[#1e40af] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Post a Job</span>
                  </Link>
                </div>
              </div>
            </StaggerItem>

            {/* 4 Clean Database-Backed Statistics Cards */}
            <StaggerItem index={1} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Metric 1: Active Jobs */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#444653] uppercase tracking-wider">
                    Active Jobs
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#00288e]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                  </div>
                </div>
                <div className="my-3">
                  <span className="text-3xl font-bold text-[#0b1c30] tracking-tight">
                    {stats?.active_jobs ?? 0}
                  </span>
                </div>
              </div>

              {/* Metric 2: Total Applicants */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#444653] uppercase tracking-wider">
                    Total Applicants
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#00288e]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <div className="my-3">
                  <span className="text-3xl font-bold text-[#0b1c30] tracking-tight">
                    {stats?.total_applicants ?? 0}
                  </span>
                </div>
              </div>

              {/* Metric 3: Enquiries Raised */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#444653] uppercase tracking-wider">
                    Enquiries
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#006a61]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                </div>
                <div className="my-3">
                  <span className="text-3xl font-bold text-[#0b1c30] tracking-tight">
                    {stats?.enquiries_count ?? 0}
                  </span>
                </div>
              </div>

              {/* Metric 4: Total Jobs */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#444653] uppercase tracking-wider">
                    Total Jobs
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#00288e]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
                <div className="my-3">
                  <span className="text-3xl font-bold text-[#0b1c30] tracking-tight">
                    {stats?.total_jobs ?? 0}
                  </span>
                </div>
              </div>
            </StaggerItem>

            {/* ─────────────────────────────────────────────
                4. ACTIVE JOBS & HIRING OVERVIEW (TABLE)
            ───────────────────────────────────────────── */}
            <StaggerItem index={2} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col">
              {/* Header & Filter Tabs */}
              <div className="p-5 pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-[#0b1c30]">Active Jobs &amp; Hiring Overview</h2>
                  <p className="text-xs text-[#444653]">
                    Overview of your company's open positions and applicant counts
                  </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 p-1 bg-[#eff4ff] rounded-xl self-start md:self-auto border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setJobFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      jobFilter === 'all'
                        ? 'bg-white text-[#00288e] shadow-xs'
                        : 'text-[#444653] hover:text-[#0b1c30]'
                    }`}
                  >
                    All Jobs ({allJobs.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setJobFilter('open')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      jobFilter === 'open'
                        ? 'bg-white text-[#00288e] shadow-xs'
                        : 'text-[#444653] hover:text-[#0b1c30]'
                    }`}
                  >
                    Active ({stats?.active_jobs || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setJobFilter('inactive')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      jobFilter === 'inactive'
                        ? 'bg-white text-[#00288e] shadow-xs'
                        : 'text-[#444653] hover:text-[#0b1c30]'
                    }`}
                  >
                    Drafts / Inactive ({stats?.inactive_jobs || 0})
                  </button>
                </div>
              </div>

              {/* Table / List */}
              {loading ? (
                <div className="py-12 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-[#00288e] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredJobs.length === 0 ? (
                /* Empty State */
                <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#00288e] mb-3">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-[#0b1c30]">No jobs posted yet</h3>
                  <p className="text-xs text-[#444653] mt-1 max-w-sm">
                    Create your first job posting to start receiving qualified applicants.
                  </p>
                  <Link
                    to="/recruiter/jobs/create"
                    className="mt-4 px-4 py-2 bg-[#00288e] text-white text-xs font-semibold rounded-xl hover:bg-[#1e40af] transition-colors shadow-xs"
                  >
                    Post a Job
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#eff4ff] text-[#444653] font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100">
                        <th className="py-3 px-5">Job</th>
                        <th className="py-3 px-4">Location</th>
                        <th className="py-3 px-4">Work Mode</th>
                        <th className="py-3 px-4">Posted</th>
                        <th className="py-3 px-4 text-right">Applicants</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[#0b1c30]">
                      {filteredJobs.map((job) => {
                        const isOpen = job.status === 'open' || job.status === 'active';

                        // Multi-location clean handling
                        const rawLocation = job.location || '';
                        const parsedLocations = rawLocation
                          .split(';')
                          .map((loc) => loc.trim())
                          .filter(Boolean);

                        const formattedDate = job.created_at
                          ? new Date(job.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })
                          : 'Recent';

                        return (
                          <tr key={job.id} className="hover:bg-[#eff4ff]/60 transition-colors">
                            {/* Job (Title & Category) */}
                            <td className="py-3.5 px-5">
                              <div className="flex flex-col">
                                <Link
                                  to={`/recruiter/jobs/${job.id}/basic`}
                                  className="font-bold text-sm text-[#0b1c30] hover:text-[#00288e] transition-colors"
                                >
                                  {job.title}
                                </Link>
                                <span className="text-[11px] text-[#444653]">
                                  {job.category || job.department || 'General Recruitment'}
                                </span>
                              </div>
                            </td>

                            {/* Location (Clean Multi-Location Display) */}
                            <td className="py-3.5 px-4">
                              {parsedLocations.length > 0 ? (
                                <div className="flex flex-col gap-1 max-w-xs">
                                  {parsedLocations.map((loc, idx) => (
                                    <span key={idx} className="font-medium text-[#0b1c30] leading-tight">
                                      {loc}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[#444653]">Not specified</span>
                              )}
                            </td>

                            {/* Work Mode */}
                            <td className="py-3.5 px-4">
                              <span className="font-medium text-[#0b1c30]">
                                {job.work_mode || job.employment_type || '—'}
                              </span>
                            </td>

                            {/* Posted */}
                            <td className="py-3.5 px-4 text-[#444653] whitespace-nowrap">
                              <span>{formattedDate}</span>
                            </td>

                            {/* Applicants */}
                            <td className="py-3.5 px-4 text-right">
                              <span className="text-sm font-bold text-[#0b1c30]">
                                {job.applicant_count ?? 0}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                  isOpen
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200/50'
                                }`}
                              >
                                {isOpen ? 'Active' : 'Closed / Draft'}
                              </span>
                            </td>

                            {/* Action: Contextual link to Job's Applicants */}
                            <td className="py-3.5 px-5 text-right">
                              <Link
                                to={`/recruiter/jobs/${job.id}/applicants`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#eff4ff] text-[#00288e] text-xs font-semibold hover:bg-[#00288e] hover:text-white transition-all shadow-xs"
                              >
                                <span>Applicants</span>
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </StaggerItem>

            {/* ─────────────────────────────────────────────
                5. RECENT APPLICATIONS STREAM
            ───────────────────────────────────────────── */}
            <StaggerItem index={3} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/60 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-[#0b1c30]">Recent Applications</h2>
                <p className="text-xs text-[#444653]">
                  Latest candidate submissions across your active jobs
                </p>
              </div>

              {/* Applicant Cards */}
              {loading ? (
                <div className="py-8 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-[#00288e] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : recentApplications.length === 0 ? (
                /* Empty State */
                <div className="py-8 px-4 text-center">
                  <p className="text-xs text-[#444653]">No applications yet.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recentApplications.map((app) => {
                    const refCode = app.reference_number || `APP-${app.id.replace(/-/g, '').substring(0, 6).toUpperCase()}`;

                    return (
                      <div
                        key={app.id}
                        className="p-3.5 bg-[#eff4ff]/60 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-[#eff4ff] transition-colors border border-slate-100"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-[#00288e] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>

                          <div className="min-w-0 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-mono font-bold text-[#00288e] bg-[#dde1ff] px-2 py-0.5 rounded">
                                {refCode}
                              </span>
                              <span className="text-xs text-[#444653]">applied for</span>
                              <span className="text-xs font-bold text-[#0b1c30]">
                                {app.job_title || 'Job Opening'}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-[#444653]">
                              <span>
                                Received{' '}
                                {app.applied_at
                                  ? new Date(app.applied_at).toLocaleDateString('en-IN', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    })
                                  : 'recently'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Link: Review / View in Job Applicants */}
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                          <Link
                            to={`/recruiter/jobs/${app.job_id}/applicants`}
                            className="px-3 py-1.5 rounded-lg bg-[#00288e] text-white hover:bg-[#1e40af] text-xs font-semibold transition-all shadow-xs inline-flex items-center gap-1"
                          >
                            <span>View Requisition</span>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </StaggerItem>
          </StaggerContainer>
        </main>

        {/* ─────────────────────────────────────────────
            6. CLEAN WORKSPACE FOOTER
        ───────────────────────────────────────────── */}
        <EmployerFooter />
      </PageTransition>
  );
};

export default EmployerDashboardPage;
