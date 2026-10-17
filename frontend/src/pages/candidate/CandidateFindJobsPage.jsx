import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import CandidatePortalShell from '../../components/candidate/CandidatePortalShell';
import Toast from '../../components/common/Toast';

/**
 * CandidateFindJobsPage
 * Route: /candidate/jobs
 * Authoritative candidate job discovery connected directly to MySQL database.
 * Rendered seamlessly inside the Universal CandidatePortalShell.
 */

/* ─────────────────────────────────────────────
   DYNAMIC FILTER SIDEBAR
───────────────────────────────────────────── */
const FilterSidebar = ({
  selectedWorkModes,
  onToggleWorkMode,
  selectedExp,
  onToggleExp,
  selectedCtc,
  onToggleCtc,
  verifiedOnly,
  onToggleVerified,
  activeFilterCount,
  onClearAll,
}) => {
  const workModeOptions = [
    { label: 'Hybrid Workplace', key: 'Hybrid' },
    { label: 'Remote Friendly', key: 'Remote' },
    { label: 'On-site Office', key: 'On-site' },
  ];

  const experienceOptions = [
    { label: 'Fresher / Entry (0-2 Yrs)', key: '0-2' },
    { label: 'Mid-Level (3-5 Yrs)', key: '3-5' },
    { label: 'Senior (6-9 Yrs)', key: '6-9' },
    { label: 'Leadership / Staff (10+ Yrs)', key: '10+' },
  ];

  const ctcOptions = [
    { label: 'Up to ₹5L LPA', key: '<5' },
    { label: '₹6L – ₹10L LPA', key: '6-10' },
    { label: '₹10L – ₹15L LPA', key: '10-15' },
    { label: '₹15L – ₹25L LPA', key: '15-25' },
    { label: '₹25L+ Executive', key: '25-50' },
  ];

  return (
    <aside className="lg:col-span-4 flex flex-col gap-4">
      <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200/80 space-y-5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#00288e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="12" y2="18"/>
            </svg>
            <h2 className="text-sm font-bold text-[#0b1c30]">Filter Requisitions</h2>
          </div>
          {activeFilterCount > 0 && (
            <button
              id="btn-clear-all-filters"
              type="button"
              onClick={onClearAll}
              className="text-xs text-[#00288e] hover:text-[#1e40af] font-bold transition-colors cursor-pointer"
            >
              Clear All ({activeFilterCount})
            </button>
          )}
        </div>

        {/* Work Arrangement */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#444653] block">Workplace Arrangement</span>
          <div className="space-y-1">
            {workModeOptions.map((m) => {
              const isChecked = selectedWorkModes.includes(m.key);
              return (
                <label
                  key={m.key}
                  className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors ${
                    isChecked ? 'bg-[#eff4ff]' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleWorkMode(m.key)}
                      className="w-4 h-4 rounded text-[#00288e] accent-[#00288e] cursor-pointer"
                    />
                    <span className={`text-xs ${isChecked ? 'font-bold text-[#00288e]' : 'text-slate-700 font-medium'}`}>
                      {m.label}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Experience Level */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#444653] block">Experience Bracket</span>
          <div className="space-y-1">
            {experienceOptions.map((e) => {
              const isChecked = selectedExp.includes(e.key);
              return (
                <label
                  key={e.key}
                  className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors ${
                    isChecked ? 'bg-[#eff4ff]' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleExp(e.key)}
                      className="w-4 h-4 rounded text-[#00288e] accent-[#00288e] cursor-pointer"
                    />
                    <span className={`text-xs ${isChecked ? 'font-bold text-[#00288e]' : 'text-slate-700 font-medium'}`}>
                      {e.label}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Annual CTC Range */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#444653] block">Annual CTC (Salary)</span>
          <div className="space-y-1">
            {ctcOptions.map((c) => {
              const isChecked = selectedCtc.includes(c.key);
              return (
                <label
                  key={c.key}
                  className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors ${
                    isChecked ? 'bg-[#eff4ff]' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleCtc(c.key)}
                      className="w-4 h-4 rounded text-[#00288e] accent-[#00288e] cursor-pointer"
                    />
                    <span className={`text-xs ${isChecked ? 'font-bold text-[#00288e]' : 'text-slate-700 font-medium'}`}>
                      {c.label}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* 100% Verified Only Toggle */}
        <div className="pt-2 border-t border-slate-100">
          <label className="flex items-center justify-between p-2.5 bg-[#eff4ff] rounded-lg cursor-pointer hover:bg-[#e5eeff] transition-colors">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#006a61]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#0b1c30]">Verified Employers Only</span>
                <span className="text-[10px] text-[#444653]">Direct enterprise recruiters</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={onToggleVerified}
              className="w-4 h-4 rounded text-[#006a61] accent-[#006a61] cursor-pointer"
            />
          </label>
        </div>
      </div>
    </aside>
  );
};

/* ─────────────────────────────────────────────
   REAL JOB CARD
───────────────────────────────────────────── */
const JobCard = ({ job, saved, onSave }) => {
  const companyName = job.company || job.company_name || 'Vakancy Employer';
  const initials = companyName.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'VK';
  const skills = Array.isArray(job.skills) ? job.skills : [];

  return (
    <article className="bg-white p-5 rounded-xl shadow-xs border border-slate-200/80 hover:shadow-md hover:border-slate-300 transition-all duration-200 relative group">
      <div className="flex flex-col gap-3.5">
        {/* Upper Row: Logo + Title + Details */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            {/* Company Logo or Monogram */}
            {job.companyLogo ? (
              <img
                src={job.companyLogo}
                alt={companyName}
                className="w-12 h-12 rounded-lg object-contain bg-white p-1 border border-slate-200/80 shrink-0 shadow-xs"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-[#e5eeff] flex items-center justify-center shrink-0 font-bold text-[#00288e] text-sm border border-blue-100 shadow-xs">
                {initials}
              </div>
            )}

            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-800">{companyName}</span>
                {job.department && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-[11px] text-[#444653] font-medium">{job.department}</span>
                  </>
                )}
                {(job.is_recommended || job.recommendation_badge || job.created_by_type === 'INTERNAL_STAFF') && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#1E40AF] border border-blue-200">
                    ★ Vakancy.in Recommended
                  </span>
                )}
              </div>

              <Link
                to={`/candidate/jobs/${job.id}`}
                className="text-base font-bold text-[#0b1c30] group-hover:text-[#00288e] transition-colors block line-clamp-1"
              >
                {job.title}
              </Link>

              {/* Vitals Strip */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#444653] pt-0.5">
                <span className="flex items-center gap-1 font-medium text-slate-800">
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  {job.location}
                </span>
                <span className="flex items-center gap-1 font-medium text-slate-800">
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                  </svg>
                  {job.experience || 'Experience Not specified'}
                </span>
                <span className="flex items-center gap-1 font-bold text-[#00288e]">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <circle cx="12" cy="12" r="2" />
                    <path d="M6 12h.01M18 12h.01" />
                  </svg>
                  {job.salaryRange || 'Competitive'}
                </span>
                {job.workMode && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#eff4ff] text-[#00288e]">
                    {job.workMode}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="shrink-0 flex flex-col items-end">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
              Active Opening
            </span>
          </div>
        </div>

        {/* Job Snippet / Description Preview */}
        {job.snippet && (
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {job.snippet}
          </p>
        )}

        {/* Skills Pills */}
        {skills.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {skills.map((s, idx) => (
              <span
                key={idx}
                className="px-2 py-1 rounded-md text-[11px] font-semibold bg-[#eff4ff] text-[#00288e] border border-blue-100/60"
              >
                {typeof s === 'string' ? s : s.label || s.name}
              </span>
            ))}
          </div>
        )}

        <div className="w-full h-px bg-slate-100" />

        {/* Card Footer: Metadata + Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5">
          <div className="flex items-center gap-3 text-[#444653] text-xs">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {job.postedAgo || 'Recently'}
            </span>
            <span>•</span>
            <span className="font-semibold text-slate-700">{job.vacancies || '1 Opening'}</span>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {/* Bookmark */}
            <button
              type="button"
              title={saved ? 'Remove Bookmark' : 'Save Job'}
              onClick={() => onSave(job.id)}
              className={`p-2 rounded-lg transition-colors border ${
                saved
                  ? 'text-[#00288e] bg-[#eff4ff] border-blue-200'
                  : 'text-[#444653] hover:text-[#00288e] hover:bg-[#eff4ff] border-slate-200'
              }`}
            >
              {saved ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                </svg>
              )}
            </button>

            {/* View & Apply CTA */}
            <Link
              to={`/candidate/jobs/${job.id}`}
              className="px-4 py-2 bg-[#00288e] hover:bg-[#1e40af] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-[0.98]"
            >
              <span>View &amp; Apply</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
};

/* ─────────────────────────────────────────────
   MAIN PAGE COMPONENT
───────────────────────────────────────────── */
const CandidateFindJobsPage = () => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  // Search & Filter State (Real dynamic states, no hardcoded search defaults)
  const [searchQuery, setSearchQuery] = useState('');
  const [locationMode, setLocationMode] = useState('');
  const [experienceTier, setExperienceTier] = useState('');
  const [selectedWorkModes, setSelectedWorkModes] = useState([]);
  const [selectedExp, setSelectedExp] = useState([]);
  const [selectedCtc, setSelectedCtc] = useState([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [activeQuickView, setActiveQuickView] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  // Real Database Data States
  const [jobs, setJobs] = useState([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [savedJobIds, setSavedJobIds] = useState(new Set());
  const [toast, setToast] = useState(null);

  const fetchSavedJobIds = useCallback(async () => {
    try {
      const res = await API.get('/candidates/me/saved-jobs');
      if (res?.success && Array.isArray(res.savedJobs)) {
        const ids = new Set(res.savedJobs.map(j => String(j.jobId || j.id)));
        setSavedJobIds(ids);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchSavedJobIds();
  }, [fetchSavedJobIds]);

  // Fetch Jobs from authoritative backend API
  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        status: 'open',
      };

      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (locationMode.trim()) params.location = locationMode.trim();
      if (experienceTier) params.experience = experienceTier;
      if (selectedExp.length > 0) params.experience = selectedExp.join(',');
      if (selectedWorkModes.length > 0) params.workMode = selectedWorkModes.join(',');
      if (selectedCtc.length > 0) params.ctcRange = selectedCtc.join(',');
      if (sortOrder) params.sortBy = sortOrder;

      // Handle Quick Views
      if (activeQuickView === 'remote') {
        params.workMode = 'Remote';
      } else if (activeQuickView === 'hybrid') {
        params.workMode = 'Hybrid';
      } else if (activeQuickView === 'high_ctc') {
        params.ctcRange = '25-50,50+';
      } else if (activeQuickView === 'recent') {
        params.sortBy = 'newest';
      }

      const res = await API.get('/jobs', { params });
      if (res.success && Array.isArray(res.jobs)) {
        let resultList = res.jobs;
        if (verifiedOnly) {
          resultList = resultList.filter((j) => j.verified || j.company_name);
        }
        setJobs(resultList);
        setTotalJobs(res.total !== undefined ? res.total : resultList.length);
      } else {
        setJobs([]);
        setTotalJobs(0);
      }
    } catch (err) {
      console.warn('Error fetching jobs for candidate:', err);
      setJobs([]);
      setTotalJobs(0);
    } finally {
      setIsLoading(false);
    }
  }, [
    searchQuery,
    locationMode,
    experienceTier,
    selectedWorkModes,
    selectedExp,
    selectedCtc,
    verifiedOnly,
    activeQuickView,
    sortOrder,
  ]);

  useEffect(() => {
    fetchJobs();
    return () => {
          };
  }, [fetchJobs]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    fetchJobs();
  };

  const handleToggleWorkMode = (key) => {
    setSelectedWorkModes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleToggleExp = (key) => {
    setSelectedExp((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleToggleCtc = (key) => {
    setSelectedCtc((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleClearAll = () => {
    setSearchQuery('');
    setLocationMode('');
    setExperienceTier('');
    setSelectedWorkModes([]);
    setSelectedExp([]);
    setSelectedCtc([]);
    setVerifiedOnly(false);
    setActiveQuickView('all');
    setSortOrder('newest');
  };

  const handleSave = async (jobId) => {
    const isSaved = savedJobIds.has(String(jobId));
    try {
      if (isSaved) {
        const res = await API.delete(`/candidates/me/saved-jobs/${jobId}`);
        if (res?.success) {
          setSavedJobIds((prev) => {
            const next = new Set(prev);
            next.delete(String(jobId));
            return next;
          });
          setToast({
            type: 'info',
            title: 'Job Removed',
            description: 'Opportunity removed from your Saved Jobs.'
          });
          window.dispatchEvent(new Event('vakancy:candidate-counts-update'));
        }
      } else {
        const res = await API.post('/candidates/me/saved-jobs', { job_id: jobId });
        if (res?.success) {
          setSavedJobIds((prev) => {
            const next = new Set(prev);
            next.add(String(jobId));
            return next;
          });
          setToast({
            type: 'success',
            title: 'Job Saved',
            description: 'Requisition bookmarked to your Saved Jobs pipeline.'
          });
          window.dispatchEvent(new Event('vakancy:candidate-counts-update'));
        }
      }
    } catch (err) {
      setToast({
        type: 'error',
        title: 'Save Failed',
        description: err.response?.data?.message || 'Failed to update saved jobs.'
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Active filter computation for chips
  const activeChips = [];
  if (searchQuery.trim()) activeChips.push({ label: `Role/Skill: "${searchQuery}"`, onRemove: () => setSearchQuery('') });
  if (locationMode.trim()) activeChips.push({ label: `Location: "${locationMode}"`, onRemove: () => setLocationMode('') });
  if (experienceTier) activeChips.push({ label: `Exp: ${experienceTier}`, onRemove: () => setExperienceTier('') });
  selectedWorkModes.forEach((wm) => activeChips.push({ label: `Mode: ${wm}`, onRemove: () => handleToggleWorkMode(wm) }));
  selectedExp.forEach((e) => activeChips.push({ label: `Exp Bracket: ${e}`, onRemove: () => handleToggleExp(e) }));
  selectedCtc.forEach((c) => activeChips.push({ label: `CTC: ${c}`, onRemove: () => handleToggleCtc(c) }));
  if (verifiedOnly) activeChips.push({ label: '100% Verified Only', onRemove: () => setVerifiedOnly(false) });

  const displayName = profile?.name || user?.name || user?.email?.split('@')[0] || 'Candidate';
  const firstName = displayName.split(' ')[0];

  const quickViews = [
    { key: 'all', label: 'All Openings', icon: null },
    { key: 'recent', label: 'Recently Posted', icon: 'bolt' },
    { key: 'remote', label: 'Remote Friendly', icon: null },
    { key: 'hybrid', label: 'Hybrid Workplace', icon: null },
    { key: 'high_ctc', label: 'High CTC', icon: 'payments' },
  ];

  return (
    <CandidatePortalShell>
      <div className="flex flex-col w-full">

            {/* ══════════════════════════════════════
                HERO: Search & Discovery Bar
            ══════════════════════════════════════ */}
            <section className="w-full bg-white px-6 py-8 shadow-xs border-b border-slate-100">
              <div className="max-w-[80rem] mx-auto flex flex-col gap-6">

                {/* Headline */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="space-y-1 max-w-3xl">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] tracking-tight">
                      Find Open Positions, {firstName}
                    </h1>
                    <p className="text-xs sm:text-sm text-[#444653] leading-relaxed">
                      Browse and apply directly to live requisitions published by verified employers on Vakancy.in.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
                    <span className="text-[11px] text-[#444653] font-medium">Requisition Status:</span>
                    <span className="text-[11px] font-bold text-[#006a61] flex items-center gap-1.5 bg-teal-50 px-2 py-1 rounded-full border border-teal-100">
                      <span className="w-2 h-2 rounded-full bg-[#006a61] animate-pulse" />
                      Live in Market
                    </span>
                  </div>
                </div>

                {/* Interactive Multi-segment Search Bar */}
                <form onSubmit={handleSearchSubmit} className="w-full bg-[#eff4ff] p-1.5 rounded-xl shadow-xs border border-blue-100/70">
                  <div className="flex flex-col lg:flex-row items-stretch gap-1 bg-white rounded-lg p-1">
                    {/* Job Title / Skill */}
                    <div className="flex-1 flex items-center px-3 py-2 gap-2.5">
                      <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                      </svg>
                      <div className="flex flex-col flex-1 min-w-0">
                        <label htmlFor="search-input" className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                          Job Title / Skill / Keyword
                        </label>
                        <input
                          id="search-input"
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="e.g. iOS Developer, React Native, Node.js, Sales..."
                          className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-[#0b1c30] font-semibold placeholder:text-slate-400 placeholder:font-normal"
                        />
                      </div>
                    </div>

                    <div className="hidden lg:block w-px bg-slate-200 my-2" />

                    {/* Location */}
                    <div className="w-full lg:w-64 flex items-center px-3 py-2 gap-2.5">
                      <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      <div className="flex flex-col flex-1 min-w-0">
                        <label htmlFor="location-input" className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                          City / State / Location
                        </label>
                        <input
                          id="location-input"
                          type="text"
                          value={locationMode}
                          onChange={(e) => setLocationMode(e.target.value)}
                          placeholder="e.g. Ahmedabad, Patna, Bengaluru..."
                          className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-[#0b1c30] font-semibold placeholder:text-slate-400 placeholder:font-normal"
                        />
                      </div>
                    </div>

                    <div className="hidden lg:block w-px bg-slate-200 my-2" />

                    {/* Experience Tier */}
                    <div className="w-full lg:w-52 flex items-center px-3 py-2 gap-2.5">
                      <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
                      </svg>
                      <div className="flex flex-col flex-1 min-w-0">
                        <label htmlFor="exp-select" className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                          Experience Tier
                        </label>
                        <div className="relative">
                          <select
                            id="exp-select"
                            value={experienceTier}
                            onChange={(e) => setExperienceTier(e.target.value)}
                            className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-[#0b1c30] font-semibold cursor-pointer appearance-none pr-4"
                          >
                            <option value="">Any Experience</option>
                            <option value="0-2">Fresher (0 - 2 Yrs)</option>
                            <option value="3-5">Mid-Level (3 - 5 Yrs)</option>
                            <option value="6-9">Senior (6 - 9 Yrs)</option>
                            <option value="10+">Leadership (10+ Yrs)</option>
                          </select>
                          <svg className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path d="m6 9 6 6 6-6"/>
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Search CTA */}
                    <button
                      id="btn-search-jobs"
                      type="submit"
                      className="w-full lg:w-auto px-6 py-2.5 bg-[#00288e] hover:bg-[#1e40af] text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                      </svg>
                      Search
                    </button>
                  </div>
                </form>

                {/* Quick Views Pill Row */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#444653] mr-1">Quick Views:</span>
                  {quickViews.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      id={`quick-view-${v.key}`}
                      onClick={() => setActiveQuickView(v.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                        activeQuickView === v.key
                          ? 'bg-[#00288e] text-white'
                          : 'bg-[#eff4ff] hover:bg-[#e5eeff] text-[#444653] hover:text-[#0b1c30]'
                      }`}
                    >
                      {v.icon === 'bolt' && (
                        <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                        </svg>
                      )}
                      {v.icon === 'payments' && (
                        <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        </svg>
                      )}
                      <span>{v.label}</span>
                    </button>
                  ))}
                </div>

                {/* Active Filter Chips */}
                {activeChips.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Filters:</span>
                    {activeChips.map((chip, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-1.5 bg-[#eff4ff] text-[#00288e] px-2.5 py-1 rounded-full text-xs font-semibold border border-blue-100"
                      >
                        <span>{chip.label}</span>
                        <button
                          type="button"
                          onClick={chip.onRemove}
                          className="hover:text-rose-600 transition-colors cursor-pointer leading-none"
                          title="Remove filter"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path d="M18 6 6 18M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-xs text-rose-600 hover:text-rose-700 font-bold ml-1 cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* ══════════════════════════════════════
                BODY: 4-col Filter Sidebar + 8-col Results
            ══════════════════════════════════════ */}
            <div className="max-w-[80rem] mx-auto w-full px-6 py-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* LEFT: Dynamic Filter Sidebar */}
                <FilterSidebar
                  selectedWorkModes={selectedWorkModes}
                  onToggleWorkMode={handleToggleWorkMode}
                  selectedExp={selectedExp}
                  onToggleExp={handleToggleExp}
                  selectedCtc={selectedCtc}
                  onToggleCtc={handleToggleCtc}
                  verifiedOnly={verifiedOnly}
                  onToggleVerified={() => setVerifiedOnly((prev) => !prev)}
                  activeFilterCount={activeChips.length}
                  onClearAll={handleClearAll}
                />

                {/* RIGHT: Results List */}
                <div className="lg:col-span-8 flex flex-col gap-4">

                  {/* Results Header */}
                  <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-sm font-bold text-[#0b1c30] block">
                        {isLoading ? 'Searching requisitions…' : `Showing ${jobs.length} Open Requisition${jobs.length !== 1 ? 's' : ''}`}
                      </span>
                      <span className="text-xs text-[#444653]">Live job postings from registered employers</span>
                    </div>

                    {/* Sort Selector */}
                    <div className="flex items-center gap-2 bg-[#eff4ff] px-3 py-1.5 rounded-lg border border-blue-100">
                      <span className="text-xs text-[#444653] font-medium">Sort:</span>
                      <select
                        id="sort-select"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="bg-transparent border-none outline-none text-xs text-[#0b1c30] font-bold cursor-pointer"
                      >
                        <option value="newest">Newest First</option>
                        <option value="salary">Salary (High to Low)</option>
                        <option value="relevance">Relevance</option>
                      </select>
                    </div>
                  </div>

                  {/* Loading State */}
                  {isLoading && (
                    <div className="bg-white p-12 rounded-xl shadow-xs border border-slate-200/80 flex flex-col items-center justify-center text-center gap-3">
                      <div className="w-8 h-8 border-3 border-[#00288e] border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-semibold text-slate-600">Loading published positions from Vakancy.in database…</p>
                    </div>
                  )}

                  {/* Real Job Cards List */}
                  {!isLoading && jobs.length > 0 && (
                    <div className="flex flex-col gap-4">
                      {jobs.map((job) => (
                        <JobCard
                          key={job.id}
                          job={job}
                          saved={savedJobIds.has(String(job.id))}
                          onSave={handleSave}
                        />
                      ))}
                    </div>
                  )}

                  {/* Clean Empty State (When no jobs match) */}
                  {!isLoading && jobs.length === 0 && (
                    <div className="bg-white p-12 rounded-xl shadow-xs border border-slate-200/80 flex flex-col items-center justify-center text-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#00288e]">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                        </svg>
                      </div>
                      <div className="max-w-md space-y-1">
                        <h3 className="text-base font-bold text-slate-900">No matching positions found</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          We couldn't find any active job postings matching your current search criteria or filter combinations.
                        </p>
                      </div>
                      {activeChips.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAll}
                          className="px-4 py-2 bg-[#00288e] hover:bg-[#1e40af] text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer"
                        >
                          Clear All Filters
                        </button>
                      )}
                    </div>
                  )}

                  {/* Calibration Notice */}
                  <div className="bg-[#eff4ff] p-4 rounded-xl flex items-center justify-between gap-4 border border-blue-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-[#00288e] shadow-xs shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                          <polyline points="9 12 11 14 15 10"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#0b1c30]">Authoritative Employer Network</p>
                        <p className="text-[11px] text-[#444653]">All openings are verified directly against active employer credentials on Vakancy.in.</p>
                      </div>
                    </div>
                    <Link
                      to="/candidate/profile"
                      className="px-3.5 py-1.5 bg-white hover:bg-[#e5eeff] text-[#00288e] font-bold text-xs rounded-lg shadow-xs transition-colors shrink-0"
                    >
                      Update Profile
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </CandidatePortalShell>
  );
};

export default CandidateFindJobsPage;
