import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import useModalA11y from '../../hooks/useModalA11y';

import CandidatePortalShell from '../../components/candidate/CandidatePortalShell';
import CustomDropdown from '../../components/common/CustomDropdown';
/**
 * CandidateApplicationsPage
 * Stitch Screen ID: 4df96631c3df414d8405026a8859df58
 * Project: Vakancy.in Recruitment Platform Design System (projects/13997293982053869540)
 * Route: /candidate/applications
 *
 * Screen: Candidate My Applications / Application Tracker Hub
 * Features:
 * - Candidate Shell (Sidebar with active Applications nav, Header with profile & notifications)
 * - Top Command Bar: "Candidate Orchestration Pipeline / Active Requisitions" + Export + Find More
 * - 5 KPI Metric Cards: Total Applied (6), Under Review (2), Shortlisted (1), Interviews (1), Offers (1 Selected)
 * - Stage Navigation Tabs with counters
 * - Filter & Search Strip: Live search by role/company/REQ ID, Company filter, Work mode, Date, Sort
 * - Detailed Application Cards with Status Badges, Progress indicators, and Next Step callout strips
 * - Application Detail Modal & Withdraw Application Confirmation
 * - Discovery Recommendation Card & Pagination
 * - Portal Footer with DPDP Act 2023 compliance
 */

/* ─────────────────────────────────────────────
   STITCH APPLICATIONS FALLBACK PRESENTATION DATA
───────────────────────────────────────────── */
const STITCH_APPLICATIONS_FALLBACK = [];

/* ─────────────────────────────────────────────
   CANDIDATE SIDEBAR COMPONENT
───────────────────────────────────────────── */
const CandidateApplicationsPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Local state
  const [applications, setApplications] = useState(STITCH_APPLICATIONS_FALLBACK);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [workModeFilter, setWorkModeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [selectedApp, setSelectedApp] = useState(null);
  const [withdrawModalApp, setWithdrawModalApp] = useState(null);

  useModalA11y(Boolean(selectedApp), () => setSelectedApp(null));
  useModalA11y(Boolean(withdrawModalApp), () => setWithdrawModalApp(null));

  const [withdrawnList, setWithdrawnList] = useState([]);
  const [exportNotice, setExportNotice] = useState(false);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [applicationsError, setApplicationsError] = useState('');

  // Attempt to load real backend applications if available
  useEffect(() => {
    let isMounted = true;
    const fetchRealApplications = async () => {
      try {
        setApplicationsError('');
        const res = await API.get('/applications/my-applications');
        if (res && res.success && Array.isArray(res.applications)) {
          if (isMounted) {
            // Map backend schema to UI format while preserving presentation fidelity
            const mapped = res.applications.map((app, idx) => {
              let salStr = 'Competitive';
              if (app.min_salary != null && app.max_salary != null) {
                const minL = Number(app.min_salary) >= 100000 ? `${(Number(app.min_salary) / 100000).toFixed(0)}L` : app.min_salary;
                const maxL = Number(app.max_salary) >= 100000 ? `${(Number(app.max_salary) / 100000).toFixed(0)}L` : app.max_salary;
                salStr = `₹${minL} – ₹${maxL} LPA`;
              } else if (app.min_salary != null) {
                salStr = `₹${app.min_salary}`;
              }

              return {
                id: app.id || `app-real-${idx}`,
                reqId: `#REQ-${String(app.id || '99000').slice(0, 5).toUpperCase()}`,
                jobId: app.job_id || 'rzp-staff-backend',
                role: app.job_title || 'Software Engineer',
                company: app.company_name || 'Partner Company',
                verified: true,
                logo: app.company_logo || null,
                location: app.job_location || 'Not Specified',
                salary: salStr,
                workMode: app.workplace_type || 'On-site',
                appliedDate: app.applied_at ? `Applied ${new Date(app.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Applied Recently',
                appliedTimestamp: app.applied_at || new Date().toISOString(),
                status: app.status === 'applied' ? 'Application Received' : (app.status === 'selected' || app.status === 'offered' ? 'Offer Received' : (app.status || 'Under Review')),
                statusCategory: app.status === 'applied' ? 'applied' : (app.status === 'selected' || app.status === 'offered' ? 'offers' : (app.status === 'interview' ? 'interview' : 'review')),
                statusBadgeBg: app.status === 'applied' ? 'bg-slate-100 border border-slate-200' : (app.status === 'selected' || app.status === 'offered' ? 'bg-emerald-50 border border-emerald-200' : (app.status === 'interview' ? 'bg-[#eff4ff] border border-[#b8c4ff]' : 'bg-amber-50 border border-amber-200')),
                statusBadgeText: app.status === 'applied' ? 'text-slate-700' : (app.status === 'selected' || app.status === 'offered' ? 'text-emerald-800' : (app.status === 'interview' ? 'text-[#00288e]' : 'text-amber-800')),
                statusIcon: app.status === 'applied' ? 'inbox' : (app.status === 'selected' || app.status === 'offered' ? 'verified' : (app.status === 'interview' ? 'calendar_today' : 'schedule')),
                stageProgress: app.status === 'applied' ? 'Review in Queue' : 'In Progress',
                nextStepLabel: 'Next Step:',
                nextStepTitle: 'Profile evaluation in progress.',
                nextStepDetail: ' Application in talent acquisition review.',
                nextStepIcon: 'hourglass_top',
                nextStepIconColor: 'text-slate-600',
                actions: [
                  { label: 'View Application Details', type: 'details', primary: false, icon: 'description' }
                ]
              };
            });

            setApplications(mapped);
          }
        }
      } catch (err) {
        if (isMounted) setApplicationsError(err?.message || 'Unable to load your applications.');
      } finally {
        if (isMounted) setApplicationsLoading(false);
      }
    };

    fetchRealApplications();
    return () => { isMounted = false; };
  }, []);

  // Filtered applications
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      // Withdrawn check
      if (withdrawnList.includes(app.id)) return false;

      // Tab category filter
      if (activeTab === 'applied' && app.statusCategory !== 'applied') return false;
      if (activeTab === 'review' && app.statusCategory !== 'review') return false;
      if (activeTab === 'shortlisted' && app.statusCategory !== 'shortlisted') return false;
      if (activeTab === 'interview' && app.statusCategory !== 'interview') return false;
      if (activeTab === 'offers' && app.statusCategory !== 'offers') return false;
      if (activeTab === 'archived' && app.statusCategory !== 'archived') return false;

      // Search query (role, company, REQ ID)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchRole = app.role.toLowerCase().includes(q);
        const matchCompany = app.company.toLowerCase().includes(q);
        const matchReq = app.reqId.toLowerCase().includes(q);
        if (!matchRole && !matchCompany && !matchReq) return false;
      }

      // Company filter
      if (companyFilter !== 'all' && app.company.toLowerCase() !== companyFilter.toLowerCase()) {
        return false;
      }

      // Work mode filter
      if (workModeFilter !== 'all' && app.workMode?.toLowerCase() !== workModeFilter.toLowerCase()) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.appliedTimestamp || 0) - new Date(a.appliedTimestamp || 0);
      }
      if (sortBy === 'company') {
        return a.company.localeCompare(b.company);
      }
      return 0;
    });
  }, [applications, activeTab, searchQuery, companyFilter, workModeFilter, sortBy, withdrawnList]);

  // Handle Withdrawal
  const handleConfirmWithdraw = () => {
    if (withdrawModalApp) {
      setWithdrawnList((prev) => [...prev, withdrawModalApp.id]);
      setWithdrawModalApp(null);
    }
  };

  // Export pipeline CSV
  const handleExportData = () => {
    const headers = ['Application ID,Role,Company,Location,Salary,Status,Applied Date\n'];
    const rows = filteredApps.map(a => `"${a.reqId}","${a.role}","${a.company}","${a.location}","${a.salary}","${a.status}","${a.appliedDate}"\n`);
    const blob = new Blob([headers.concat(rows).join('')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Vakancy_Pipeline_Export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setExportNotice(true);
    setTimeout(() => setExportNotice(false), 3000);
  };

  return (
    <CandidatePortalShell>
      <div className="flex flex-col w-full">

            {/* ── TOP COMMAND & ACTION BAR ── */}
            <div className="px-6 py-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[#444653] text-[11px] font-semibold uppercase tracking-wider mb-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#006a61]" />
                  <span>Job Applications</span>
                  <span className="text-[#c4c5d5] font-normal">/</span>
                  <span className="text-[#00288e] font-semibold">Active Roles</span>
                </div>
                <h1 className="text-2xl lg:text-3xl text-[#0b1c30] font-bold tracking-tight">
                  My Applications
                </h1>
                <p className="text-sm text-[#444653] mt-0.5">
                  Track your application status across jobs, scheduled interviews, and active offers.
                </p>
              </div>

              <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
                <Link
                  to="/candidate/jobs"
                  className="h-10 px-4 rounded-xl bg-[#00288e] text-white text-xs font-semibold shadow-xs hover:bg-[#1e40af] transition-all flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                  </svg>
                  <span>Find Opportunities</span>
                </Link>
              </div>
            </div>

            {/* ── KPI METRICS STRIP (Mobile 2-Col Grid + Desktop 5-Card Grid) ── */}
            <div className="px-4 sm:px-6 pb-4 sm:pb-6">
              {/* Mobile Compact KPI Grid (2-Columns) */}
              <div className="grid grid-cols-2 sm:hidden gap-2">
                {/* Total Applied */}
                <div className="p-3 rounded-xl bg-white shadow-2xs border border-[#c4c5d5]/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#444653] tracking-wider block">Applied</span>
                    <span className="text-xl font-bold text-[#0b1c30]">{applications.length}</span>
                  </div>
                  <span className="w-8 h-8 rounded-lg bg-[#eff4ff] text-[#00288e] flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </span>
                </div>

                {/* Under Review */}
                <div className="p-3 rounded-xl bg-white shadow-2xs border border-[#c4c5d5]/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#444653] tracking-wider block">In Review</span>
                    <span className="text-xl font-bold text-[#273548]">{applications.filter(a => a.statusCategory === 'review').length}</span>
                  </div>
                  <span className="w-8 h-8 rounded-lg bg-[#eff4ff] text-[#273548] flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </span>
                </div>

                {/* Shortlisted */}
                <div className="p-3 rounded-xl bg-white shadow-2xs border border-[#c4c5d5]/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#444653] tracking-wider block">Shortlisted</span>
                    <span className="text-xl font-bold text-[#006a61]">{applications.filter(a => a.statusCategory === 'shortlisted').length}</span>
                  </div>
                  <span className="w-8 h-8 rounded-lg bg-[#eff4ff] text-[#006a61] flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </span>
                </div>

                {/* Interviews */}
                <div className="p-3 rounded-xl bg-white shadow-2xs border border-[#c4c5d5]/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#444653] tracking-wider block">Interview</span>
                    <span className="text-xl font-bold text-[#00288e]">{applications.filter(a => a.statusCategory === 'interview').length}</span>
                  </div>
                  <span className="w-8 h-8 rounded-lg bg-[#00288e]/10 text-[#00288e] flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </span>
                </div>

                {/* Offers / Decisions (Full width 5th tile) */}
                <div className="col-span-2 p-3 rounded-xl bg-white shadow-2xs border border-[#c4c5d5]/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#006a61] tracking-wider block">Offers & Decisions</span>
                    <span className="text-xl font-bold text-[#006a61]">{applications.filter(a => a.statusCategory === 'offers').length}</span>
                  </div>
                  <span className="w-8 h-8 rounded-lg bg-[#89f5e7]/40 text-[#006a61] flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </span>
                </div>
              </div>

              {/* Desktop KPI Strip (5 Columns) */}
              <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* KPI 1: Total Applied */}
                <div className="p-4 rounded-xl bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow border border-[#c4c5d5]/20">
                  <div className="flex items-center justify-between text-[#444653] mb-2">
                    <span className="text-[11px] uppercase font-semibold tracking-wider">Total Applied</span>
                    <span className="p-1.5 rounded-lg bg-[#eff4ff] text-[#00288e] flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </span>
                  </div>
                  <div>
                    <div className="text-3xl text-[#0b1c30] font-bold tracking-tight">
                      {applications.length}
                    </div>
                    <div className="text-[11px] text-[#444653] truncate mt-0.5">Total pipeline submissions</div>
                  </div>
                </div>

                {/* KPI 2: Under Review */}
                <div className="p-4 rounded-xl bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow border border-[#c4c5d5]/20">
                  <div className="flex items-center justify-between text-[#444653] mb-2">
                    <span className="text-[11px] uppercase font-semibold tracking-wider">Under Review</span>
                    <span className="p-1.5 rounded-lg bg-[#eff4ff] text-[#273548] flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </span>
                  </div>
                  <div>
                    <div className="text-3xl text-[#0b1c30] font-bold tracking-tight">
                      {applications.filter(a => a.statusCategory === 'review').length}
                    </div>
                    <div className="text-[11px] text-[#444653] truncate mt-0.5">Active recruiter screens</div>
                  </div>
                </div>

                {/* KPI 3: Shortlisted */}
                <div className="p-4 rounded-xl bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow border border-[#c4c5d5]/20">
                  <div className="flex items-center justify-between text-[#444653] mb-2">
                    <span className="text-[11px] uppercase font-semibold tracking-wider">Shortlisted</span>
                    <span className="p-1.5 rounded-lg bg-[#eff4ff] text-[#006a61] flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </span>
                  </div>
                  <div>
                    <div className="text-3xl text-[#0b1c30] font-bold tracking-tight">
                      {applications.filter(a => a.statusCategory === 'shortlisted').length}
                    </div>
                    <div className="text-[11px] text-[#444653] truncate mt-0.5">Advancing to tech round</div>
                  </div>
                </div>

                {/* KPI 4: Interviews */}
                <div className="p-4 rounded-xl bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow border border-[#c4c5d5]/20">
                  <div className="flex items-center justify-between text-[#444653] mb-2">
                    <span className="text-[11px] uppercase font-semibold tracking-wider">Interviews</span>
                    <span className="p-1.5 rounded-lg bg-[#00288e]/10 text-[#00288e] flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </span>
                  </div>
                  <div>
                    <div className="text-3xl text-[#00288e] font-bold tracking-tight">
                      {applications.filter(a => a.statusCategory === 'interview').length}
                    </div>
                    <div className="text-[11px] text-[#444653] truncate mt-0.5">
                      Scheduled discussions
                    </div>
                  </div>
                </div>

                {/* KPI 5: Offers / Decisions */}
                <div className="p-4 rounded-xl bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow border border-[#c4c5d5]/20">
                  <div className="flex items-center justify-between text-[#444653] mb-2">
                    <span className="text-[11px] uppercase font-semibold tracking-wider">Offers / Decisions</span>
                    <span className="p-1.5 rounded-lg bg-[#89f5e7]/40 text-[#006a61] flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </span>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl text-[#006a61] font-bold tracking-tight">
                        {applications.filter(a => a.statusCategory === 'offers').length}
                      </span>
                      <span className="text-xs text-[#006a61] font-semibold">Selected</span>
                    </div>
                    <div className="text-[11px] text-[#444653] truncate mt-0.5">
                      Pending offers
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── STATUS TABS AND SEARCH STRIP CONTAINER ── */}
            <div className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col gap-4 border border-[#c4c5d5]/20">

                {/* Stage Navigation Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
                  {[
                    { id: 'all', label: 'All', fullLabel: 'All Applications', count: applications.length },
                    { id: 'applied', label: 'Applied', fullLabel: 'Applied / Received', count: applications.filter(a => a.statusCategory === 'applied').length },
                    { id: 'review', label: 'Under Review', fullLabel: 'Under Review', count: applications.filter(a => a.statusCategory === 'review').length },
                    { id: 'shortlisted', label: 'Shortlisted', fullLabel: 'Shortlisted', count: applications.filter(a => a.statusCategory === 'shortlisted').length },
                    { id: 'interview', label: 'Interviews', fullLabel: 'Interview Scheduled', count: applications.filter(a => a.statusCategory === 'interview').length, highlight: 'interview' },
                    { id: 'offers', label: 'Offers', fullLabel: 'Selected / Offers', count: applications.filter(a => a.statusCategory === 'offers').length, highlight: 'offer' },
                    { id: 'archived', label: 'Archived', fullLabel: 'Archived / Rejected', count: applications.filter(a => a.statusCategory === 'archived').length }
                  ].map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`whitespace-nowrap px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-[#00288e] text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-[#0b1c30]'
                        }`}
                      >
                        <span className="xl:hidden">{tab.label}</span>
                        <span className="hidden xl:inline">{tab.fullLabel}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${
                            isActive
                              ? 'bg-white text-[#00288e]'
                              : tab.highlight === 'interview'
                              ? 'bg-[#00288e]/10 text-[#00288e]'
                              : tab.highlight === 'offer'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Filters & Dynamic Quick Search */}
                <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 pt-3 border-t border-slate-200/80">
                  {/* Search Bar - Clean, unified height and styling */}
                  <div className="relative flex-1">
                    <div className="relative flex items-center bg-white rounded-xl px-3.5 py-2 border border-slate-200/90 shadow-2xs focus-within:border-[#00288e] focus-within:ring-2 focus-within:ring-[#00288e]/15 transition-all h-[42px]">
                      <svg className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                      </svg>
                      <input
                        id="pipelineSearch"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by role, company name, or application ID..."
                        className="w-full bg-transparent border-none outline-none text-xs text-[#0b1c30] placeholder:text-slate-400 font-medium"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="text-slate-400 hover:text-slate-700 text-xs font-bold px-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Dropdowns Group - Symmetric Grid on tablet/mobile, inline flex on desktop */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 xl:flex xl:items-center gap-2.5">
                    {/* Filter: Company */}
                    <CustomDropdown
                      id="app-company-filter"
                      name="companyFilter"
                      value={companyFilter}
                      onChange={(e) => setCompanyFilter(e.target.value)}
                      options={[
                        { value: 'all', label: 'Company: All' },
                        ...Array.from(new Set(applications.map((a) => a.company).filter(Boolean))).map((company) => ({
                          value: company,
                          label: company,
                        })),
                      ]}
                      className="w-full xl:w-44"
                    />

                    {/* Filter: Work Mode */}
                    <CustomDropdown
                      id="app-workmode-filter"
                      name="workModeFilter"
                      value={workModeFilter}
                      onChange={(e) => setWorkModeFilter(e.target.value)}
                      options={[
                        { value: 'all', label: 'Work Mode: All' },
                        { value: 'Hybrid', label: 'Hybrid' },
                        { value: 'On-site', label: 'On-site' },
                        { value: 'Remote', label: 'Remote' },
                      ]}
                      className="w-full xl:w-36"
                    />

                    {/* Sort Dropdown */}
                    <CustomDropdown
                      id="app-sort-filter"
                      name="sortBy"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      options={[
                        { value: 'recent', label: 'Sort: Last Updated' },
                        { value: 'company', label: 'Sort: Company (A-Z)' },
                      ]}
                      className="w-full xl:w-44"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── APPLICATIONS STREAM / CARDS ── */}
            <div className="px-4 sm:px-6 space-y-3 sm:space-y-4">
              {applicationsLoading ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-sm font-semibold text-slate-600">Loading your applications…</div>
              ) : applicationsError ? (
                <div className="bg-rose-50 rounded-xl border border-rose-200 p-6 text-center text-sm font-semibold text-rose-700">{applicationsError}</div>
              ) : filteredApps.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center flex flex-col items-center gap-3 border border-[#c4c5d5]/20">
                  <div className="w-12 h-12 rounded-full bg-[#eff4ff] text-[#444653] flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-[#0b1c30]">No applications match your filter</h3>
                  <p className="text-xs text-[#444653] max-w-sm">
                    Try adjusting your status tab, company filter, or search keyword to see matching applications.
                  </p>
                  <button
                    onClick={() => { setActiveTab('all'); setSearchQuery(''); setCompanyFilter('all'); setWorkModeFilter('all'); }}
                    className="px-4 py-2 rounded-lg bg-[#1e40af] text-white text-xs font-semibold hover:bg-[#00288e] transition-colors mt-2"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                filteredApps.map((app) => (
                  <div
                    key={app.id}
                    className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-3.5 sm:p-4 lg:p-6 flex flex-col gap-3 sm:gap-4 group border border-[#c4c5d5]/20"
                  >
                    {/* ── Mobile Application Presentation (Storyboard 2 Screen 3 Reference) ── */}
                    <div
                      onClick={() => setSelectedApp(app)}
                      className="sm:hidden flex items-start gap-3 p-1 cursor-pointer"
                    >
                      {/* Left Company / Lock Avatar */}
                      <div className="w-11 h-11 rounded-xl bg-[#eff4ff] border border-blue-100 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs mt-0.5">
                        {app.is_confidential || app.role?.toLowerCase().includes('confidential') || app.company?.toLowerCase().includes('confidential') ? (
                          <div className="w-full h-full bg-[#00288e] flex items-center justify-center text-white">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          </div>
                        ) : app.logo ? (
                          <img
                            src={app.logo}
                            alt={app.company}
                            className="w-full h-full object-contain p-1"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.nextElementSibling) e.currentTarget.nextElementSibling.style.display = 'flex';
                            }}
                          />
                        ) : (
                          <span className="font-extrabold text-[#00288e] text-sm">
                            {(app.company || 'CO').slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Main Job & Application Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1.5">
                          <h3 className="text-sm font-bold text-[#0b1c30] group-hover:text-[#00288e] transition-colors leading-snug truncate">
                            {app.role}
                          </h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            app.statusCategory === 'applied' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                            app.statusCategory === 'review' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            app.statusCategory === 'shortlisted' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            app.statusCategory === 'interview' ? 'bg-blue-50 text-[#00288e] border border-blue-200' :
                            app.statusCategory === 'archived' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {app.status}
                          </span>
                        </div>

                        <p className="text-xs font-medium text-[#444653] truncate mt-0.5">
                          {app.company}
                        </p>

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                          <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><circle cx="12" cy="11" r="2" />
                          </svg>
                          <span className="truncate">{app.location}</span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 pt-1.5 border-t border-slate-100">
                          <span>{app.appliedDate}</span>
                          <span className="text-[#00288e] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                            View Details <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ── Desktop Application Presentation ── */}
                    <div className="hidden sm:flex flex-col gap-4">
                      {/* Top Requisition Overview */}
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          {/* Company Logo Badge */}
                          <div className="w-12 h-12 rounded-xl bg-white p-1 border border-slate-200/80 shadow-2xs shrink-0 flex items-center justify-center overflow-hidden">
                            {app.logo ? (
                              <img
                                src={app.logo}
                                alt={app.company}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  if (e.currentTarget.nextElementSibling) {
                                    e.currentTarget.nextElementSibling.style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            <span
                              className={`${app.logo ? 'hidden' : 'flex'} w-full h-full items-center justify-center font-extrabold text-[#00288e] text-base`}
                            >
                              {(app.company || 'CO').slice(0, 2).toUpperCase()}
                            </span>
                          </div>

                          {/* Title & Metadata */}
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-bold text-[#0b1c30] group-hover:text-[#00288e] transition-colors">
                                {app.role}
                              </h3>
                              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                {app.reqId}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-y-1 gap-x-2.5 text-xs text-slate-600 mt-1.5">
                              <span className="font-semibold text-slate-900 flex items-center gap-1">
                                {app.company}
                                {app.verified && (
                                  <svg className="w-3.5 h-3.5 text-[#006a61]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-600">
                                {app.location && app.location.includes(';')
                                  ? `${app.location.split(';')[0].trim()} (+${app.location.split(';').length - 1} more)`
                                  : app.location}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="font-semibold text-[#00288e]">{app.salary}</span>
                              <span className="text-slate-300">•</span>
                              <span className={app.statusCategory === 'applied' ? 'text-[#006a61] font-medium' : 'text-slate-500'}>
                                {app.appliedDate}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right Stage Badge */}
                        <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-1 shrink-0">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${app.statusBadgeBg} ${app.statusBadgeText} shadow-sm`}>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              {app.statusIcon === 'calendar_today' && <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />}
                              {app.statusIcon === 'check_circle' && <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3" />}
                              {app.statusIcon === 'visibility' && <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>}
                              {app.statusIcon === 'verified' && <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />}
                              {app.statusIcon === 'schedule' && <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>}
                            </svg>
                            <span>{app.status}</span>
                          </span>
                          <span className={`text-[11px] font-medium ${app.statusCategory === 'offers' || app.statusCategory === 'applied' ? 'text-[#006a61]' : 'text-[#444653]'}`}>
                            {app.stageProgress}
                          </span>
                        </div>
                      </div>

                      {/* Critical Stage Action Callout Strip */}
                      <div className={`rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 ${app.specialStripBg || 'bg-[#eff4ff]'}`}>
                        <div className="flex items-start md:items-center gap-2 text-[#0b1c30] text-xs">
                          <span className={`text-base shrink-0 mt-0.5 md:mt-0 ${app.nextStepIconColor || 'text-[#00288e]'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              {app.nextStepIcon === 'event_upcoming' && <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />}
                              {app.nextStepIcon === 'hourglass_top' && <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
                              {app.nextStepIcon === 'manage_search' && <circle cx="11" cy="11" r="8" />}
                              {app.nextStepIcon === 'military_tech' && <polygon points="12 2 15 8 22 9 17 14 18 21 12 17 6 21 7 14 2 9 9 8 12 2" />}
                              {app.nextStepIcon === 'assignment_ind' && <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />}
                            </svg>
                          </span>
                          <div>
                            <span className={`font-semibold ${app.nextStepIconColor || 'text-[#00288e]'}`}>{app.nextStepLabel}</span>
                            <span className="text-[#0b1c30] font-medium"> {app.nextStepTitle}</span>
                            <span className="text-[#444653] font-normal">{app.nextStepDetail}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {app.actions?.map((act, aIdx) => {
                            if (act.type === 'withdraw') {
                              return (
                                <button
                                  key={aIdx}
                                  type="button"
                                  onClick={() => setWithdrawModalApp(app)}
                                  className="h-8 px-3 rounded-lg text-[#444653] hover:bg-[#ffdad6] hover:text-[#ba1a1a] transition-colors text-xs font-medium"
                                >
                                  {act.label}
                                </button>
                              );
                            }
                            if (act.primary) {
                              return (
                                <button
                                  key={aIdx}
                                  type="button"
                                  onClick={() => setSelectedApp(app)}
                                  className="h-8 px-3 rounded-lg bg-[#1e40af] text-white hover:bg-[#00288e] transition-all shadow-sm text-xs font-semibold flex items-center gap-1.5"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    {act.icon === 'videocam' && <polygon points="23 7 16 12 23 17 23 7" />}
                                    {act.icon === 'article' && <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />}
                                  </svg>
                                  <span>{act.label}</span>
                                </button>
                              );
                            }
                            return (
                              <button
                                key={aIdx}
                                type="button"
                                onClick={() => setSelectedApp(app)}
                                className="h-8 px-3.5 rounded-lg bg-white border border-slate-200/90 text-slate-700 hover:text-[#00288e] hover:border-[#00288e] hover:bg-blue-50/40 transition-all text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                              >
                                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                                </svg>
                                <span>{act.label === 'View Application Details' ? 'View Details' : act.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ── BOTTOM RECOMMENDATION CARD & PAGINATION STRIP ── */}
            <div className="px-6 py-8 flex flex-col gap-4">
              {/* Honest Candidate Discovery Navigation CTA */}
              <div className="p-5 sm:p-6 rounded-xl bg-white shadow-2xs hover:shadow-xs transition-shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-200/80">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#eff4ff] text-[#00288e] flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0b1c30]">Looking for your next role?</h4>
                    <p className="text-xs text-[#444653] mt-0.5">
                      Explore available jobs and find opportunities that fit your interests.
                    </p>
                  </div>
                </div>

                <Link
                  to="/candidate/jobs"
                  className="h-9 px-4 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 shadow-2xs"
                >
                  <span>Explore Jobs</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>

              {/* Pagination & Meta */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[#444653] text-xs pt-1">
                <div>
                  Showing <span className="font-semibold text-[#0b1c30]">1–{filteredApps.length}</span> of <span className="font-semibold text-[#0b1c30]">{applications.length}</span> active enterprise applications
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled
                    className="h-8 w-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-[#444653] disabled:opacity-40 transition-colors border border-[#c4c5d5]/20"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-lg bg-[#1e40af] text-white font-bold flex items-center justify-center shadow-sm text-xs"
                  >
                    1
                  </button>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-[#444653] hover:text-[#0b1c30] hover:bg-[#eff4ff] transition-colors border border-[#c4c5d5]/20 text-xs font-medium"
                  >
                    2
                  </button>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-[#444653] hover:text-[#0b1c30] hover:bg-[#eff4ff] transition-colors border border-[#c4c5d5]/20"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

          </div>

      {/* ── APPLICATION DETAILS MODAL / DRAWER ── */}
      {selectedApp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#213145]/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setSelectedApp(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-details-title"
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-xl w-full flex flex-col max-h-[calc(100vh-1.5rem)] max-h-[calc(100dvh-1.5rem)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 p-6 pb-4 flex items-start justify-between border-b border-[#c4c5d5]/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white p-1 border border-slate-200/80 shadow-2xs flex items-center justify-center overflow-hidden shrink-0">
                  {selectedApp.logo ? (
                    <img
                      src={selectedApp.logo}
                      alt={selectedApp.company}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextElementSibling) {
                          e.currentTarget.nextElementSibling.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <span
                    className={`${selectedApp.logo ? 'hidden' : 'flex'} w-full h-full items-center justify-center font-extrabold text-[#00288e] text-sm`}
                  >
                    {(selectedApp.company || 'CO').slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 id="app-details-title" className="font-bold text-sm text-[#0b1c30]">{selectedApp.role}</h3>
                  <p className="text-xs text-[#444653]">{selectedApp.company} • {selectedApp.reqId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="text-[#444653] hover:text-[#0b1c30] p-1 rounded-lg"
                aria-label="Close dialog"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 text-xs text-[#0b1c30]">
              {/* Modal Vitals Grid */}
              <div className="grid grid-cols-2 gap-3 bg-[#eff4ff] p-3 rounded-xl text-xs">
                <div>
                  <span className="text-[10px] text-[#444653] uppercase font-semibold block">Location</span>
                  <span className="font-semibold text-[#0b1c30]">{selectedApp.location}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#444653] uppercase font-semibold block">Compensation</span>
                  <span className="font-semibold text-[#0b1c30]">{selectedApp.salary}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#444653] uppercase font-semibold block">Current Status</span>
                  <span className="font-semibold text-[#00288e]">{selectedApp.status}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#444653] uppercase font-semibold block">Applied Date</span>
                  <span className="font-semibold text-[#0b1c30]">{selectedApp.appliedDate}</span>
                </div>
              </div>

              {/* Next Step Guidance in Modal */}
              <div className="p-3.5 rounded-xl border border-[#c4c5d5]/30 flex flex-col gap-1.5">
                <span className="text-xs font-bold text-[#00288e] flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Next Step Breakdown
                </span>
                <p className="text-xs text-[#0b1c30] leading-relaxed">
                  <span className="font-semibold">{selectedApp.nextStepTitle}</span>
                  {selectedApp.nextStepDetail}
                </p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="shrink-0 px-6 py-3.5 bg-slate-50 border-t border-[#c4c5d5]/30 flex flex-wrap items-center justify-between gap-2">
              {selectedApp.jobId === 'rzp-staff-backend' ? (
                <Link
                  to={`/candidate/jobs/${selectedApp.jobId}/apply/success`}
                  className="text-xs font-semibold text-[#00288e] hover:underline flex items-center gap-1"
                >
                  <span>View Full Post-Submission Confirmation</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              ) : (
                <Link
                  to={`/candidate/jobs/${selectedApp.jobId}`}
                  className="text-xs font-semibold text-[#00288e] hover:underline flex items-center gap-1"
                >
                  <span>View Job Details</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              )}

              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="px-4 py-2 rounded-lg bg-[#00288e] text-white text-xs font-bold hover:bg-[#1e40af] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── WITHDRAW APPLICATION MODAL ── */}
      {withdrawModalApp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#213145]/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setWithdrawModalApp(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="withdraw-modal-title"
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 flex flex-col gap-4 max-h-[calc(100vh-1.5rem)] max-h-[calc(100dvh-1.5rem)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center mx-auto shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div className="text-center flex flex-col gap-1">
              <h3 id="withdraw-modal-title" className="text-base font-bold text-[#0b1c30]">Withdraw Application?</h3>
              <p className="text-xs text-[#444653] leading-relaxed">
                Are you sure you want to withdraw your candidacy for <span className="font-bold text-[#0b1c30]">{withdrawModalApp.role}</span> at <span className="font-bold text-[#0b1c30]">{withdrawModalApp.company}</span> ({withdrawModalApp.reqId})?
              </p>
              <p className="text-[11px] text-[#ba1a1a] mt-1 font-medium">
                This action cannot be undone. Your application will be withdrawn.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#c4c5d5]/30">
              <button
                type="button"
                onClick={() => setWithdrawModalApp(null)}
                className="px-4 py-2 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs font-semibold hover:bg-[#e5eeff] transition-colors"
              >
                Keep Application
              </button>
              <button
                type="button"
                onClick={handleConfirmWithdraw}
                className="px-4 py-2 rounded-lg bg-[#ba1a1a] text-white text-xs font-bold hover:bg-[#93000a] transition-colors shadow-sm"
              >
                Confirm Withdrawal
              </button>
            </div>
          </div>
        </div>
      )}
    </CandidatePortalShell>
  );
};

export default CandidateApplicationsPage;
