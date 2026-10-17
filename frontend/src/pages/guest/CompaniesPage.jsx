import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
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
  Heart,
  X,
  Sparkles,
} from 'lucide-react';

import companyService from '../../services/companyService';
import CompanyCard from '../../components/common/CompanyCard';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';

export const CompaniesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state synchronization
  const searchQuery = searchParams.get('search') || '';
  const selectedCategory = searchParams.get('category') || 'all';
  const currentPage = parseInt(searchParams.get('page'), 10) || 1;
  const activeTab = searchParams.get('tab') || 'overview';

  // Local state
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [companiesData, setCompaniesData] = useState({
    companies: [],
    total: 0,
    page: 1,
    totalPages: 1,
  });
  const [spotlightData, setSpotlightData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Department filter for open roles within spotlight
  const [selectedDept, setSelectedDept] = useState('all');

  // Interactive user states
  const [isFollowing, setIsFollowing] = useState(false);
  const [savedRoleIds, setSavedRoleIds] = useState(new Set());
  const [alertEmail, setAlertEmail] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // Display toast feedback helper
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

  // Sync search input if query param changes externally
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  // Fetch companies and spotlight data
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchData = async () => {
      try {
        const [compRes, spotRes] = await Promise.all([
          companyService.getCompanies({
            search: searchQuery,
            category: selectedCategory,
            page: currentPage,
            limit: 8,
          }),
          companyService.getSpotlightCompany(),
        ]);

        if (isMounted) {
          setCompaniesData(compRes);
          setSpotlightData(spotRes);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load company directory:', err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [searchQuery, selectedCategory, currentPage]);

  // Sector filter categories
  const categories = [
    { id: 'all', label: 'All Sectors' },
    { id: 'fintech', label: 'FinTech & Payments' },
    { id: 'it-services', label: 'IT Services & Cloud' },
    { id: 'consumer-tech', label: 'Consumer Tech' },
    { id: 'ecommerce', label: 'E-Commerce' },
    { id: 'saas', label: 'Enterprise SaaS' },
    { id: 'banking', label: 'Banking & BFSI' },
  ];

  // Navigation tabs matching Stitch lines 98-114
  const navTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'directory', label: 'All Employers', badge: companiesData.total || '15+' },
    { id: 'jobs', label: 'Open Jobs', badge: '38' },
    { id: 'culture', label: 'Life & Culture' },
    { id: 'benefits', label: 'Benefits & Perks' },
    { id: 'reviews', label: 'Reviews & Ratings', badge: '4.3 ★' },
  ];

  // Update query params helper
  const updateParams = (updates) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '' || (key === 'category' && val === 'all') || (key === 'page' && val === 1) || (key === 'tab' && val === 'overview')) {
        newParams.delete(key);
      } else {
        newParams.set(key, val);
      }
    });
    setSearchParams(newParams, { replace: true });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParams({ search: searchInput, page: 1, tab: searchInput ? 'directory' : activeTab });
  };

  const handleClearSearch = () => {
    setSearchInput('');
    updateParams({ search: '', page: 1 });
  };

  const handleCategorySelect = (catId) => {
    updateParams({ category: catId, page: 1, tab: catId !== 'all' ? 'directory' : activeTab });
  };

  const handleTabSelect = (tabId) => {
    updateParams({ tab: tabId });
    if (tabId === 'jobs') {
      const el = document.getElementById('jobs-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePageChange = (newPage) => {
    updateParams({ page: newPage });
    window.scrollTo({ top: 380, behavior: 'smooth' });
  };

  const toggleFollow = () => {
    setIsFollowing(!isFollowing);
    showToast(!isFollowing ? 'Following PhonePe updates & open requisitions' : 'Unfollowed PhonePe');
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
      showToast('Profile URL copied to clipboard');
    } else {
      showToast('Profile link ready to share');
    }
  };

  const handleSubscribeAlerts = (e) => {
    e.preventDefault();
    if (!alertEmail || !alertEmail.includes('@')) {
      showToast('Please enter a valid work email');
      return;
    }
    showToast(`Subscribed ${alertEmail} to PhonePe hiring alerts!`);
    setAlertEmail('');
  };

  // Filtered roles based on department tab
  const displayedRoles = useMemo(() => {
    if (!spotlightData || !spotlightData.featuredRoles) return [];
    if (selectedDept === 'all') return spotlightData.featuredRoles;
    return spotlightData.featuredRoles.filter(
      (r) => r.department.toLowerCase() === selectedDept.toLowerCase()
    );
  }, [spotlightData, selectedDept]);

  // Determine whether to display the Directory Grid or the Spotlight Dossier
  const isDirectoryMode =
    activeTab === 'directory' ||
    Boolean(searchQuery) ||
    selectedCategory !== 'all';

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] pb-16">
      {/* ========================================================================= */}
      {/* 1. BRAND MASTHEAD BANNER (Stitch lines 13-94) */}
      {/* ========================================================================= */}
      <section className="relative w-full bg-[#e5eeff]/70 border-b border-slate-200/80 overflow-hidden">
        {/* Precision Grid Pattern Background */}
        <div className="absolute inset-0 opacity-15 pointer-events-none" aria-hidden="true">
          <svg className="w-full h-full" height="100%" width="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="company-grid-pattern" height="40" width="40" patternUnits="userSpaceOnUse">
                <path className="text-[#1e40af]" d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
                <circle className="text-[#00288e]" cx="40" cy="40" r="1.5" fill="currentColor" />
              </pattern>
            </defs>
            <rect fill="url(#company-grid-pattern)" height="100%" width="100%" />
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 lg:gap-8">
            {/* Left: Avatar & Identity Dossier */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6">
              {/* Brand Avatar */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl bg-[#1e40af] text-white flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">PP</span>
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
                    PhonePe
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#006a61] text-xs font-semibold border border-emerald-200/60">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Enterprise Partner
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#86f2e4]/30 text-[#006f66] text-xs font-semibold">
                    Tier-1 Employer
                  </span>
                </div>

                <p className="text-sm text-slate-600 max-w-2xl mt-1 leading-relaxed">
                  India's leading fintech platform powering payments, merchant services, mutual funds, and digital commerce.
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 text-xs font-medium text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-[#00288e]" />
                    FinTech / Digital Payments
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#00288e]" />
                    Bengaluru, Karnataka
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#00288e]" />
                    5,000+ Employees
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#00288e]" />
                    Founded 2015
                  </span>
                  <span className="text-slate-300">•</span>
                  <a
                    href="https://www.phonepe.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[#00288e] hover:underline font-semibold"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    phonepe.com
                  </a>
                </div>
              </div>
            </div>

            {/* Right: Key Metrics & Primary Action Bar */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 pt-2 lg:pt-0">
              <button
                type="button"
                onClick={toggleFollow}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-xs ${
                  isFollowing
                    ? 'bg-[#1e40af] text-white'
                    : 'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50'
                }`}
                aria-label={isFollowing ? 'Following PhonePe' : 'Follow PhonePe'}
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
                  84.2k
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTabSelect('jobs')}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#1e40af] hover:bg-[#00288e] text-white shadow-xs transition-all"
              >
                <span>View 38 Open Jobs</span>
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
      {/* 2. PROFILE SECONDARY NAVIGATION & SEARCH TOOLBAR (Stitch lines 95-116) */}
      {/* ========================================================================= */}
      <nav className="w-full bg-white border-b border-slate-200/80 shadow-xs sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-2.5">
            {/* Scrollable Navigation Tabs */}
            <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-0.5">
              {navTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabSelect(tab.id)}
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

            {/* Quick Directory Search Form */}
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center gap-2 max-w-md w-full md:w-80 relative"
            >
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search employers or tech stack..."
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#00288e] focus:bg-white transition-colors"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    aria-label="Clear search input"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-[#00288e] hover:bg-[#1e40af] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex-shrink-0"
              >
                Search
              </button>
            </form>
          </div>

          {/* Sector Category Filters Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex-shrink-0">
              Sectors:
            </span>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategorySelect(cat.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-[#00288e] text-white font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* 3. MAIN BODY CONTENT GRID (Stitch lines 117-679) */}
      {/* ========================================================================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* VIEW A: DIRECTORY SEARCH & CATEGORY FILTER RESULTS */}
        {isDirectoryMode ? (
          <div className="space-y-6">
            {/* Header & Active Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-heading">
                  Verified Employer Directory
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing {companiesData.total} institutional corporate partners hiring through Vakancy.in ATS
                </p>
              </div>

              {(searchQuery || selectedCategory !== 'all') && (
                <div className="flex items-center gap-2 flex-wrap">
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-[#00288e] text-xs font-semibold">
                      Search: "{searchQuery}"
                      <button type="button" onClick={handleClearSearch} className="hover:text-blue-900 ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {selectedCategory !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                      Sector: {categories.find((c) => c.id === selectedCategory)?.label}
                      <button type="button" onClick={() => handleCategorySelect('all')} className="hover:text-slate-900 ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      handleClearSearch();
                      handleCategorySelect('all');
                      handleTabSelect('overview');
                    }}
                    className="text-xs text-[#00288e] font-semibold hover:underline ml-1"
                  >
                    Reset All
                  </button>
                </div>
              )}
            </div>

            {/* Content Listing */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <LoadingSkeleton count={6} variant="card" className="h-44" />
              </div>
            ) : companiesData.companies.length === 0 ? (
              <EmptyState
                title="No companies found"
                description={`No verified employers match "${searchQuery || selectedCategory}". Try adjusting your query or sector filter.`}
                actionLabel="Reset Search & Filters"
                onAction={() => {
                  handleClearSearch();
                  handleCategorySelect('all');
                }}
              />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {companiesData.companies.map((comp) => (
                    <CompanyCard key={comp.id} company={comp} variant="directory" />
                  ))}
                </div>

                <Pagination
                  currentPage={companiesData.page}
                  totalPages={companiesData.totalPages}
                  onPageChange={handlePageChange}
                />
              </>
            )}
          </div>
        ) : (
          /* VIEW B: FULL SPOTLIGHT PROFILE DOSSIER (Stitch lines 119-678) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* ----------------------------------------------------------------- */}
            {/* PRIMARY LEFT DOSSIER COLUMN (8 Columns) */}
            {/* ----------------------------------------------------------------- */}
            <div className="lg:col-span-8 flex flex-col gap-8 min-w-0">
              {/* 1. Fast Facts Metric Bar Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {spotlightData?.fastFacts?.map((fact, idx) => (
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

              {/* 2. About PhonePe Section */}
              <div className="bg-white p-6 sm:p-7 rounded-xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-xl font-bold text-slate-900 font-heading">About PhonePe</h2>
                  <span className="text-xs text-slate-400 font-medium">Profile synced via Vakancy.in ATS API</span>
                </div>
                <div className="space-y-3.5 pt-4 text-sm text-slate-600 leading-relaxed">
                  {spotlightData?.about?.paragraphs?.map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>

                {/* UPI Market Share Visual Representation */}
                <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-900">
                      {spotlightData?.about?.upiDominance?.title}
                    </span>
                    <span className="text-xs font-bold text-[#00288e]">
                      {spotlightData?.about?.upiDominance?.stat}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                    <div className="bg-[#1e40af] h-full" style={{ width: '48%' }} title="PhonePe (47.8%)" />
                    <div className="bg-[#3755c3] h-full" style={{ width: '32%' }} title="Nearest Competitor (32.1%)" />
                    <div className="bg-slate-300 h-full" style={{ width: '20%' }} title="Others (20.1%)" />
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-2.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#1e40af]" /> PhonePe (47.8%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#3755c3]" /> Nearest Competitor (32.1%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Others (20.1%)
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Tech & Engineering Culture Section */}
              <div className="bg-white p-6 sm:p-7 rounded-xl border border-slate-200/80 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 font-heading">Tech & Engineering Culture</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Architected for extreme throughput, zero downtime, and distributed autonomy.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 text-[#00288e] text-xs font-semibold flex-shrink-0">
                    <Cpu className="w-3.5 h-3.5" />
                    HBase • Aerospike • Kafka
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  {spotlightData?.techCulture?.pillars?.map((pillar, idx) => (
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
                        38 Available
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Direct recruiting pipeline monitored by PhonePe Talent Acquisition
                    </p>
                  </div>

                  {/* Department Filter Tabs */}
                  <div className="flex items-center gap-1.5">
                    {['all', 'engineering', 'product'].map((dept) => (
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
                          ? 'All (38)'
                          : dept === 'engineering'
                          ? 'Engineering (22)'
                          : 'Product (6)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Roles List */}
                <div className="space-y-3.5">
                  {displayedRoles.map((role) => {
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
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-white border border-slate-200/80 font-medium text-slate-500">
                            {role.tag}
                          </span>
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

                <button
                  type="button"
                  onClick={() => handleTabSelect('directory')}
                  className="w-full py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold text-center transition-colors mt-1"
                >
                  View All 38 Requisitions at PhonePe →
                </button>
              </div>

              {/* 5. Employee Perks & Benefits Showcase */}
              <div className="bg-white p-6 sm:p-7 rounded-xl border border-slate-200/80 shadow-xs">
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
                  {spotlightData?.benefits?.map((benefit, idx) => (
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

              {/* 6. Other Verified Employers Spotlight Carousel/Grid */}
              <div className="bg-white p-6 sm:p-7 rounded-xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 font-heading">
                      Explore Other Verified Employers
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Top tier institutional hiring partners on Vakancy.in
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTabSelect('directory')}
                    className="text-xs font-semibold text-[#00288e] hover:underline flex items-center gap-1"
                  >
                    View All {companiesData.total}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  {companiesData.companies.slice(0, 4).map((comp) => (
                    <CompanyCard key={comp.id} company={comp} variant="directory" />
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
                      {spotlightData?.snapshot?.legalEntity}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-500">Headquarters</span>
                    <span className="font-semibold text-slate-900 text-right">
                      {spotlightData?.snapshot?.headquarters}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-500">Company Stage</span>
                    <span className="font-semibold text-[#006a61] text-right">
                      {spotlightData?.snapshot?.stage}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-500">Key Investors</span>
                    <span className="font-semibold text-slate-900 text-right">
                      {spotlightData?.snapshot?.keyInvestors}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-500">Hiring Pace</span>
                    <span className="font-semibold text-[#00288e] text-right">
                      {spotlightData?.snapshot?.hiringPace}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-500">Average Turnaround</span>
                    <span className="font-semibold text-slate-900 text-right">
                      {spotlightData?.snapshot?.turnaround}
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
                    Applications submitted through Vakancy.in are directly dispatched into PhonePe's internal ATS queue.
                  </p>
                </div>
              </div>

              {/* 2. Ratings & Talent Scorecard */}
              <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-900 font-heading">
                    Talent Scorecard
                  </h3>
                  <span className="text-xs text-slate-400">Based on 1.4k reviews</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center justify-center p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 min-w-[76px]">
                    <span className="text-3xl font-extrabold text-[#00288e] font-heading leading-none">
                      4.3
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
                    {spotlightData?.scorecard?.categories?.map((cat, idx) => (
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
                    backgroundImage: `url('${spotlightData?.locations?.mainImage}')`,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
                  <div className="relative text-white z-10">
                    <span className="font-bold text-sm block">
                      {spotlightData?.locations?.mainName}
                    </span>
                    <span className="text-xs text-slate-200">
                      {spotlightData?.locations?.mainAddress}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col divide-y divide-slate-100 text-xs text-slate-600 pt-1">
                  {spotlightData?.locations?.otherOffices?.map((off, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2">
                      <span>{off.name}</span>
                      <span className="font-semibold text-slate-900">{off.address}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Similar FinTech Companies Section */}
              <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-900 font-heading">
                    Similar FinTech Companies
                  </h3>
                  <Building2 className="w-4 h-4 text-slate-400" />
                </div>

                <div className="flex flex-col gap-2.5">
                  {spotlightData?.similarCompanies?.map((simComp) => (
                    <CompanyCard
                      key={simComp.id}
                      company={simComp}
                      variant="sidebar"
                    />
                  ))}
                </div>
              </div>

              {/* 5. PhonePe Hiring Alert Box */}
              <div className="p-5 rounded-xl bg-[#1e40af] text-white flex flex-col gap-2.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#86f2e4]" />
                  <span className="font-bold text-sm">PhonePe Job Alerts</span>
                </div>
                <p className="text-xs text-blue-100 leading-relaxed">
                  Get instant notifications when PhonePe opens requisitions matching your engineering or product specialty.
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
        )}
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

export default CompaniesPage;
