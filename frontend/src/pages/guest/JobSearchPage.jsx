import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  Briefcase,
  SlidersHorizontal,
  ArrowRight,
  X,
  ChevronUp,
  ChevronDown,
  Check,
  LayoutList,
  LayoutGrid,
  Bell,
  ShieldCheck,
  Bookmark,
} from 'lucide-react';

const SORT_OPTIONS = [
  'Relevance',
  'Date Posted (Newest)',
  'Salary (High to Low)',
];

const CANONICAL_POPULAR_CATEGORIES = [
  'Software Engineering',
  'Data Science & AI',
  'Product & Design',
  'Sales & Marketing',
  'Finance & Accounting',
  'Human Resources',
  'DevOps & Infrastructure',
  'Full Stack Development',
  'Digital Marketing',
  'Customer Support & Service',
];
import jobService from '../../services/jobService';
import JobCard from '../../components/common/JobCard';
import Drawer from '../../components/ui/Drawer';
import Pagination from '../../components/ui/Pagination';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import EmptyState from '../../components/ui/EmptyState';
import Toast from '../../components/ui/Toast';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const JobSearchPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search input states (synced with URL query)
  const initialSearch = searchParams.get('search') || '';
  const initialLocation = searchParams.get('location') || '';
  const initialExp = searchParams.get('experience') || '';
  const initialCategory = searchParams.get('category') || '';
  const initialRecommended = searchParams.get('recommended') === 'true';

  const [roleQuery, setRoleQuery] = useState(initialSearch);
  const [locationQuery, setLocationQuery] = useState(initialLocation);
  const [experienceQuery, setExperienceQuery] = useState(initialExp);

  // Filter Facet States
  const [selectedWorkModes, setSelectedWorkModes] = useState([]);
  const [selectedExpBrackets, setSelectedExpBrackets] = useState([]);
  const [selectedCtcRanges, setSelectedCtcRanges] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || null);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedCompanyTypes, setSelectedCompanyTypes] = useState([]);
  const [selectedFreshness, setSelectedFreshness] = useState('All');
  const [quickSalary, setQuickSalary] = useState(null);
  const [onlyRecommended, setOnlyRecommended] = useState(initialRecommended);

  // Job Categories Master Data & Modal State
  const [categories, setCategories] = useState([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryModalSearch, setCategoryModalSearch] = useState('');

  // Toolbar States
  const [sortBy, setSortBy] = useState('Relevance');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef(null);
  const [viewMode, setViewMode] = useState('detailed'); // 'detailed' | 'compact'
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Autocomplete Suggestions States
  const [keywordSuggestions, setKeywordSuggestions] = useState([]);
  const [isKeywordLoading, setIsKeywordLoading] = useState(false);
  const [showKeywordDropdown, setShowKeywordDropdown] = useState(false);
  const [activeKeywordIndex, setActiveKeywordIndex] = useState(-1);
  const keywordContainerRef = useRef(null);

  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [activeLocationIndex, setActiveLocationIndex] = useState(-1);
  const locationContainerRef = useRef(null);

  // Close custom sort & autocomplete dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setIsSortOpen(false);
      }
      if (keywordContainerRef.current && !keywordContainerRef.current.contains(event.target)) {
        setShowKeywordDropdown(false);
      }
      if (locationContainerRef.current && !locationContainerRef.current.contains(event.target)) {
        setShowLocationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced Keyword Suggestions fetch
  useEffect(() => {
    if (!roleQuery || roleQuery.trim().length < 2) {
      setKeywordSuggestions([]);
      setShowKeywordDropdown(false);
      setIsKeywordLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsKeywordLoading(true);
      try {
        const results = await jobService.getKeywordSuggestions(roleQuery);
        setKeywordSuggestions(results || []);
        setShowKeywordDropdown(true);
        setActiveKeywordIndex(-1);
      } catch (_) {
        setKeywordSuggestions([]);
      } finally {
        setIsKeywordLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [roleQuery]);

  // Debounced Location Suggestions fetch
  useEffect(() => {
    if (!locationQuery || locationQuery.trim().length < 2) {
      setLocationSuggestions([]);
      setShowLocationDropdown(false);
      setIsLocationLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLocationLoading(true);
      try {
        const results = await jobService.getLocationSuggestions(locationQuery);
        setLocationSuggestions(results || []);
        setShowLocationDropdown(true);
        setActiveLocationIndex(-1);
      } catch (_) {
        setLocationSuggestions([]);
      } finally {
        setIsLocationLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [locationQuery]);

  // Autocomplete Selection Handlers
  const handleSelectKeyword = (item) => {
    const text = typeof item === 'string' ? item : item.text;
    setRoleQuery(text);
    setShowKeywordDropdown(false);
    const params = new URLSearchParams(searchParams);
    params.set('search', text);
    if (locationQuery.trim()) params.set('location', locationQuery.trim());
    if (experienceQuery.trim()) params.set('experience', experienceQuery.trim());
    setSearchParams(params, { replace: true });
    setCurrentPage(1);
  };

  const handleSelectLocation = (loc) => {
    setLocationQuery(loc);
    setShowLocationDropdown(false);
    const params = new URLSearchParams(searchParams);
    if (roleQuery.trim()) params.set('search', roleQuery.trim());
    params.set('location', loc);
    if (experienceQuery.trim()) params.set('experience', experienceQuery.trim());
    setSearchParams(params, { replace: true });
    setCurrentPage(1);
  };

  // Keyboard navigation for Keyword input
  const handleKeywordKeyDown = (e) => {
    if (!showKeywordDropdown || keywordSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveKeywordIndex((prev) => (prev < keywordSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveKeywordIndex((prev) => (prev > 0 ? prev - 1 : keywordSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (activeKeywordIndex >= 0 && keywordSuggestions[activeKeywordIndex]) {
        e.preventDefault();
        handleSelectKeyword(keywordSuggestions[activeKeywordIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowKeywordDropdown(false);
    }
  };

  // Keyboard navigation for Location input
  const handleLocationKeyDown = (e) => {
    if (!showLocationDropdown || locationSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveLocationIndex((prev) => (prev < locationSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveLocationIndex((prev) => (prev > 0 ? prev - 1 : locationSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (activeLocationIndex >= 0 && locationSuggestions[activeLocationIndex]) {
        e.preventDefault();
        handleSelectLocation(locationSuggestions[activeLocationIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowLocationDropdown(false);
    }
  };

  // Keyboard navigation & accessibility for Sort By dropdown
  const handleSortKeyDown = (e) => {
    if (!isSortOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsSortOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsSortOpen(false);
      return;
    }

    const currentIndex = SORT_OPTIONS.indexOf(sortBy);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % SORT_OPTIONS.length;
      setSortBy(SORT_OPTIONS[nextIndex]);
      setCurrentPage(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + SORT_OPTIONS.length) % SORT_OPTIONS.length;
      setSortBy(SORT_OPTIONS[prevIndex]);
      setCurrentPage(1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsSortOpen(false);
    }
  };

  // Email Alert Input State
  const [alertEmail, setAlertEmail] = useState('');
  const [alertSuccess, setAlertSuccess] = useState(false);

  // Saved Jobs & Auth Modal States
  const [savedJobIds, setSavedJobIds] = useState(new Set());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingSaveJobId, setPendingSaveJobId] = useState(null);
  const [toast, setToast] = useState(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load saved jobs if authenticated as candidate
  const fetchSavedJobIds = useCallback(async () => {
    if (!user || user.role !== 'candidate') {
      setSavedJobIds(new Set());
      return;
    }
    try {
      const res = await API.get('/candidates/me/saved-jobs');
      if (res?.success && Array.isArray(res.savedJobs)) {
        const ids = new Set(res.savedJobs.map((j) => String(j.jobId || j.id)));
        setSavedJobIds(ids);
      }
    } catch (e) {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    fetchSavedJobIds();
  }, [fetchSavedJobIds]);

  // Save / Unsave Handler
  const handleToggleSave = async (jobId) => {
    if (!user) {
      setPendingSaveJobId(jobId);
      setShowAuthModal(true);
      return;
    }

    if (user.role !== 'candidate') {
      setToast({
        type: 'warning',
        message: 'Only candidate accounts can bookmark saved jobs.',
      });
      return;
    }

    const isCurrentlySaved = savedJobIds.has(String(jobId));
    try {
      if (isCurrentlySaved) {
        const res = await API.delete(`/candidates/me/saved-jobs/${jobId}`);
        if (res?.success) {
          setSavedJobIds((prev) => {
            const next = new Set(prev);
            next.delete(String(jobId));
            return next;
          });
          setToast({
            type: 'info',
            message: 'Job removed from saved jobs.',
          });
          window.dispatchEvent(new Event('vakancy:candidate-counts-update'));
        } else {
          setToast({
            type: 'error',
            message: res?.message || 'Failed to remove job.',
          });
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
            message: 'Job saved successfully.',
          });
          window.dispatchEvent(new Event('vakancy:candidate-counts-update'));
        } else {
          setToast({
            type: 'error',
            message: res?.message || 'Failed to save job.',
          });
        }
      }
    } catch (err) {
      if (err?.response?.status === 401 || err?.status === 401) {
        setPendingSaveJobId(jobId);
        setShowAuthModal(true);
      } else {
        setToast({
          type: 'error',
          message: err?.message || 'Unable to update saved job status.',
        });
      }
    }
  };

  // Post-login redirect auto-save handler
  useEffect(() => {
    const saveJobIdParam = searchParams.get('saveJobId');
    if (saveJobIdParam && user && user.role === 'candidate') {
      handleToggleSave(saveJobIdParam);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('saveJobId');
      setSearchParams(newParams, { replace: true });
    }
  }, [user, searchParams]);

  // Data & Loading States
  const [jobs, setJobs] = useState([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Master Job Categories from existing backend API
  useEffect(() => {
    let isMounted = true;
    const fetchMasterCategories = async () => {
      setIsCategoriesLoading(true);
      setCategoriesError(null);
      try {
        const cats = await jobService.getJobCategories();
        if (isMounted) {
          setCategories(Array.isArray(cats) ? cats : []);
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Failed to load categories:', err);
          setCategoriesError('Unable to load categories. Please try again.');
        }
      } finally {
        if (isMounted) {
          setIsCategoriesLoading(false);
        }
      }
    };
    fetchMasterCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute 8–10 popular categories directly from master data
  const popularCategories = React.useMemo(() => {
    if (!categories || categories.length === 0) return [];
    const matched = [];
    for (const name of CANONICAL_POPULAR_CATEGORIES) {
      const found = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
      if (found && !matched.some((m) => m.id === found.id)) {
        matched.push(found);
      }
    }
    // If fewer than 8 matched, fill up from remaining master categories
    if (matched.length < 8) {
      for (const cat of categories) {
        if (!matched.some((m) => m.id === cat.id)) {
          matched.push(cat);
          if (matched.length >= 10) break;
        }
      }
    }
    return matched.slice(0, 10);
  }, [categories]);

  // Handle Category Selection (Single-select toggle)
  const handleSelectCategory = (cat) => {
    const catName = typeof cat === 'string' ? cat : (cat?.name || cat?.id);
    const isAlreadySelected = selectedCategory === catName;
    const nextVal = isAlreadySelected ? null : catName;

    setSelectedCategory(nextVal);
    setCurrentPage(1);

    const newParams = new URLSearchParams(searchParams);
    if (nextVal) {
      newParams.set('category', nextVal);
    } else {
      newParams.delete('category');
    }
    setSearchParams(newParams, { replace: true });
    setIsCategoryModalOpen(false);
  };

  // Keyboard navigation & body scroll lock for All Job Categories Modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isCategoryModalOpen) {
        setIsCategoryModalOpen(false);
      }
    };
    if (isCategoryModalOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCategoryModalOpen]);

  // Sync state if URL query params change (e.g. navigation from Home)
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    const urlLocation = searchParams.get('location');
    const urlExp = searchParams.get('experience');
    const urlCat = searchParams.get('category');

    if (urlSearch !== null) setRoleQuery(urlSearch);
    if (urlLocation !== null) setLocationQuery(urlLocation);
    if (urlExp !== null) {
      setExperienceQuery(urlExp);
      if (urlExp.includes('3-5') || urlExp.includes('3 - 5')) {
        setSelectedExpBrackets(['Mid-level (3-5 yrs)']);
      } else if (urlExp.includes('0-2') || urlExp.includes('0 - 2')) {
        setSelectedExpBrackets(['Entry Level (0-2 yrs)']);
      } else if (urlExp.includes('6-9') || urlExp.includes('6 - 9')) {
        setSelectedExpBrackets(['Senior (6-9 yrs)']);
      } else if (urlExp.includes('10+') || urlExp.includes('10')) {
        setSelectedExpBrackets(['Leadership (10+ yrs)']);
      }
    }
    setSelectedCategory(urlCat || null);
    const urlRec = searchParams.get('recommended');
    if (urlRec !== null) {
      setOnlyRecommended(urlRec === 'true');
    }
  }, [searchParams]);

  // Fetch Jobs function
  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters = {
        search: roleQuery.trim() || undefined,
        location: locationQuery.trim() || (selectedLocations.length > 0 ? selectedLocations.join(',') : undefined),
        experience: experienceQuery.trim() || (selectedExpBrackets.length > 0 ? selectedExpBrackets[0] : undefined),
        workMode: selectedWorkModes.length > 0 ? selectedWorkModes : undefined,
        category: selectedCategory || undefined,
        companyType: selectedCompanyTypes.length > 0 ? selectedCompanyTypes : undefined,
        ctcRange: selectedCtcRanges.length > 0 ? selectedCtcRanges : undefined,
        recommended: onlyRecommended ? true : undefined,
        sortBy: sortBy !== 'Relevance' ? sortBy : undefined,
        page: currentPage,
        limit: 10,
      };

      const result = await jobService.getJobs(filters);
      if (result && Array.isArray(result.jobs)) {
        setJobs(result.jobs);
        setTotalJobs(result.total || result.jobs.length);
        setTotalPages(result.totalPages || 1);
      } else {
        setJobs([]);
        setTotalJobs(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.warn('Error fetching jobs:', err);
      setJobs([]);
      setTotalJobs(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [
    roleQuery,
    locationQuery,
    experienceQuery,
    selectedWorkModes,
    selectedCategory,
    selectedCompanyTypes,
    selectedCtcRanges,
    selectedLocations,
    selectedExpBrackets,
    onlyRecommended,
    sortBy,
    currentPage,
  ]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Handle Search Submission
  const handleUpdateSearch = (e) => {
    if (e) e.preventDefault();
    const params = new URLSearchParams();
    if (roleQuery.trim()) params.set('search', roleQuery.trim());
    if (locationQuery.trim()) params.set('location', locationQuery.trim());
    if (experienceQuery.trim()) params.set('experience', experienceQuery.trim());
    if (selectedCategory) params.set('category', selectedCategory);
    if (onlyRecommended) params.set('recommended', 'true');
    setSearchParams(params, { replace: true });
    setCurrentPage(1);
  };

  // Toggle helper for multi-select arrays
  const toggleArrayItem = (list, setList, item) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
    setCurrentPage(1);
  };

  // Clear all filters
  const handleClearAll = () => {
    setRoleQuery('');
    setLocationQuery('');
    setExperienceQuery('');
    setSelectedWorkModes([]);
    setSelectedExpBrackets([]);
    setSelectedCtcRanges([]);
    setSelectedCategory(null);
    setSelectedLocations([]);
    setSelectedCompanyTypes([]);
    setSelectedFreshness('All');
    setQuickSalary(null);
    setOnlyRecommended(false);
    setSearchParams(new URLSearchParams(), { replace: true });
    setCurrentPage(1);
  };

  // Active filters list computation
  const activeFilters = [
    ...(onlyRecommended ? [{ type: 'recommended', label: 'Recommended Jobs' }] : []),
    ...(selectedCategory ? [{ type: 'category', label: `Job Category: ${selectedCategory}`, value: selectedCategory }] : []),
    ...selectedLocations.map((loc) => ({ type: 'location', label: loc })),
    ...selectedExpBrackets.map((exp) => ({ type: 'exp', label: exp.split(' ')[0] || exp })),
    ...selectedCtcRanges.map((ctc) => ({ type: 'ctc', label: ctc })),
    ...selectedWorkModes.map((wm) => ({ type: 'workMode', label: wm })),
    ...selectedCompanyTypes.map((ct) => ({ type: 'companyType', label: ct })),
  ];

  const handleRemoveActiveFilter = (filter) => {
    if (filter.type === 'recommended') {
      setOnlyRecommended(false);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('recommended');
      setSearchParams(newParams, { replace: true });
      setCurrentPage(1);
    }
    if (filter.type === 'category') {
      setSelectedCategory(null);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('category');
      setSearchParams(newParams, { replace: true });
      setCurrentPage(1);
    }
    if (filter.type === 'location') toggleArrayItem(selectedLocations, setSelectedLocations, filter.label);
    if (filter.type === 'exp') setSelectedExpBrackets([]);
    if (filter.type === 'ctc') toggleArrayItem(selectedCtcRanges, setSelectedCtcRanges, filter.label);
    if (filter.type === 'workMode') toggleArrayItem(selectedWorkModes, setSelectedWorkModes, filter.label);
    if (filter.type === 'companyType') toggleArrayItem(selectedCompanyTypes, setSelectedCompanyTypes, filter.label);
  };

  // Alert email subscription
  const handleAlertSubmit = (e) => {
    e.preventDefault();
    if (!alertEmail || !alertEmail.includes('@')) return;
    setAlertSuccess(true);
    setTimeout(() => setAlertSuccess(false), 4000);
    setAlertEmail('');
  };

  // Filter Panel Content
  const FilterPanelContent = () => (
    <div className="flex flex-col gap-5">
      {/* Active Filter Summary Card */}
      {activeFilters.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="font-bold text-sm text-slate-900">
              Filters Applied ({activeFilters.length})
            </span>
            <button
              onClick={handleClearAll}
              className="text-xs text-[#00288e] hover:text-[#1e40af] font-semibold transition-colors cursor-pointer"
              type="button"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-3">
            {activeFilters.map((f, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-medium border border-slate-200/60"
              >
                <span>{f.label}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveActiveFilter(f)}
                  className="text-slate-400 hover:text-rose-600 transition-colors"
                  aria-label={`Remove filter ${f.label}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Facet Groups Container */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col gap-5">
        {/* Recommended Jobs Filter */}
        <div className="flex flex-col gap-2">
          <label className="font-bold text-sm text-slate-900">Recommended</label>
          <div className="flex flex-col gap-1.5 pt-1">
            <label className="flex items-center justify-between cursor-pointer group py-1 select-none">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={onlyRecommended}
                  onChange={() => {
                    const nextVal = !onlyRecommended;
                    setOnlyRecommended(nextVal);
                    setCurrentPage(1);
                    const newParams = new URLSearchParams(searchParams);
                    if (nextVal) {
                      newParams.set('recommended', 'true');
                    } else {
                      newParams.delete('recommended');
                    }
                    setSearchParams(newParams, { replace: true });
                  }}
                  className="w-4 h-4 rounded text-[#00288e] accent-[#00288e] cursor-pointer"
                />
                <span className={`text-xs sm:text-sm font-medium transition-colors ${onlyRecommended ? 'text-[#00288e] font-semibold' : 'text-slate-700 group-hover:text-[#00288e]'}`}>
                  Recommended Jobs
                </span>
              </span>
            </label>
          </div>
        </div>

        <div className="w-full h-px bg-slate-100"></div>

        {/* Work Mode */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-sm text-slate-900">Work Mode</label>
            <ChevronUp className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex flex-col gap-1.5 pt-1">
            {['Work from Home', 'Hybrid', 'On-site'].map((mode) => (
              <label
                key={mode}
                className="flex items-center justify-between cursor-pointer group py-1 select-none"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedWorkModes.includes(mode)}
                    onChange={() => toggleArrayItem(selectedWorkModes, setSelectedWorkModes, mode)}
                    className="w-4 h-4 rounded text-[#00288e] accent-[#00288e] cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm text-slate-700 group-hover:text-[#00288e] transition-colors">
                    {mode}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="w-full h-px bg-slate-100"></div>

        {/* Experience Bracket */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-sm text-slate-900">Experience Bracket</label>
          </div>
          <div className="flex flex-col gap-1.5 pt-1">
            {[
              'Entry Level (0-2 yrs)',
              'Mid-level (3-5 yrs)',
              'Senior (6-9 yrs)',
              'Leadership (10+ yrs)',
            ].map((exp) => (
              <label
                key={exp}
                className="flex items-center justify-between cursor-pointer group py-1 select-none"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedExpBrackets.includes(exp)}
                    onChange={() => toggleArrayItem(selectedExpBrackets, setSelectedExpBrackets, exp)}
                    className="w-4 h-4 rounded text-[#00288e] accent-[#00288e] cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm text-slate-700 group-hover:text-[#00288e] transition-colors">
                    {exp}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="w-full h-px bg-slate-100"></div>

        {/* Annual CTC / Salary */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-sm text-slate-900">Annual CTC / Salary</label>
            <ChevronUp className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex flex-col gap-1.5 pt-1">
            {[
              '₹6 - 10 Lakhs',
              '₹10 - 15 Lakhs',
              '₹15 - 25 Lakhs',
              '₹25 - 50 Lakhs',
              '₹50 Lakhs+',
            ].map((range) => (
              <label
                key={range}
                className="flex items-center justify-between cursor-pointer group py-1 select-none"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedCtcRanges.includes(range)}
                    onChange={() => toggleArrayItem(selectedCtcRanges, setSelectedCtcRanges, range)}
                    className="w-4 h-4 rounded text-[#00288e] accent-[#00288e] cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm text-slate-700 group-hover:text-[#00288e] transition-colors">
                    {range}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="w-full h-px bg-slate-100"></div>

        {/* Job Category */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <span>Job Category</span>
              {selectedCategory && (
                <span className="text-[10px] font-semibold text-[#00288e] bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-200">
                  1 Selected
                </span>
              )}
            </label>
            {selectedCategory && (
              <button
                type="button"
                onClick={() => handleSelectCategory(selectedCategory)}
                className="text-xs text-slate-400 hover:text-rose-600 transition-colors font-medium cursor-pointer"
                aria-label="Clear Job Category filter"
              >
                Clear
              </button>
            )}
          </div>

          {/* Loading, Error, Empty, or Popular Categories */}
          {isCategoriesLoading ? (
            <div className="flex flex-col gap-2 py-2">
              <div className="h-6 bg-slate-100 rounded-md animate-pulse"></div>
              <div className="h-6 bg-slate-100 rounded-md animate-pulse"></div>
              <div className="h-6 bg-slate-100 rounded-md animate-pulse"></div>
              <div className="h-6 bg-slate-100 rounded-md animate-pulse"></div>
            </div>
          ) : categoriesError ? (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 text-xs">
              {categoriesError}
            </div>
          ) : popularCategories.length === 0 ? (
            <div className="text-xs text-slate-400 py-1">No categories available</div>
          ) : (
            <div className="flex flex-col gap-1.5 pt-1">
              {/* If selectedCategory is set but not in popularCategories, show it as selected at top */}
              {selectedCategory && !popularCategories.some((c) => c.name === selectedCategory || c.id === selectedCategory) && (
                <div
                  onClick={() => handleSelectCategory(selectedCategory)}
                  className="flex items-center justify-between cursor-pointer py-1.5 px-2 rounded-lg bg-blue-50 text-[#00288e] font-semibold border border-blue-200/80 shadow-2xs select-none"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectCategory(selectedCategory); }}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-4 h-4 rounded-full border border-[#00288e] bg-[#00288e] text-white flex items-center justify-center shrink-0">
                      <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                    </span>
                    <span className="text-xs sm:text-sm truncate">{selectedCategory}</span>
                  </span>
                  <Check className="w-3.5 h-3.5 text-[#00288e] shrink-0" />
                </div>
              )}

              {popularCategories.map((cat) => {
                const isSelected = selectedCategory === cat.name || selectedCategory === cat.id;
                return (
                  <label
                    key={cat.id || cat.name}
                    onClick={() => handleSelectCategory(cat)}
                    className={`flex items-center justify-between cursor-pointer group py-1.5 px-2 rounded-lg transition-all select-none ${
                      isSelected
                        ? 'bg-blue-50/80 text-[#00288e] font-semibold border border-blue-200/70 shadow-2xs'
                        : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'border-[#00288e] bg-[#00288e] text-white'
                            : 'border-slate-300 group-hover:border-[#00288e]'
                        }`}
                      >
                        {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                      </span>
                      <span className="text-xs sm:text-sm truncate">{cat.name}</span>
                    </span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#00288e] shrink-0" />
                    )}
                  </label>
                );
              })}

              {/* View All Categories Button */}
              <button
                type="button"
                onClick={() => {
                  setCategoryModalSearch('');
                  setIsCategoryModalOpen(true);
                }}
                className="mt-2 w-full py-2 px-3 rounded-lg border border-blue-200/90 bg-[#eff4ff] hover:bg-[#dbeafe] text-[#00288e] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer group shadow-2xs"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-[#00288e] group-hover:scale-110 transition-transform" />
                <span>View All Categories</span>
                <span className="text-[10px] bg-white text-[#00288e] px-1.5 py-0.2 rounded-full font-bold ml-0.5 border border-blue-200">
                  {categories.length || 49}
                </span>
              </button>
            </div>
          )}
        </div>

        <div className="w-full h-px bg-slate-100"></div>

        {/* Location */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-sm text-slate-900">Popular Locations</label>
            <ChevronUp className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex flex-col gap-1.5 pt-1">
            {[
              'Ahmedabad',
              'Bengaluru',
              'Delhi NCR',
              'Mumbai',
              'Hyderabad',
              'Pune',
              'Remote',
            ].map((loc) => (
              <label
                key={loc}
                className="flex items-center justify-between cursor-pointer group py-1 select-none"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedLocations.includes(loc)}
                    onChange={() => toggleArrayItem(selectedLocations, setSelectedLocations, loc)}
                    className="w-4 h-4 rounded text-[#00288e] accent-[#00288e] cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm text-slate-700 group-hover:text-[#00288e] transition-colors">
                    {loc}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar Trust Card */}
      <div className="bg-[#eff4ff] p-4 sm:p-5 rounded-xl border border-blue-100/80 text-slate-900 flex flex-col gap-1.5 shadow-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#006a61] shrink-0" />
          <span className="font-bold text-sm text-slate-900">Direct From Employers</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Every job on Vakancy.in is verified and published by real employers or authorized hiring partners.
        </p>
      </div>
    </div>
  );

  return (
    <div className="w-full bg-[#f8f9ff] min-h-screen text-slate-900">
      {/* 1. STICKY SUB-HEADER SEARCH MATRIX */}
      <section className="sticky top-16 z-30 w-full bg-white shadow-xs py-2.5 sm:py-3 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <form
            onSubmit={handleUpdateSearch}
            className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#eff4ff] p-1.5 sm:p-2 rounded-xl border border-blue-100"
          >
            {/* Search Fields Group */}
            <div className="grid grid-cols-1 md:grid-cols-3 flex-1 divide-y md:divide-y-0 md:divide-x divide-slate-200/60">
              {/* Role / Skill / Keyword Input with Autocomplete */}
              <div
                ref={keywordContainerRef}
                className="relative flex items-center gap-2.5 px-3 py-1.5 bg-white rounded-lg md:rounded-r-none border border-slate-200/50 md:border-transparent"
              >
                <Search className="w-4 h-4 text-[#00288e] shrink-0" />
                <div className="flex flex-col w-full min-w-0">
                  <label htmlFor="role-search-input" className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider leading-tight">
                    Role / Skill / Keyword
                  </label>
                  <input
                    id="role-search-input"
                    type="text"
                    autoComplete="off"
                    value={roleQuery}
                    onChange={(e) => setRoleQuery(e.target.value)}
                    onFocus={() => {
                      if (keywordSuggestions.length > 0) setShowKeywordDropdown(true);
                    }}
                    onKeyDown={handleKeywordKeyDown}
                    placeholder="e.g. React Developer, Node.js, Python"
                    className="w-full bg-transparent text-slate-900 font-semibold text-xs sm:text-sm focus:outline-none placeholder:text-slate-400 truncate"
                  />
                </div>

                {/* Autocomplete Dropdown Popover */}
                {showKeywordDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-200/90 z-50 overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {isKeywordLoading ? (
                      <div className="p-3 text-xs text-slate-500 flex items-center justify-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-[#00288e] border-t-transparent rounded-full animate-spin"></span>
                        <span>Searching suggestions...</span>
                      </div>
                    ) : keywordSuggestions.length === 0 ? (
                      <div className="p-3 text-xs text-slate-400 text-center">
                        No matching roles, skills, or keywords
                      </div>
                    ) : (
                      keywordSuggestions.map((item, idx) => (
                        <div
                          key={idx}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectKeyword(item);
                          }}
                          className={`px-3.5 py-2.5 flex items-center justify-between text-xs sm:text-sm cursor-pointer transition-colors ${
                            idx === activeKeywordIndex ? 'bg-blue-50 text-[#00288e] font-semibold' : 'text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          <span className="truncate">{item.text || item}</span>
                          {item.type && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                              item.type === 'role' ? 'bg-blue-100/70 text-[#1e40af]' :
                              item.type === 'skill' ? 'bg-emerald-100/70 text-emerald-800' :
                              'bg-purple-100/70 text-purple-800'
                            }`}>
                              {item.type}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Location Input with Autocomplete */}
              <div
                ref={locationContainerRef}
                className="relative flex items-center gap-2.5 px-3 py-1.5 bg-white border border-slate-200/50 md:border-transparent"
              >
                <MapPin className="w-4 h-4 text-[#006a61] shrink-0" />
                <div className="flex flex-col w-full min-w-0">
                  <label htmlFor="location-search-input" className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider leading-tight">
                    Location
                  </label>
                  <input
                    id="location-search-input"
                    type="text"
                    autoComplete="off"
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    onFocus={() => {
                      if (locationSuggestions.length > 0) setShowLocationDropdown(true);
                    }}
                    onKeyDown={handleLocationKeyDown}
                    placeholder="City, state, or Remote"
                    className="w-full bg-transparent text-slate-900 font-semibold text-xs sm:text-sm focus:outline-none placeholder:text-slate-400 truncate"
                  />
                </div>

                {/* Location Autocomplete Dropdown Popover */}
                {showLocationDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-200/90 z-50 overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {isLocationLoading ? (
                      <div className="p-3 text-xs text-slate-500 flex items-center justify-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-[#006a61] border-t-transparent rounded-full animate-spin"></span>
                        <span>Searching locations...</span>
                      </div>
                    ) : locationSuggestions.length === 0 ? (
                      <div className="p-3 text-xs text-slate-400 text-center">
                        No matching locations found
                      </div>
                    ) : (
                      locationSuggestions.map((loc, idx) => (
                        <div
                          key={idx}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectLocation(loc);
                          }}
                          className={`px-3.5 py-2.5 flex items-center gap-2 text-xs sm:text-sm cursor-pointer transition-colors ${
                            idx === activeLocationIndex ? 'bg-teal-50 text-[#006a61] font-semibold' : 'text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{loc}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Experience Select */}
              <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white rounded-lg md:rounded-l-none border border-slate-200/50 md:border-transparent">
                <Briefcase className="w-4 h-4 text-slate-500 shrink-0" />
                <div className="flex flex-col w-full min-w-0">
                  <label htmlFor="experience-select-input" className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider leading-tight">
                    Experience
                  </label>
                  <select
                    id="experience-select-input"
                    value={experienceQuery}
                    onChange={(e) => setExperienceQuery(e.target.value)}
                    className="w-full bg-transparent text-slate-900 font-semibold text-xs sm:text-sm focus:outline-none cursor-pointer truncate"
                  >
                    <option value="">All Experience Levels</option>
                    <option value="0 - 2 Years">0 - 2 Years (Entry Level)</option>
                    <option value="3 - 5 Years">3 - 5 Years (Mid Level)</option>
                    <option value="6 - 9 Years">6 - 9 Years (Senior)</option>
                    <option value="10+ Years">10+ Years (Lead / Director)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Right Action Cluster */}
            <div className="flex flex-wrap items-center gap-2 justify-between lg:justify-end">
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mr-1">
                  Quick:
                </span>
                {['₹15L+', '₹25L+', '₹50L+'].map((pill) => (
                  <button
                    key={pill}
                    type="button"
                    onClick={() => {
                      const newPill = quickSalary === pill ? null : pill;
                      setQuickSalary(newPill);
                      if (newPill === '₹15L+') setSelectedCtcRanges(['₹15 - 25 Lakhs', '₹25 - 50 Lakhs', '₹50 Lakhs+']);
                      else if (newPill === '₹25L+') setSelectedCtcRanges(['₹25 - 50 Lakhs', '₹50 Lakhs+']);
                      else if (newPill === '₹50L+') setSelectedCtcRanges(['₹50 Lakhs+']);
                      else setSelectedCtcRanges([]);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all shadow-xs ${
                      quickSalary === pill
                        ? 'bg-[#00288e] text-white'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80'
                    }`}
                  >
                    {pill}
                  </button>
                ))}
              </div>

              {/* Mobile Filter Trigger Button */}
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(true)}
                className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-semibold shadow-xs hover:bg-slate-50"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#00288e]" />
                <span>Filters ({activeFilters.length})</span>
              </button>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#00288e] hover:bg-[#1e40af] text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors cursor-pointer w-full sm:w-auto"
              >
                <span>Search Jobs</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* 2. BREADCRUMB (Clean Navigation - Vacancy Indicator Removed) */}
      <div className="w-full bg-[#eff4ff] py-2.5 border-b border-blue-100/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-medium">
            <Link to="/" className="hover:text-[#00288e] transition-colors">
              Home
            </Link>
            <span className="text-slate-400">/</span>
            <span className="hover:text-[#00288e] cursor-pointer">Jobs</span>
            <span className="text-slate-400">/</span>
            <span className="text-slate-900 font-bold truncate max-w-xs sm:max-w-md">
              {roleQuery ? `"${roleQuery}"` : 'All Openings'}{locationQuery ? ` in ${locationQuery}` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* 3. PRIMARY 2-COLUMN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT SIDEBAR FILTERS (Desktop) */}
          <aside className="hidden lg:flex lg:col-span-4 xl:col-span-3 flex-col gap-5 sticky top-36">
            <FilterPanelContent />
          </aside>

          {/* RIGHT RESULTS PANE */}
          <main className="lg:col-span-8 xl:col-span-9 flex flex-col gap-4 w-full">
            {/* Results Toolbar & Controls */}
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-col">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 font-heading tracking-tight">
                  Showing {totalJobs.toLocaleString()} {totalJobs === 1 ? 'Job' : 'Jobs'}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {roleQuery ? `Opportunities matching "${roleQuery}"` : 'All live opportunities currently open for application'}
                </p>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-auto">
                {/* Custom Sort Selector */}
                <div className="relative" ref={sortRef}>
                  <button
                    type="button"
                    onClick={() => setIsSortOpen((prev) => !prev)}
                    onKeyDown={handleSortKeyDown}
                    aria-haspopup="listbox"
                    aria-expanded={isSortOpen}
                    aria-label={`Sort by: ${sortBy}`}
                    className={`inline-flex items-center gap-1.5 bg-white border ${
                      isSortOpen
                        ? 'border-[#00288e] ring-2 ring-[#00288e]/15'
                        : 'border-slate-200/90 hover:border-slate-300'
                    } px-3 py-1.5 rounded-lg shadow-2xs text-xs font-medium text-slate-700 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00288e]/20 cursor-pointer`}
                  >
                    <span className="text-slate-500 font-normal">Sort by:</span>
                    <span className="font-bold text-slate-900">{sortBy}</span>
                    {isSortOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-0.5" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-0.5" aria-hidden="true" />
                    )}
                  </button>

                  {/* Floating Popover Overlay */}
                  {isSortOpen && (
                    <div
                      role="listbox"
                      aria-label="Sort options"
                      className="absolute right-0 sm:left-0 mt-1.5 w-54 bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-900/10 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100"
                    >
                      {SORT_OPTIONS.map((option) => {
                        const isSelected = sortBy === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              setSortBy(option);
                              setCurrentPage(1);
                              setIsSortOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold transition-colors text-left cursor-pointer ${
                              isSelected
                                ? 'bg-[#EFF6FF] text-[#00288e]'
                                : 'text-slate-700 hover:bg-[#F8FAFC] hover:text-slate-900'
                            }`}
                          >
                            <span>{option}</span>
                            {isSelected && (
                              <Check className="w-4 h-4 text-[#00288e] shrink-0" aria-hidden="true" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* View Toggle */}
                <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setViewMode('detailed')}
                    className={`p-1 rounded transition-colors ${
                      viewMode === 'detailed'
                        ? 'bg-white text-[#00288e] shadow-xs'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                    title="Detailed List View"
                  >
                    <LayoutList className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('compact')}
                    className={`p-1 rounded transition-colors ${
                      viewMode === 'compact'
                        ? 'bg-white text-[#00288e] shadow-xs'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                    title="Compact Density View"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {isLoading ? (
              <div className="flex flex-col gap-4">
                <LoadingSkeleton count={3} variant="card" className="h-44 bg-slate-200/70 rounded-xl" />
              </div>
            ) : jobs.length === 0 ? (
              /* Empty State */
              <EmptyState
                title="No matching jobs found"
                description="We couldn't find any published positions matching your search or active filters. Try adjusting your query or resetting filters."
                actionLabel="Reset All Filters"
                onAction={handleClearAll}
              />
            ) : (
              /* Job Listings */
              <div
                className={
                  viewMode === 'detailed'
                    ? 'flex flex-col gap-4'
                    : 'grid grid-cols-1 md:grid-cols-2 gap-4'
                }
              >
                {jobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    variant={viewMode === 'detailed' ? 'search' : 'default'}
                    isSaved={savedJobIds.has(String(job.id))}
                    onToggleSave={handleToggleSave}
                  />
                ))}
              </div>
            )}

            {/* JOB ALERTS INLINE WIDGET */}
            <section className="bg-[#eff4ff] p-5 sm:p-6 rounded-xl border border-blue-100 text-slate-900 flex flex-col md:flex-row items-center justify-between gap-5 shadow-xs mt-2">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-full bg-white text-[#00288e] shrink-0 shadow-xs border border-blue-100">
                  <Bell className="w-6 h-6 text-[#00288e]" />
                </div>
                <div className="flex flex-col">
                  <h3 className="font-bold text-base text-slate-900">
                    Get customized job alerts in your inbox
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Receive real-time notifications when new positions matching your preferences are published.
                  </p>
                </div>
              </div>

              <form onSubmit={handleAlertSubmit} className="flex items-center w-full md:w-auto gap-2">
                <input
                  type="email"
                  required
                  value={alertEmail}
                  onChange={(e) => setAlertEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="px-3.5 py-2 rounded-lg bg-white text-slate-900 text-xs focus:outline-none placeholder:text-slate-400 w-full md:w-60 border border-slate-200/80 shadow-inner"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#00288e] hover:bg-[#1e40af] text-white text-xs font-semibold transition-colors shrink-0 shadow-xs cursor-pointer"
                >
                  {alertSuccess ? 'Subscribed!' : 'Activate Alert'}
                </button>
              </form>
            </section>

            {/* STRUCTURED PAGINATION ENGINE */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => {
                  setCurrentPage(page);
                  window.scrollTo({ top: 120, behavior: 'smooth' });
                }}
              />
            )}
          </main>
        </div>
      </div>

      {/* MOBILE FILTER DRAWER */}
      <Drawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        title="Search Filters"
        width="max-w-md"
      >
        <div className="pb-6">
          <FilterPanelContent />
          <div className="sticky bottom-0 bg-white pt-4 mt-6 border-t border-slate-200 flex gap-3">
            <button
              type="button"
              onClick={handleClearAll}
              className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Reset All
            </button>
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(false)}
              className="flex-1 py-2.5 rounded-lg bg-[#00288e] text-white text-xs font-semibold hover:bg-[#1e40af] transition-colors shadow-xs"
            >
              Show Results
            </button>
          </div>
        </div>
      </Drawer>

      {/* ALL JOB CATEGORIES MODAL (4-Column Desktop Grid) */}
      {isCategoryModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="all-categories-title"
          onClick={() => setIsCategoryModalOpen(false)}
        >
          <div
            className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 sm:p-6 md:p-7 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex flex-col gap-1 pr-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#00288e]">
                    <LayoutGrid className="w-4 h-4 text-[#00288e]" />
                  </div>
                  <h2 id="all-categories-title" className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                    All Job Categories
                  </h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#eff4ff] text-[#00288e] border border-blue-200">
                    {categories.length} Categories
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Browse and select a job category to filter matching career opportunities across Vakancy.in
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00288e]"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="py-3.5 shrink-0">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={categoryModalSearch}
                  onChange={(e) => setCategoryModalSearch(e.target.value)}
                  placeholder="Search categories (e.g. DevOps, Software, Marketing, Finance)..."
                  className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00288e] focus:bg-white transition-all font-medium"
                  autoFocus
                />
                {categoryModalSearch && (
                  <button
                    type="button"
                    onClick={() => setCategoryModalSearch('')}
                    className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label="Clear category search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Modal Body: 4-Column Responsive Grid */}
            <div className="overflow-y-auto flex-1 py-1 pr-1 sm:pr-2">
              {isCategoriesLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 py-4">
                  {Array.from({ length: 16 }).map((_, idx) => (
                    <div key={idx} className="h-14 bg-slate-100 rounded-xl animate-pulse"></div>
                  ))}
                </div>
              ) : categoriesError ? (
                <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                    <X className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-rose-800">{categoriesError}</p>
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : (
                (() => {
                  const filtered = categories.filter((c) =>
                    c.name.toLowerCase().includes(categoryModalSearch.toLowerCase().trim())
                  );

                  if (filtered.length === 0) {
                    return (
                      <div className="py-12 text-center flex flex-col items-center justify-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                          <Search className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-semibold text-slate-700">No categories matching "{categoryModalSearch}"</p>
                        <p className="text-xs text-slate-400">Try searching for a different keyword or clear your query.</p>
                        <button
                          type="button"
                          onClick={() => setCategoryModalSearch('')}
                          className="mt-2 text-xs font-semibold text-[#00288e] hover:underline"
                        >
                          Clear search
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
                      {filtered.map((cat) => {
                        const isSelected = selectedCategory === cat.name || selectedCategory === cat.id;
                        return (
                          <button
                            key={cat.id || cat.name}
                            type="button"
                            onClick={() => handleSelectCategory(cat)}
                            className={`flex items-center justify-between p-3 sm:p-3.5 rounded-xl border text-left transition-all cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00288e] ${
                              isSelected
                                ? 'border-[#00288e] bg-[#eff4ff] text-[#00288e] font-bold shadow-xs ring-1 ring-[#00288e]'
                                : 'border-slate-200/90 bg-white hover:border-blue-300 hover:bg-blue-50/30 text-slate-800'
                            }`}
                          >
                            <span className="text-xs sm:text-sm font-medium leading-snug line-clamp-2">
                              {cat.name}
                            </span>
                            <span
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-2 transition-colors ${
                                isSelected
                                  ? 'border-[#00288e] bg-[#00288e] text-white'
                                  : 'border-slate-300 group-hover:border-[#00288e]'
                              }`}
                            >
                              {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 mt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-500 text-center sm:text-left">
                {selectedCategory ? (
                  <span className="flex items-center gap-1.5">
                    <span className="text-slate-600">Selected:</span>
                    <strong className="text-[#00288e] font-semibold">{selectedCategory}</strong>
                    <button
                      type="button"
                      onClick={() => handleSelectCategory(selectedCategory)}
                      className="text-xs text-slate-400 hover:text-rose-600 transition-colors ml-1 font-medium underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </span>
                ) : (
                  <span>Click any category card to apply the filter.</span>
                )}
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GUEST AUTHENTICATION PROMPT MODAL */}
      {showAuthModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
          onClick={() => {
            setShowAuthModal(false);
            setPendingSaveJobId(null);
          }}
        >
          <div
            className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-7 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                setShowAuthModal(false);
                setPendingSaveJobId(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Bookmark Icon */}
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-[#00288e] flex items-center justify-center mb-4">
              <Bookmark className="w-6 h-6 text-[#00288e]" />
            </div>

            {/* Title & Description */}
            <h3 id="auth-modal-title" className="text-xl font-bold text-[#0f172a] mb-2 tracking-tight">
              Sign in to save jobs
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Create an account or sign in to save this job and access it later from your saved jobs.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const currentQuery = searchParams.toString();
                  const base = '/jobs' + (currentQuery ? `?${currentQuery}` : '');
                  const redirectPath = pendingSaveJobId
                    ? `${base}${base.includes('?') ? '&' : '?'}saveJobId=${pendingSaveJobId}`
                    : base;
                  navigate(`/login?role=candidate&redirect=${encodeURIComponent(redirectPath)}`);
                }}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white text-sm font-bold text-center transition-colors shadow-xs cursor-pointer"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  const currentQuery = searchParams.toString();
                  const base = '/jobs' + (currentQuery ? `?${currentQuery}` : '');
                  const redirectPath = pendingSaveJobId
                    ? `${base}${base.includes('?') ? '&' : '?'}saveJobId=${pendingSaveJobId}`
                    : base;
                  navigate(`/register/candidate?redirect=${encodeURIComponent(redirectPath)}`);
                }}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold text-center transition-colors shadow-2xs cursor-pointer"
              >
                Register
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-3 duration-200">
          <Toast
            type={toast.type}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </div>
  );
};

export default JobSearchPage;
