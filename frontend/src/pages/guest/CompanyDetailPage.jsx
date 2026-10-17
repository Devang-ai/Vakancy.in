import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Building2,
  Users,
  Calendar,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Share2,
  ArrowRight,
  TrendingUp,
  Cpu,
  ShieldCheck,
  Award,
  Star,
  StarHalf,
  Clock,
  Briefcase,
  Bell,
  Sparkles,
} from 'lucide-react';

import companyService from '../../services/companyService';
import CompanyCard from '../../components/common/CompanyCard';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import EmptyState from '../../components/ui/EmptyState';

/**
 * CompanyDetailPage
 * Dynamic Guest Company Profile Dossier.
 * Source of Truth: Google Stitch Screen ID ecc9262975f24a68a6069c9bb2b33fce ("Vakancy.in - Company Profile").
 */
export const CompanyDetailPage = () => {
  const { id } = useParams();

  // Component state
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDept, setSelectedDept] = useState('all');

  // Interactive user states
  const [isFollowing, setIsFollowing] = useState(false);
  const [savedRoleIds, setSavedRoleIds] = useState(new Set());
  const [alertEmail, setAlertEmail] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3500);
  };

  // Fetch company data on ID change
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setIsFollowing(false);
    setSelectedDept('all');

    const fetchDetails = async () => {
      try {
        const data = await companyService.getCompanyById(id);
        if (isMounted) {
          setCompany(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load company profile:', err);
        if (isMounted) {
          setCompany(null);
          setLoading(false);
        }
      }
    };

    fetchDetails();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Tab navigation items
  const navTabs = useMemo(() => {
    if (!company) return [];
    return [
      { id: 'overview', label: 'Overview' },
      { id: 'jobs', label: 'Open Jobs', badge: String(company.openJobsCount || 0) },
      { id: 'culture', label: 'Life & Culture' },
      { id: 'benefits', label: 'Benefits & Perks' },
      { id: 'reviews', label: 'Reviews & Ratings', badge: `${company.scorecard?.overall || 4.2} ★` },
    ];
  }, [company]);

  // Department tabs for open roles
  const departmentTabs = useMemo(() => {
    if (!company || !company.featuredRoles) return [];
    const depts = new Set(company.featuredRoles.map((r) => r.department));
    return ['all', ...Array.from(depts)];
  }, [company]);

  // Filtered roles based on selected department
  const filteredRoles = useMemo(() => {
    if (!company || !company.featuredRoles) return [];
    if (selectedDept === 'all') return company.featuredRoles;
    return company.featuredRoles.filter(
      (r) => r.department.toLowerCase() === selectedDept.toLowerCase()
    );
  }, [company, selectedDept]);

  // Interactive event handlers
  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'jobs') {
      const el = document.getElementById('jobs-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (tabId === 'culture') {
      const el = document.getElementById('culture-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (tabId === 'benefits') {
      const el = document.getElementById('benefits-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (tabId === 'reviews') {
      const el = document.getElementById('scorecard-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleFollow = () => {
    setIsFollowing(!isFollowing);
    showToast(!isFollowing ? `Following ${company.name} updates & open requisitions` : `Unfollowed ${company.name}`);
  };

  const toggleSaveRole = (roleId) => {
    setSavedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
        showToast('Role removed from saved requisitions');
      } else {
        next.add(roleId);
        showToast('Role saved to your profile');
      }
      return next;
    });
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('Profile link copied to clipboard');
    } else {
      showToast('Profile URL ready to share');
    }
  };

  const handleSubscribeAlerts = (e) => {
    e.preventDefault();
    if (!alertEmail || !alertEmail.includes('@')) {
      showToast('Please enter a valid work email');
      return;
    }
    showToast(`Subscribed ${alertEmail} to ${company.name} job alerts!`);
    setAlertEmail('');
  };

  // --------------------------------------------------------------------------
  // Loading State
  // --------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
          <LoadingSkeleton count={1} variant="rect" className="h-6 w-48 rounded" />
          <LoadingSkeleton count={1} variant="card" className="h-56 rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
            <div className="lg:col-span-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <LoadingSkeleton count={3} variant="card" className="h-28" />
              </div>
              <LoadingSkeleton count={2} variant="card" className="h-52" />
            </div>
            <div className="lg:col-span-4 space-y-6">
              <LoadingSkeleton count={3} variant="card" className="h-44" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Not Found / Invalid Company ID State
  // --------------------------------------------------------------------------
  if (!company) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col items-center justify-center py-16 px-4">
        <EmptyState
          icon={Building2}
          title="Company Profile Not Found"
          description={`We couldn't find an employer profile matching "${id}". The organization may have updated its profile URL or is not currently listed.`}
          actionLabel="Back to Company Directory"
          onAction={() => window.location.assign('/companies')}
          className="max-w-md w-full"
        />
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Main Company Profile View (Stitch ecc9262975f24a68a6069c9bb2b33fce)
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] pb-16">
      {/* ========================================================================= */}
      {/* BREADCRUMB & BACK NAVIGATION BAR */}
      {/* ========================================================================= */}
      <div className="w-full bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between text-xs">
          <Link
            to="/companies"
            className="inline-flex items-center gap-1.5 text-slate-600 hover:text-[#00288e] font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Companies</span>
          </Link>
          <span className="text-slate-400 font-medium hidden sm:inline">
            Direct Recruiting Partner • ATS Synced
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. BRAND MASTHEAD BANNER (Stitch lines 13-94) */}
      {/* ========================================================================= */}
      <section className="relative w-full bg-[#e5eeff]/70 border-b border-slate-200/80 overflow-hidden">
        {/* Precision Grid Pattern Background */}
        <div className="absolute inset-0 opacity-15 pointer-events-none" aria-hidden="true">
          <svg className="w-full h-full" height="100%" width="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="company-detail-grid-pattern" height="40" width="40" patternUnits="userSpaceOnUse">
                <path className="text-[#1e40af]" d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
                <circle className="text-[#00288e]" cx="40" cy="40" r="1.5" fill="currentColor" />
              </pattern>
            </defs>
            <rect fill="url(#company-detail-grid-pattern)" height="100%" width="100%" />
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 lg:gap-8">
            {/* Left: Identity Dossier */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6">
              {/* Brand Avatar */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl bg-[#1e40af] text-white flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  {company.code.slice(0, 2)}
                </span>
                <div
                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-xs border border-slate-100"
                  title="Verified Enterprise Partner"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#00288e] fill-blue-50" />
                </div>
              </div>

              {/* Title, Badges & Meta */}
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight font-heading">
                    {company.name}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#006a61] text-xs font-semibold border border-emerald-200/60">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {company.statusBadge || 'Verified Enterprise Partner'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#86f2e4]/30 text-[#006f66] text-xs font-semibold">
                    {company.tier || 'Tier-1 Employer'}
                  </span>
                </div>

                <p className="text-sm text-slate-600 max-w-2xl mt-1 leading-relaxed">
                  {company.tagline}
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 text-xs font-medium text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-[#00288e]" />
                    {company.industry}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#00288e]" />
                    {company.location}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#00288e]" />
                    {company.employees}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#00288e]" />
                    {company.founded}
                  </span>
                  {company.website && (
                    <>
                      <span className="text-slate-300">•</span>
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[#00288e] hover:underline font-semibold"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {company.websiteDisplay || 'Website'}
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Key Actions Bar */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 pt-2 lg:pt-0">
              <button
                type="button"
                onClick={toggleFollow}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-xs ${
                  isFollowing
                    ? 'bg-[#1e40af] text-white'
                    : 'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50'
                }`}
                aria-label={isFollowing ? `Following ${company.name}` : `Follow ${company.name}`}
              >
                {isFollowing ? (
                  <BookmarkCheck className="w-4 h-4 text-white" />
                ) : (
                  <Bookmark className="w-4 h-4 text-[#00288e]" />
                )}
                <span>{isFollowing ? 'Following' : 'Follow Company'}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-xs ${
                    isFollowing ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {company.followersCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTabClick('jobs')}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#1e40af] hover:bg-[#00288e] text-white shadow-xs transition-all"
              >
                <span>View {company.openJobsCount} Open Jobs</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleShare}
                aria-label="Share company profile"
                className="w-9 h-9 rounded-lg bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 flex items-center justify-center shadow-xs transition-colors"
                title="Share profile"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. PROFILE SECONDARY NAVIGATION TOOLBAR (Stitch lines 95-116) */}
      {/* ========================================================================= */}
      <nav className="w-full bg-white border-b border-slate-200/80 shadow-xs sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-2">
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabClick(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#1e40af] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`px-1.5 py-0.2 rounded text-[11px] font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-[#00288e]'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* 3. MAIN BODY CONTENT GRID (Stitch lines 117-679) */}
      {/* ========================================================================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ----------------------------------------------------------------- */}
          {/* PRIMARY LEFT DOSSIER COLUMN (8 Columns) */}
          {/* ----------------------------------------------------------------- */}
          <div className="lg:col-span-8 flex flex-col gap-8 min-w-0">
            {/* 1. Fast Facts Metric Bar Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {company.fastFacts?.map((fact, idx) => (
                <div
                  key={idx}
                  className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                      {fact.label}
                    </span>
                    {idx === 0 && <Users className="w-5 h-5 text-[#1e40af]" />}
                    {idx === 1 && <Building2 className="w-5 h-5 text-[#1e40af]" />}
                    {idx === 2 && <TrendingUp className="w-5 h-5 text-[#006a61]" />}
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
                      {fact.value}
                    </span>
                    <p
                      className={`text-xs mt-1 font-medium flex items-center gap-1 ${
                        fact.trend ? 'text-[#006a61]' : 'text-slate-500'
                      }`}
                    >
                      {fact.trend && <TrendingUp className="w-3.5 h-3.5" />}
                      {fact.subtext}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* 2. About Company Section */}
            <div className="bg-white p-6 sm:p-7 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-900 font-heading">{company.about?.title}</h2>
                <span className="text-xs text-slate-400 font-medium">Profile synced via Vakancy.in ATS API</span>
              </div>
              <div className="space-y-3.5 pt-4 text-sm text-slate-600 leading-relaxed">
                {company.about?.paragraphs?.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>

              {/* UPI / Sector Market Share Visual Representation */}
              {company.about?.upiDominance && (
                <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-900">
                      {company.about.upiDominance.title}
                    </span>
                    <span className="text-xs font-bold text-[#00288e]">
                      {company.about.upiDominance.stat}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                    {company.about.upiDominance.breakdown.map((item, idx) => (
                      <div
                        key={idx}
                        className="h-full"
                        style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                        title={item.label}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-2.5 text-xs text-slate-500">
                    {company.about.upiDominance.breakdown.map((item, idx) => (
                      <span key={idx} className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Tech & Engineering Culture Section */}
            <div id="culture-section" className="bg-white p-6 sm:p-7 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 font-heading">
                    {company.techCulture?.title || 'Tech & Engineering Culture'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {company.techCulture?.subtitle}
                  </p>
                </div>
                {company.techCulture?.badge && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 text-[#00288e] text-xs font-semibold flex-shrink-0">
                    <Cpu className="w-3.5 h-3.5" />
                    {company.techCulture.badge}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {company.techCulture?.pillars?.map((pillar, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 flex flex-col gap-2"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg ${pillar.bg} flex items-center justify-center font-bold text-sm shadow-xs`}
                    >
                      {idx === 0 && <TrendingUp className="w-4 h-4" />}
                      {idx === 1 && <Briefcase className="w-4 h-4" />}
                      {idx === 2 && <Users className="w-4 h-4" />}
                      {idx === 3 && <ShieldCheck className="w-4 h-4" />}
                    </div>
                    <h3 className="font-bold text-sm text-slate-900">{pillar.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{pillar.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Active Open Jobs Section with Compact Design System Cards */}
            <div
              id="jobs-section"
              className="bg-white p-6 sm:p-7 rounded-xl border border-slate-200/80 shadow-xs flex flex-col gap-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900 font-heading">Featured Open Roles</h2>
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#00288e] text-xs font-bold">
                      {company.openJobsCount} Available
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Direct recruiting pipeline monitored by {company.name} Talent Acquisition
                  </p>
                </div>

                {/* Department Filter Tabs */}
                {departmentTabs.length > 1 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {departmentTabs.map((dept) => (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => setSelectedDept(dept)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          selectedDept === dept
                            ? 'bg-[#1e40af] text-white font-semibold shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                        }`}
                      >
                        {dept === 'all'
                          ? `All (${company.featuredRoles.length})`
                          : dept.charAt(0).toUpperCase() + dept.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Roles List */}
              <div className="space-y-3.5">
                {filteredRoles.map((role) => {
                  const isSaved = savedRoleIds.has(role.id);
                  return (
                    <div
                      key={role.id}
                      className="p-4 bg-slate-50 hover:bg-blue-50/40 rounded-xl border border-slate-200/70 shadow-xs transition-all flex flex-col gap-2.5 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 text-[#00288e] flex items-center justify-center flex-shrink-0 font-bold">
                            <Briefcase className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                to="/jobs"
                                className="font-bold text-sm text-slate-900 group-hover:text-[#00288e] hover:underline transition-colors"
                              >
                                {role.title}
                              </Link>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${role.badgeColor}`}
                              >
                                {role.badge}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{role.team}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleSaveRole(role.id)}
                          className="p-1.5 text-slate-400 hover:text-[#00288e] rounded-lg transition-colors"
                          title={isSaved ? 'Remove Bookmark' : 'Save Requisition'}
                          aria-label="Save job requisition"
                        >
                          {isSaved ? (
                            <BookmarkCheck className="w-4 h-4 text-[#00288e]" />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Role Metadata Pills */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-white border border-slate-200/80 font-medium">
                          {role.salary}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-white border border-slate-200/80 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {role.experience}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-white border border-slate-200/80 font-medium">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {role.location}
                        </span>
                        {role.tag && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-white border border-slate-200/80 font-medium text-slate-500">
                            {role.tag}
                          </span>
                        )}
                      </div>

                      {/* Role Bottom Bar */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 text-xs text-slate-500">
                        <span>{role.posted} • {role.applicants}</span>
                        <Link
                          to="/jobs"
                          className="px-3.5 py-1 rounded-md bg-[#1e40af] hover:bg-[#00288e] text-white font-semibold text-xs transition-colors shadow-xs"
                        >
                          Apply on Vakancy.in
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Link
                to="/jobs"
                className="w-full py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold text-center transition-colors mt-1 block"
              >
                View All {company.openJobsCount} Requisitions at {company.name} →
              </Link>
            </div>

            {/* 5. Employee Perks & Benefits Showcase */}
            <div id="benefits-section" className="bg-white p-6 sm:p-7 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 font-heading">
                    Employee Benefits & Perks
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Validated benefits package offered across full-time corporate roles
                  </p>
                </div>
                <Award className="w-6 h-6 text-[#006a61]" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {company.benefits?.map((benefit, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 flex items-start gap-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-[#00288e] flex items-center justify-center flex-shrink-0">
                      {idx === 0 && <ShieldCheck className="w-5 h-5" />}
                      {idx === 1 && <TrendingUp className="w-5 h-5" />}
                      {idx === 2 && <Sparkles className="w-5 h-5" />}
                      {idx === 3 && <Clock className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{benefit.title}</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* RIGHT RAIL: COMPANY SIDEBAR & CONTEXT (4 Columns) */}
          {/* ----------------------------------------------------------------- */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* 1. Quick Dossier Snapshot Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
              <h3 className="font-bold text-base text-slate-900 font-heading">
                Company Snapshot
              </h3>

              <div className="flex flex-col divide-y divide-slate-100 text-xs">
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-500">Legal Entity</span>
                  <span className="font-semibold text-slate-900 text-right">
                    {company.snapshot?.legalEntity}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-500">Headquarters</span>
                  <span className="font-semibold text-slate-900 text-right">
                    {company.snapshot?.headquarters}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-500">Company Stage</span>
                  <span className="font-semibold text-[#006a61] text-right">
                    {company.snapshot?.stage}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-500">Key Investors</span>
                  <span className="font-semibold text-slate-900 text-right">
                    {company.snapshot?.keyInvestors}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-500">Hiring Pace</span>
                  <span className="font-semibold text-[#00288e] text-right">
                    {company.snapshot?.hiringPace}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-500">Average Turnaround</span>
                  <span className="font-semibold text-slate-900 text-right">
                    {company.snapshot?.turnaround}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/60 rounded-xl">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#006a61]" />
                  <span className="text-xs font-bold text-[#006a61]">
                    Vakancy.in Verified Recruiter
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Applications submitted through Vakancy.in are directly dispatched into {company.name}'s internal ATS queue.
                </p>
              </div>
            </div>

            {/* 2. Ratings & Talent Scorecard */}
            <div id="scorecard-section" className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-900 font-heading">
                  Talent Scorecard
                </h3>
                <span className="text-xs text-slate-400">Based on {company.scorecard?.reviewsCount} reviews</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center justify-center p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 min-w-[76px]">
                  <span className="text-3xl font-extrabold text-[#00288e] font-heading leading-none">
                    {company.scorecard?.overall}
                  </span>
                  <div className="flex items-center text-amber-500 mt-1.5">
                    <Star className="w-3 h-3 fill-amber-500" />
                    <Star className="w-3 h-3 fill-amber-500" />
                    <Star className="w-3 h-3 fill-amber-500" />
                    <Star className="w-3 h-3 fill-amber-500" />
                    <StarHalf className="w-3 h-3 fill-amber-500" />
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-2.5">
                  {company.scorecard?.categories?.map((cat, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-xs text-slate-600 font-medium">
                        <span>{cat.label}</span>
                        <span className="font-bold text-slate-900">{cat.score}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full ${cat.color} rounded-full`}
                          style={{ width: `${cat.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Campus & Workplace Environment */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col gap-3.5">
              <h3 className="font-bold text-base text-slate-900 font-heading">
                Office Locations
              </h3>
              <p className="text-xs text-slate-500">
                Primary engineering hubs with state-of-the-art facilities
              </p>

              <div
                className="w-full h-36 bg-cover bg-center rounded-xl relative overflow-hidden shadow-inner flex items-end p-3.5 border border-slate-200/60"
                style={{
                  backgroundImage: `url('${company.locations?.mainImage}')`,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
                <div className="relative text-white z-10">
                  <span className="font-bold text-sm block">
                    {company.locations?.mainName}
                  </span>
                  <span className="text-xs text-slate-200">
                    {company.locations?.mainAddress}
                  </span>
                </div>
              </div>

              <div className="flex flex-col divide-y divide-slate-100 text-xs text-slate-600 pt-1">
                {company.locations?.otherOffices?.map((off, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2">
                    <span>{off.name}</span>
                    <span className="font-semibold text-slate-900">{off.address}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Similar Companies Section */}
            {company.similarCompanies && company.similarCompanies.length > 0 && (
              <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-900 font-heading">
                    Similar Companies
                  </h3>
                  <Building2 className="w-4 h-4 text-slate-400" />
                </div>

                <div className="flex flex-col gap-2.5">
                  {company.similarCompanies.map((simComp) => (
                    <CompanyCard
                      key={simComp.id}
                      company={simComp}
                      variant="sidebar"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 5. Company Hiring Alert Box */}
            <div className="p-5 rounded-xl bg-[#1e40af] text-white flex flex-col gap-2.5 shadow-sm">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#86f2e4]" />
                <span className="font-bold text-sm">{company.name} Job Alerts</span>
              </div>
              <p className="text-xs text-blue-100 leading-relaxed">
                Get instant notifications when {company.name} opens requisitions matching your engineering or product specialty.
              </p>
              <form onSubmit={handleSubscribeAlerts} className="flex gap-2 mt-1">
                <input
                  type="email"
                  value={alertEmail}
                  onChange={(e) => setAlertEmail(e.target.value)}
                  placeholder="Your work email"
                  className="bg-white text-slate-900 text-xs rounded-lg px-3 py-1.5 flex-1 focus:outline-none placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  className="bg-[#006a61] text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#005049] transition-colors flex-shrink-0"
                >
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Interactive Floating Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200 border border-slate-700"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default CompanyDetailPage;
