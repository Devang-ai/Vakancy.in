import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {  Link, useNavigate , useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Toast from '../../components/ui/Toast';
import EmployerFooter from '../../components/employer/EmployerFooter';
import { PageTransition, StaggerContainer, StaggerItem, FadeInSection } from '../../components/common/Motion';
import useModalA11y from '../../hooks/useModalA11y';

/**
 * Employer Jobs Management Page
 * Stitch Screen ID: f2d72c502a1c4486afbbd659c2ec6168
 */
export default function EmployerJobsPage() {
  const { user, profile, token, logout } = useAuth();
  const navigate = useNavigate();

  // State
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, drafts: 0, closed: 0, total_applicants: 0 });
  const [companyInfo, setCompanyInfo] = useState({
    name: profile?.company_name || user?.company_name || 'Employer Account',
    initials: 'EMP',
    logo_url: profile?.logo_url || user?.logo_url || ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const outletCtx = useOutletContext() || {};
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const searchQuery = typeof outletCtx.searchQuery === 'string' ? outletCtx.searchQuery : localSearchQuery;
  const setSearchQuery = typeof outletCtx.setSearchQuery === 'function' ? outletCtx.setSearchQuery : setLocalSearchQuery;
  const setSidebarOpen = outletCtx.setSidebarOpen || (() => {});
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Filters & Search
  const [activeTab, setActiveTab] = useState('all'); // all, active, draft, closed
  const [locationFilter, setLocationFilter] = useState('all');
  const [workModeFilter, setWorkModeFilter] = useState('all');

  // Job Details Modal
  const [selectedJob, setSelectedJob] = useState(null);
  const [togglingJobId, setTogglingJobId] = useState(null);

  useModalA11y(Boolean(selectedJob), () => setSelectedJob(null));

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

  // Fetch Jobs from backend with multi-tenant employer isolation
  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/employers/jobs', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setJobs(data.jobs || []);
        setStats(data.stats || { total: 0, active: 0, drafts: 0, closed: 0, total_applicants: 0 });
        if (data.employer) {
          const compName = data.employer.company_name || 'My Company';
          const initials = compName
            .split(' ')
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase() || '')
            .join('') || 'TC';
          setCompanyInfo({ name: compName, initials, logo_url: data.employer.logo_url || profile?.logo_url || '' });
        }
      } else {
        setError(data.message || 'Failed to load job requisitions.');
      }
    } catch (err) {
      console.error('Error loading jobs:', err);
      setError('Network error while loading job requisitions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [token]);

  // Toggle Job Status (Active <-> Inactive)
  const handleToggleStatus = async (job) => {
    setTogglingJobId(job.id);
    const targetStatus = job.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/employers/jobs/${job.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: targetStatus })
      });
      const data = await res.json();
      if (data.success && data.job) {
        // Update local jobs list
        setJobs((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, status: data.job.status } : j))
        );
        // Update stats
        setStats((prev) => {
          const wasActive = job.status === 'active';
          return {
            ...prev,
            active: wasActive ? Math.max(0, prev.active - 1) : prev.active + 1,
            closed: wasActive ? prev.closed + 1 : Math.max(0, prev.closed - 1)
          };
        });
        showToast(`Job "${job.title}" marked as ${data.job.status}.`);
      } else {
        showToast(data.message || 'Error updating job status.');
      }
    } catch (err) {
      console.error('Error toggling status:', err);
      showToast('Network error while updating job status.');
    } finally {
      setTogglingJobId(null);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (jobs.length === 0) {
      showToast('No jobs to export.');
      return;
    }
    const headers = ['ID', 'Title', 'Location', 'Status', 'Applicants', 'Shortlisted'];
    const rows = filteredJobs.map((j) => [
      j.id,
      `"${j.title.replace(/"/g, '""')}"`,
      `"${(j.location || '').replace(/"/g, '""')}"`,
      j.status,
      j.applicant_count || 0,
      j.shortlisted_count || 0
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Jobs_${companyInfo.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Job requisitions exported to CSV.');
  };

  // Filter jobs based on active tab, search query, location, and work mode
  const filteredJobs = jobs.filter((job) => {
    // Tab filter
    if (activeTab === 'active' && job.status !== 'active') return false;
    if (activeTab === 'closed' && job.status !== 'inactive' && job.status !== 'closed') return false;
    if (activeTab === 'draft' && job.status !== 'draft') return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = job.title?.toLowerCase().includes(q);
      const matchDesc = job.description?.toLowerCase().includes(q);
      const matchLoc = job.location?.toLowerCase().includes(q);
      const matchId = job.id?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchLoc && !matchId) return false;
    }

    // Location filter
    if (locationFilter !== 'all') {
      const loc = locationFilter.toLowerCase();
      if (!job.location || !job.location.toLowerCase().includes(loc)) return false;
    }

    // Work mode filter
    if (workModeFilter !== 'all') {
      const mode = workModeFilter.toLowerCase();
      const inLocation = job.location && job.location.toLowerCase().includes(mode);
      const inType = job.employment_type && job.employment_type.toLowerCase().includes(mode);
      if (!inLocation && !inType) return false;
    }

    return true;
  });

  const userName = user?.name || user?.email?.split('@')[0]?.replace('.', ' ') || 'Priya Sharma';
  const userDisplayName = userName
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <PageTransition
      className="w-full min-h-screen bg-[#f8fafc] font-sans text-[#0f172a] antialiased flex-1 flex flex-col"
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
          2. MAIN CONTENT AREA
      ───────────────────────────────────────────── */}
      
        {/* Top Header Bar */}
        

        {/* ─────────────────────────────────────────────
            COMMAND & BREADCRUMB STRIP
        ───────────────────────────────────────────── */}
        <div className="w-full bg-white px-4 sm:px-6 py-2.5 shadow-xs border-b border-slate-100">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2">
            <nav className="flex items-center gap-1.5 text-[#444653] text-[11px] font-semibold">
              <Link to="/recruiter" className="hover:text-[#00288e] transition-colors">
                Workspace
              </Link>
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <span>Talent Acquisition</span>
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-[#0b1c30]">Jobs &amp; Requisitions</span>
            </nav>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#444653]">
                {companyInfo.name}
              </span>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────
            HERO HEADER SECTION
        ───────────────────────────────────────────── */}
        <section className="w-full bg-[#f8f9ff] px-4 sm:px-6 pt-5 sm:pt-6 pb-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-[#0b1c30] tracking-tight">
                  Jobs &amp; Requisitions
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#86f2e4]/40 text-[#006f66] text-xs font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#006a61] animate-pulse" />
                  {stats.active} Active
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#dde1ff] text-[#173bab] text-xs font-semibold">
                  {companyInfo.logo_url && (
                    <img src={companyInfo.logo_url} alt="" className="w-3.5 h-3.5 rounded object-cover" />
                  )}
                  <span className="truncate max-w-[150px] sm:max-w-none">{companyInfo.name}</span>
                </span>
              </div>
              <p className="text-xs text-[#444653]">
                Manage your job postings, active requisitions, and applicant volume in real-time.
              </p>
            </div>

            {/* Action Button: Clean Post a Job without Export CSV or duplicate + */}
            <div className="flex items-center gap-2">
              <Link
                to="/recruiter/jobs/create"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00288e] text-white text-xs font-semibold shadow-xs hover:bg-[#1e40af] transition-colors cursor-pointer min-h-[42px]"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Post a Job</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────
            METRIC STRIP CARDS (4 Database KPI Cards)
        ───────────────────────────────────────────── */}
        <section className="w-full bg-[#f8fafc] px-4 sm:px-6 py-2">
          <StaggerContainer className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {/* Card 1: Active Jobs */}
            <StaggerItem index={0} className="bg-white p-3.5 sm:p-5 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <span className="text-[10px] sm:text-[11px] text-[#444653] uppercase tracking-wider font-semibold">
                  Active Jobs
                </span>
                <div className="p-1 sm:p-1.5 rounded-lg bg-[#eff4ff] text-[#00288e]">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                </div>
              </div>
              <div className="my-0.5 sm:my-1">
                <span className="text-2xl sm:text-3xl font-bold text-[#0b1c30] tracking-tight">{stats.active}</span>
              </div>
            </StaggerItem>

            {/* Card 2: Total Applicants */}
            <StaggerItem index={1} className="bg-white p-3.5 sm:p-5 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <span className="text-[10px] sm:text-[11px] text-[#444653] uppercase tracking-wider font-semibold">
                  Applicants
                </span>
                <div className="p-1 sm:p-1.5 rounded-lg bg-[#eff4ff] text-[#006a61]">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="my-0.5 sm:my-1">
                <span className="text-2xl sm:text-3xl font-bold text-[#0b1c30] tracking-tight">{stats.total_applicants}</span>
              </div>
            </StaggerItem>

            {/* Card 3: Inactive / Drafts */}
            <StaggerItem index={2} className="bg-white p-3.5 sm:p-5 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <span className="text-[10px] sm:text-[11px] text-[#444653] uppercase tracking-wider font-semibold">
                  Drafts
                </span>
                <div className="p-1 sm:p-1.5 rounded-lg bg-slate-100 text-slate-600">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
              </div>
              <div className="my-0.5 sm:my-1">
                <span className="text-2xl sm:text-3xl font-bold text-[#0b1c30] tracking-tight">{stats.drafts}</span>
              </div>
            </StaggerItem>

            {/* Card 4: Total Positions */}
            <StaggerItem index={3} className="bg-white p-3.5 sm:p-5 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <span className="text-[10px] sm:text-[11px] text-[#444653] uppercase tracking-wider font-semibold">
                  Total Jobs
                </span>
                <div className="p-1 sm:p-1.5 rounded-lg bg-[#eff4ff] text-[#00288e]">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <div className="my-0.5 sm:my-1">
                <span className="text-2xl sm:text-3xl font-bold text-[#0b1c30] tracking-tight">{stats.total}</span>
              </div>
            </StaggerItem>
          </StaggerContainer>
        </section>

        {/* ─────────────────────────────────────────────
            MAIN JOBS LEDGER TABLE PANEL
        ───────────────────────────────────────────── */}
        <FadeInSection className="w-full bg-[#f8fafc] px-4 sm:px-6 py-4 flex-1">
          <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col">
            {/* Status Tabs Strip */}
            <div className="px-4 pt-4 pb-0 flex items-center justify-between flex-wrap gap-2 border-b border-slate-100">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-[#00288e] text-white shadow-xs'
                      : 'text-[#444653] hover:bg-[#eff4ff] hover:text-[#0b1c30]'
                  }`}
                >
                  <span>All Requisitions</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#0b1c30]'
                  }`}>
                    {stats.total}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('active')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeTab === 'active'
                      ? 'bg-[#00288e] text-white shadow-xs'
                      : 'text-[#444653] hover:bg-[#eff4ff] hover:text-[#0b1c30]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#006a61]" />
                  <span>Active</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#0b1c30]'
                  }`}>
                    {stats.active}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('draft')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeTab === 'draft'
                      ? 'bg-[#00288e] text-white shadow-xs'
                      : 'text-[#444653] hover:bg-[#eff4ff] hover:text-[#0b1c30]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>Drafts</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === 'draft' ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#0b1c30]'
                  }`}>
                    {stats.drafts}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('closed')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeTab === 'closed'
                      ? 'bg-[#00288e] text-white shadow-xs'
                      : 'text-[#444653] hover:bg-[#eff4ff] hover:text-[#0b1c30]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Inactive / Closed</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === 'closed' ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#0b1c30]'
                  }`}>
                    {stats.closed}
                  </span>
                </button>
              </div>

              {/* Counter Indicator */}
              <div className="hidden sm:flex items-center gap-2 text-xs text-[#444653]">
                <span>Showing <strong className="text-[#0b1c30] font-semibold">{filteredJobs.length}</strong> of {jobs.length} jobs</span>
              </div>
            </div>

            {/* Omnibar Search & Filter Pickers */}
            <div className="p-4 bg-[#eff4ff]/60 border-b border-slate-100">
              <div className="flex flex-col lg:flex-row items-stretch gap-2.5">
                {/* Search input */}
                <div className="relative flex-1 min-w-0">
                  <svg className="w-4 h-4 text-[#444653] absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by job title, location, or stack..."
                    className="w-full pl-9 pr-9 py-2.5 sm:py-2 bg-white text-[#0b1c30] placeholder:text-[#444653] text-xs rounded-xl outline-none focus:ring-2 focus:ring-[#00288e] shadow-2xs transition-all border border-slate-200"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-sm font-bold"
                      aria-label="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Filters & Actions Row */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {/* Location Filter */}
                  <div className="relative flex-1 sm:flex-initial">
                    <select
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                      className="w-full sm:w-auto appearance-none pl-3 pr-8 py-2.5 sm:py-2 bg-white text-[#0b1c30] text-xs font-semibold rounded-xl shadow-2xs outline-none border border-slate-200 hover:border-slate-300 focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e] cursor-pointer transition-colors"
                    >
                      <option value="all">Location: All</option>
                      <option value="mumbai">Mumbai</option>
                      <option value="bengaluru">Bengaluru</option>
                      <option value="gurugram">Gurugram</option>
                      <option value="pune">Pune</option>
                      <option value="delhi">Delhi NCR</option>
                      <option value="remote">Remote</option>
                    </select>
                    <svg className="w-4 h-4 text-[#444653] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Work Mode Filter */}
                  <div className="relative flex-1 sm:flex-initial">
                    <select
                      value={workModeFilter}
                      onChange={(e) => setWorkModeFilter(e.target.value)}
                      className="w-full sm:w-auto appearance-none pl-3 pr-8 py-2.5 sm:py-2 bg-white text-[#0b1c30] text-xs font-semibold rounded-xl shadow-2xs outline-none border border-slate-200 hover:border-slate-300 focus:border-[#00288e] focus:ring-1 focus:ring-[#00288e] cursor-pointer transition-colors"
                    >
                      <option value="all">Work Mode: Any</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="remote">Full Remote</option>
                      <option value="onsite">On-site Mandatory</option>
                    </select>
                    <svg className="w-4 h-4 text-[#444653] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Clear Filter Button */}
                  {(searchQuery || locationFilter !== 'all' || workModeFilter !== 'all' || activeTab !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setLocationFilter('all');
                        setWorkModeFilter('all');
                        setActiveTab('all');
                      }}
                      className="w-full sm:w-auto px-3.5 py-2.5 sm:py-2 rounded-xl bg-white text-xs text-[#00288e] font-semibold border border-blue-100 hover:bg-[#eff4ff] transition-colors cursor-pointer shadow-2xs text-center"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Loading & Error States */}
            {loading ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-[#00288e] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-[#444653]">Loading job requisitions...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center space-y-3">
                <p className="text-xs text-[#ba1a1a] font-semibold">{error}</p>
                <button
                  onClick={fetchJobs}
                  className="px-4 py-1.5 rounded-xl bg-[#00288e] text-white text-xs font-semibold hover:bg-[#1e40af]"
                >
                  Retry
                </button>
              </div>
            ) : filteredJobs.length === 0 ? (
              /* Empty State */
              <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[#eff4ff] text-[#00288e] flex items-center justify-center">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-[#0b1c30]">No job requisitions found</h3>
                <p className="text-xs text-[#444653] max-w-sm">
                  {searchQuery || locationFilter !== 'all' || workModeFilter !== 'all' || activeTab !== 'all'
                    ? 'No jobs match your selected filter criteria. Try resetting filters.'
                    : 'You have not posted any job requisitions yet.'}
                </p>
                <Link
                  to="/recruiter/jobs/create"
                  className="px-4 py-2 rounded-xl bg-[#00288e] text-white text-xs font-semibold shadow-xs hover:bg-[#1e40af] transition-colors cursor-pointer mt-1 inline-flex items-center gap-1"
                >
                  + Post a Job
                </Link>
              </div>
            ) : (
              <>
                {/* Mobile Cards (Viewports < 768px) */}
                <div className="block md:hidden divide-y divide-slate-100">
                  {filteredJobs.map((job) => {
                    const isActive = job.status === 'active' || job.status === 'open';
                    const isDraft = job.status === 'draft';
                    const isToggling = togglingJobId === job.id;
                    const locs = (job.location || 'Not specified').split(';').map(s => s.trim()).filter(Boolean);

                    const isFixed = job.min_salary != null && job.max_salary != null && Number(job.min_salary) === Number(job.max_salary);
                    const basisText = job.salary_type && job.salary_type !== 'Fixed' ? ` (${job.salary_type})` : '';
                    const salText = job.min_salary != null && job.max_salary != null
                      ? (isFixed
                          ? `₹${Number(job.min_salary) >= 100000 ? (Number(job.min_salary) / 100000).toFixed(0) : job.min_salary} LPA${basisText}`
                          : `₹${Number(job.min_salary) >= 100000 ? (Number(job.min_salary) / 100000).toFixed(0) : job.min_salary} - ₹${Number(job.max_salary) >= 100000 ? (Number(job.max_salary) / 100000).toFixed(0) : job.max_salary} LPA${basisText}`
                        )
                      : 'Competitive';

                    return (
                      <div key={job.id} className="p-4 flex flex-col gap-3 bg-white">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-semibold text-[#444653] block truncate">{companyInfo.name}</span>
                            <h4 className="text-base font-bold text-[#0b1c30] line-clamp-1">{job.title}</h4>
                          </div>
                          {isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold shrink-0 border border-emerald-200/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                            </span>
                          ) : isDraft ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold shrink-0">
                              Draft
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold shrink-0 border border-amber-200/50">
                              Closed
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-y-1 gap-x-2 text-xs text-[#444653]">
                          <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {locs[0] || 'Flexible'}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span>{job.workplace_type || job.work_mode || 'Full-time'}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-0.5">
                          <span className="font-bold text-[#00288e]">{salText}</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#eff4ff] text-[#00288e] font-semibold text-[11px]">
                            {job.applicant_count || 0} applicants
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                          <Link
                            to={`/recruiter/jobs/${job.id}/applicants`}
                            className="min-h-[44px] px-3 py-2 rounded-xl border border-blue-100 bg-[#eff4ff] text-[#00288e] text-xs font-bold hover:bg-[#dce9ff] transition-all flex items-center justify-center gap-1 shadow-2xs text-center"
                          >
                            <span>View Applicants</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => setSelectedJob(job)}
                            className="min-h-[44px] px-3 py-2 rounded-xl bg-[#00288e] text-white text-xs font-bold hover:bg-[#1e40af] transition-all flex items-center justify-center gap-1 shadow-xs text-center"
                          >
                            <span>View Details</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* High-Density Enterprise Table (Desktop & Tablet) */}
                <div className="hidden md:block w-full overflow-x-auto">
                <table className="w-full text-left text-xs text-[#0b1c30] border-collapse min-w-[960px]">
                  <thead>
                    <tr className="bg-[#eff4ff] text-[#444653] uppercase text-[11px] font-semibold tracking-wider h-10 border-b border-slate-200">
                      <th className="py-2.5 px-4 w-32">Job ID</th>
                      <th className="py-2.5 px-4 min-w-[280px]">Role &amp; Details</th>
                      <th className="py-2.5 px-4 w-48">Location &amp; Work Mode</th>
                      <th className="py-2.5 px-4 w-44">Applicant Volume</th>
                      <th className="py-2.5 px-4 w-32 text-center">Status</th>
                      <th className="py-2.5 px-4 w-44 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredJobs.map((job) => {
                      const isActive = job.status === 'active' || job.status === 'open';
                      const isDraft = job.status === 'draft';
                      const isToggling = togglingJobId === job.id;

                      return (
                        <tr
                          key={job.id}
                          className="bg-white hover:bg-[#eff4ff]/40 transition-colors group"
                        >
                          {/* 1. Job ID */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-mono font-bold text-[#00288e] text-xs">
                                #{job.id.substring(0, 10)}
                              </span>
                              <span className="text-[10px] text-[#444653]">
                                {companyInfo.name}
                              </span>
                            </div>
                          </td>

                          {/* 2. Role & Details */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setSelectedJob(job)}
                                  className="text-sm font-bold text-[#0b1c30] hover:text-[#00288e] transition-colors text-left line-clamp-1 cursor-pointer"
                                >
                                  {job.title}
                                </button>
                                {isActive && (
                                  <svg className="w-4 h-4 text-[#006a61] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <p className="text-[11px] text-[#444653] line-clamp-1 max-w-md">
                                {job.description || 'Full-stack engineering requisition'}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className="px-2 py-0.5 rounded bg-[#eff4ff] text-[#0b1c30] font-mono text-[10px] font-medium border border-blue-50">
                                  {job.employment_type || 'Full-time'}
                                </span>
                                {job.min_salary && job.max_salary && (
                                  <span className="px-2 py-0.5 rounded bg-[#eff4ff] text-[#006a61] font-mono text-[10px] font-bold border border-blue-50">
                                    {Number(job.min_salary) === Number(job.max_salary)
                                      ? `₹${Math.round(job.min_salary / 100000)}L${job.salary_type && job.salary_type !== 'Fixed' ? ` (${job.salary_type})` : ''}`
                                      : `₹${Math.round(job.min_salary / 100000)}L - ₹${Math.round(job.max_salary / 100000)}L${job.salary_type && job.salary_type !== 'Fixed' ? ` (${job.salary_type})` : ''}`
                                    }
                                  </span>
                                )}
                                <span
                                  id={`badge-candidate-access-${job.id}`}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    (job.allow_candidate_access === 1 || job.allow_candidate_access === true)
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : 'bg-amber-50 text-amber-800 border-amber-200'
                                  }`}
                                  title={(job.allow_candidate_access === 1 || job.allow_candidate_access === true) ? 'Candidate Access ON: Direct Viewing' : 'Candidate Access OFF: Locked with Callback Gate'}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${(job.allow_candidate_access === 1 || job.allow_candidate_access === true) ? 'bg-emerald-600' : 'bg-amber-600'}`} />
                                  Candidate Access {(job.allow_candidate_access === 1 || job.allow_candidate_access === true) ? 'ON' : 'OFF'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 3. Location & Mode */}
                          <td className="py-3.5 px-4">
                            {(() => {
                              const locs = (job.location || 'Not specified')
                                .split(';')
                                .map((s) => s.trim())
                                .filter(Boolean);
                              return (
                                <div className="flex flex-col gap-1.5 max-w-xs">
                                  {locs.map((loc, idx) => (
                                    <div key={idx} className="flex items-start gap-1.5">
                                      <svg className="w-3.5 h-3.5 text-[#00288e] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                      <span className="text-xs font-semibold text-[#0b1c30] leading-snug">{loc}</span>
                                    </div>
                                  ))}
                                  {(job.workplace_type || job.work_mode) && (
                                    <div className="pt-0.5">
                                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-[#eff4ff] text-[#00288e] border border-blue-50">
                                        {job.workplace_type || job.work_mode}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </td>

                          {/* 4. Applicant Volume */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[#0b1c30] font-mono">
                                  {job.applicant_count || 0} Applicants
                                </span>
                                {job.new_applicants_count > 0 && (
                                  <span className="px-1.5 py-0.2 rounded bg-[#dde1ff] text-[#173bab] font-bold text-[10px]">
                                    +{job.new_applicants_count} New
                                  </span>
                                )}
                              </div>
                              <div className="w-full bg-[#eff4ff] h-1.5 rounded-full overflow-hidden flex">
                                <div
                                  className="bg-[#00288e] h-full"
                                  style={{ width: `${Math.min(100, Math.max(15, (job.applicant_count || 0) * 10))}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-[#444653]">
                                {job.shortlisted_count || 0} shortlisted
                              </span>
                            </div>
                          </td>

                          {/* 5. Status Badge */}
                          <td className="py-3.5 px-4 text-center">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#86f2e4]/30 text-[#006f66] text-xs font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#006a61]" />
                                Active
                              </span>
                            ) : isDraft ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                Draft
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Inactive
                              </span>
                            )}
                          </td>

                          {/* 6. Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Quick View Button */}
                              <button
                                onClick={() => setSelectedJob(job)}
                                title="View Job Description"
                                className="p-1.5 rounded-lg bg-[#eff4ff] text-[#00288e] hover:bg-[#dce9ff] transition-colors cursor-pointer"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>

                              {/* Edit Job Action */}
                              <Link
                                to={`/recruiter/jobs/${job.id}/edit`}
                                title="Edit Job Requisition"
                                className="p-1.5 rounded-lg bg-[#eff4ff] text-[#00288e] hover:bg-[#dce9ff] transition-colors cursor-pointer inline-flex items-center justify-center"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </Link>

                              {/* Toggle Active/Inactive Button */}
                              <button
                                onClick={() => handleToggleStatus(job)}
                                disabled={isToggling}
                                title={isActive ? 'Deactivate job' : 'Activate job'}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                                  isActive
                                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                    : 'bg-[#eff4ff] text-[#00288e] hover:bg-[#dce9ff] border border-blue-200'
                                }`}
                              >
                                {isToggling ? '...' : isActive ? 'Deactivate' : 'Activate'}
                              </button>

                              {/* Review Applicants CTA */}
                              <Link
                                id={`btn-review-applicants-${job.id}`}
                                to={`/recruiter/jobs/${job.id}/applicants`}
                                title="Review Applicants"
                                className="p-1.5 rounded-lg bg-[#00288e] text-white hover:bg-[#1e40af] transition-colors cursor-pointer"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
          </div>
        </FadeInSection>

        {/* ─────────────────────────────────────────────
            FOOTER
        ───────────────────────────────────────────── */}
        <EmployerFooter />

      {/* ─────────────────────────────────────────────
          3. JOB DETAILS MODAL
      ───────────────────────────────────────────── */}
      {selectedJob && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-[#0b1c30]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setSelectedJob(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="job-details-modal-title"
        >
          <div
            className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[calc(100vh-1.5rem)] max-h-[calc(100dvh-1.5rem)] overflow-hidden animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="shrink-0 px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-[#eff4ff]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#00288e]">
                  Requisition Details
                </span>
                <h3 id="job-details-modal-title" className="font-bold text-base text-[#0b1c30]">
                  {selectedJob.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="p-1.5 rounded-lg text-[#444653] hover:bg-slate-200 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 min-h-0 p-6 space-y-4 overflow-y-auto text-xs text-[#0b1c30]">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#eff4ff]">
                <div>
                  <span className="text-[10px] text-[#444653] uppercase font-semibold">Location</span>
                  <p className="font-bold text-xs mt-0.5">{selectedJob.location || 'India'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-[#444653] uppercase font-semibold">Status</span>
                  <p className="font-bold text-xs mt-0.5 uppercase text-[#006a61]">{selectedJob.status}</p>
                </div>
                <div>
                  <span className="text-[10px] text-[#444653] uppercase font-semibold">Applicants</span>
                  <p className="font-bold text-xs mt-0.5">{selectedJob.applicant_count || 0} candidate(s)</p>
                </div>
                <div>
                  <span className="text-[10px] text-[#444653] uppercase font-semibold">Type</span>
                  <p className="font-bold text-xs mt-0.5">{selectedJob.employment_type || 'Full-time'}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-xs text-[#0b1c30] uppercase mb-1">
                  Job Description &amp; Scope
                </h4>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 leading-relaxed whitespace-pre-line text-xs">
                  {selectedJob.description || 'No description provided.'}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="shrink-0 px-6 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  handleToggleStatus(selectedJob);
                  setSelectedJob(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  selectedJob.status === 'active'
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    : 'bg-[#eff4ff] text-[#00288e] hover:bg-[#dce9ff]'
                }`}
              >
                {selectedJob.status === 'active' ? 'Mark as Inactive' : 'Mark as Active'}
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/recruiter/jobs/${selectedJob.id}/applicants`}
                  className="px-4 py-2 rounded-xl bg-[#eff4ff] text-[#00288e] text-xs font-semibold hover:bg-[#dce9ff] transition-colors inline-flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>View Applicants</span>
                </Link>

                <Link
                  to={`/recruiter/jobs/${selectedJob.id}/edit`}
                  className="px-4 py-2 rounded-xl bg-[#00288e] text-white text-xs font-semibold hover:bg-[#1e40af] transition-colors inline-flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit Job</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setSelectedJob(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-[#0b1c30] text-xs font-semibold hover:bg-slate-300 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </PageTransition>
  );
}
