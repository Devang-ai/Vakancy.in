import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  CheckCircle2,
  Bookmark,
  Share2,
  ArrowRight,
  Flame,
  Zap,
  Star,
  Activity,
  Workflow,
  Network,
  Terminal,
  Award,
  IndianRupee,
  Building2,
  ArrowUpRight,
  Send,
  UploadCloud,
  Lock,
  Clock,
  Check,
  ShieldCheck,
  TrendingUp,
  Briefcase,
  MapPin,
  Users,
  Calendar,
  Layers,
  Sparkles,
  ArrowLeft,
  Loader2,
  X,
} from 'lucide-react';
import jobService from '../../services/jobService';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import EmptyState from '../../components/ui/EmptyState';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import SystemStatusIndicator from '../../components/common/SystemStatusIndicator';

/**
 * Format salary to full annual Indian amount (e.g. ₹5,00,000 – ₹7,00,000 / year)
 */
export const formatAnnualSalary = (job) => {
  if (!job) return 'Competitive';

  // 1. Check numeric min_salary and max_salary from database
  const rawMin = job.min_salary !== undefined && job.min_salary !== null ? parseFloat(job.min_salary) : null;
  const rawMax = job.max_salary !== undefined && job.max_salary !== null ? parseFloat(job.max_salary) : null;

  if (rawMin !== null && rawMax !== null && !isNaN(rawMin) && !isNaN(rawMax) && (rawMin > 0 || rawMax > 0)) {
    if (rawMin > 0 && rawMax > 0) {
      if (rawMin === rawMax) {
        return `₹${Math.round(rawMin).toLocaleString('en-IN')} / year`;
      }
      return `₹${Math.round(rawMin).toLocaleString('en-IN')} – ₹${Math.round(rawMax).toLocaleString('en-IN')} / year`;
    }
    if (rawMin > 0) {
      return `₹${Math.round(rawMin).toLocaleString('en-IN')} / year`;
    }
    if (rawMax > 0) {
      return `₹${Math.round(rawMax).toLocaleString('en-IN')} / year`;
    }
  }

  // 2. Parse string salaryRange or salary
  const str = String(job.salaryRange || job.salary || '').trim();
  if (!str || str.toLowerCase() === 'competitive' || str.toLowerCase() === 'not disclosed') {
    return 'Competitive';
  }

  // Parse LPA (e.g. "5 - 7 LPA", "₹5 - ₹7 LPA", "5 LPA – 7 LPA", "8 LPA", "?5 - ?7 LPA")
  const lpaMatch = str.match(/(?:₹|\?|INR)?\s*(\d+(?:\.\d+)?)\s*(?:LPA)?\s*(?:[-–—to\s]+(?:₹|\?|INR)?\s*(\d+(?:\.\d+)?))?\s*LPA/i);
  if (lpaMatch) {
    const num1 = parseFloat(lpaMatch[1]);
    const num2 = lpaMatch[2] ? parseFloat(lpaMatch[2]) : null;

    if (!isNaN(num1)) {
      const val1 = Math.round(num1 * 100000);
      if (num2 !== null && !isNaN(num2)) {
        const val2 = Math.round(num2 * 100000);
        return `₹${val1.toLocaleString('en-IN')} – ₹${val2.toLocaleString('en-IN')} / year`;
      }
      return `₹${val1.toLocaleString('en-IN')} / year`;
    }
  }

  // Parse raw number range (e.g. "500000 - 700000")
  const rawNumMatch = str.match(/(?:₹|\?|INR)?\s*(\d{5,8})\s*(?:[-–—to\s]+(?:₹|\?|INR)?\s*(\d{5,8}))?/);
  if (rawNumMatch) {
    const n1 = parseInt(rawNumMatch[1], 10);
    const n2 = rawNumMatch[2] ? parseInt(rawNumMatch[2], 10) : null;
    if (!isNaN(n1)) {
      if (n2 !== null && !isNaN(n2)) {
        return `₹${n1.toLocaleString('en-IN')} – ₹${n2.toLocaleString('en-IN')} / year`;
      }
      return `₹${n1.toLocaleString('en-IN')} / year`;
    }
  }

  if (str.toLowerCase().includes('/ year') || str.toLowerCase().includes('/year')) {
    return str.replace(/^[?]/, '₹').replace(/\s[?]/, ' ₹');
  }

  return `${str.replace(/^[?]/, '₹').replace(/\s[?]/, ' ₹')} / year`;
};

export const JobDetailsPage = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [job, setJob] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalReason, setAuthModalReason] = useState('save'); // 'save' | 'apply' | 'upload_cv'
  const [toast, setToast] = useState(null);
  const [copiedToast, setCopiedToast] = useState(false);
  const [selectedToken, setSelectedToken] = useState('Distributed Systems');

  // Application flow states
  const [isApplying, setIsApplying] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const [customCvName, setCustomCvName] = useState(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Check saved status for authenticated candidate
  useEffect(() => {
    let isMounted = true;
    const checkSavedStatus = async () => {
      if (!user || user.role !== 'candidate') {
        setIsSaved(false);
        return;
      }
      try {
        const res = await API.get('/candidates/me/saved-jobs');
        if (isMounted && res?.success && Array.isArray(res.savedJobs)) {
          const found = res.savedJobs.some((j) => String(j.jobId || j.id) === String(id));
          setIsSaved(found);
        }
      } catch (err) {
        // silent fail
      }
    };
    checkSavedStatus();
    return () => {
      isMounted = false;
    };
  }, [user, id]);

  // Handle post-login actions (save, apply, upload_cv)
  useEffect(() => {
    if (!user || user.role !== 'candidate') return;

    const action = searchParams.get('action');
    const saveJobIdParam = searchParams.get('saveJobId');

    if (saveJobIdParam && String(saveJobIdParam) === String(id)) {
      handleSaveJob();
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('saveJobId');
      setSearchParams(newParams, { replace: true });
    } else if (action === 'apply') {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('action');
      setSearchParams(newParams, { replace: true });
      scrollToApplication();
      setToast({
        type: 'info',
        message: 'Welcome back! You can now proceed with your application.',
      });
    } else if (action === 'upload_cv') {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('action');
      setSearchParams(newParams, { replace: true });
      scrollToApplication();
      setToast({
        type: 'info',
        message: 'Welcome back! Select your CV to upload.',
      });
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 400);
    }
  }, [user, searchParams, id]);

  useEffect(() => {
    let isMounted = true;
    const fetchJobData = async () => {
      setIsLoading(true);
      try {
        const data = await jobService.getJobById(id);
        if (isMounted) {
          setJob(data);
        }
      } catch (err) {
        console.warn('Error fetching job details:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchJobData();
    window.scrollTo(0, 0);
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Handle Share action
  const handleShare = () => {
    if (navigator.share && job) {
      navigator
        .share({
          title: `${job.title} at ${job.company}`,
          text: `Review this high-scale opening on Vakancy.in: ${job.title}`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 3000);
    }
  };

  // Handle Apply flow (Guest interception & Candidate portal routing)
  const handleApplySubmit = (e) => {
    e.preventDefault();
    if (!user) {
      // Trigger guest auth prompt modal preserving job context & intent
      setAuthModalReason('apply');
      setShowAuthModal(true);
      return;
    }

    if (user.role === 'employer' || user.role === 'recruiter') {
      alert('Employer accounts cannot submit job applications. Please log in with a candidate account to apply.');
      return;
    }

    // Authenticated candidate: navigate directly into Candidate Application Wizard
    navigate(`/candidate/jobs/${id}/apply`);
  };

  // Handle file upload trigger
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomCvName(file.name);
    }
  };

  // Handle Save Job with strict guest authentication check & candidate API integration
  const handleSaveJob = async () => {
    if (!user) {
      setAuthModalReason('save');
      setShowAuthModal(true);
      return;
    }

    if (user.role !== 'candidate') {
      setToast({
        type: 'info',
        message: 'Only candidate accounts can save jobs.',
      });
      return;
    }

    if (isSaving) return;
    setIsSaving(true);

    try {
      if (isSaved) {
        const res = await API.delete(`/candidates/me/saved-jobs/${id}`);
        if (res?.success) {
          setIsSaved(false);
          setToast({
            type: 'info',
            message: 'Job removed from saved jobs.',
          });
          window.dispatchEvent(new Event('vakancy:candidate-counts-update'));
        }
      } else {
        const res = await API.post('/candidates/me/saved-jobs', { job_id: id });
        if (res?.success) {
          setIsSaved(true);
          setToast({
            type: 'success',
            message: 'Job saved successfully.',
          });
          window.dispatchEvent(new Event('vakancy:candidate-counts-update'));
        }
      }
    } catch (err) {
      if (err?.response?.status === 401 || err?.status === 401) {
        setShowAuthModal(true);
      } else {
        setToast({
          type: 'error',
          message: err?.message || 'Unable to update saved job status.',
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Scroll smoothly to application card
  const scrollToApplication = (e) => {
    e.preventDefault();
    const el = document.getElementById('applicationPane');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="w-full bg-[#f8f9ff] min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <LoadingSkeleton variant="text" className="w-64 h-5 bg-slate-200" />
          <LoadingSkeleton variant="card" className="h-64 bg-slate-200/80 rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <LoadingSkeleton variant="card" className="h-56 bg-slate-200/80 rounded-xl" />
              <LoadingSkeleton variant="card" className="h-56 bg-slate-200/80 rounded-xl" />
            </div>
            <div className="lg:col-span-4 space-y-6">
              <LoadingSkeleton variant="card" className="h-80 bg-slate-200/80 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Job Not Found State
  if (!job) {
    return (
      <div className="w-full bg-[#f8f9ff] min-h-[60vh] flex items-center justify-center py-16 px-4">
        <EmptyState
          title="Job Listing Not Found"
          description={`The position (ID: ${id}) may have been fulfilled, expired, or is currently unlisted.`}
          actionLabel="Explore Active Vacancies"
          onAction={() => navigate('/jobs')}
        />
      </div>
    );
  }

  const {
    title,
    company_name: company = '',
    department = 'General',
    job_domain: domain = 'General',
    experience = 'Not specified',
    location = '',
    locations = [],
    workplaceType = 'On-site',
    vacancies = '1 Opening',
    postedAgo = 'Recently',
    description = '',
    responsibilities = [],
    skills = [],
    qualifications = [],
    perks = [],
    company_about = ''
  } = job || {};

  const formattedSalary = formatAnnualSalary(job);
  const displayLocations = locations && locations.length > 0 ? locations : [location];

  return (
    <div className="w-full bg-[#f8f9ff] min-h-screen text-slate-900 pb-16">
      {/* Toast Notification */}
      {copiedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#00288e] text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Job listing link copied to clipboard!</span>
        </div>
      )}

      {/* 1. BREADCRUMB TELEMETRY STRIP */}
      <div className="w-full bg-[#eff4ff] py-2.5 border-b border-blue-100/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 font-medium"
          >
            <Link to="/" className="hover:text-[#00288e] transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Link to="/jobs" className="hover:text-[#00288e] transition-colors">
              Jobs
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Link
              to={`/jobs?search=${department}`}
              className="hover:text-[#00288e] transition-colors"
            >
              {department}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-900 font-bold truncate max-w-xs sm:max-w-md">
              {title} ({company})
            </span>
          </nav>
        </div>
      </div>

      {/* 2. MAIN CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full">
        {/* HERO JOB HEADER CARD */}
        <div className="bg-white rounded-xl p-5 sm:p-8 border border-slate-200/80 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            {/* Left: Avatar & Title Block */}
            <div className="flex items-start gap-4 sm:gap-5 min-w-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[#00288e] flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-sm shrink-0 tracking-wider">
                {company?.slice(0, 2).toUpperCase()}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                {/* Badges Row */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
                    Job ID: {job.id}
                  </span>
                </div>

                {/* Job Title */}
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight mt-1 font-heading">
                  {title}
                </h1>

                {/* Company & Meta line */}
                <div className="flex flex-wrap items-center gap-2 text-slate-500 text-xs sm:text-sm mt-0.5">
                  <Link
                    to={`/jobs?search=${company}`}
                    className="font-bold text-[#00288e] hover:underline"
                  >
                    {company}
                  </Link>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-600">{domain}</span>
                </div>
              </div>
            </div>

            {/* Right: Actions Cluster */}
            <div className="flex flex-wrap items-center gap-2.5 lg:self-start shrink-0">
              {/* Save Job */}
              <button
                type="button"
                onClick={handleSaveJob}
                disabled={isSaving}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-lg border transition-all cursor-pointer ${
                  isSaved
                    ? 'bg-blue-50 border-blue-200 text-[#00288e]'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#00288e]' : ''}`} />
                <span>{isSaved ? 'Saved' : 'Save Job'}</span>
              </button>

              {/* Share */}
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-slate-500" />
                <span>Share</span>
              </button>

              {/* Apply Now Scroll Anchor */}
              <a
                href="#applicationPane"
                onClick={scrollToApplication}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-lg bg-[#00288e] text-white hover:bg-[#1e40af] transition-all shadow-sm cursor-pointer"
              >
                <span>Apply Now</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Metadata Metrics Band */}
          <div className="mt-6 pt-4 bg-[#eff4ff] rounded-xl p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-y-3 gap-x-4 text-xs border border-blue-100/80">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">
                Experience
              </span>
              <span className="text-sm font-bold text-slate-900 mt-0.5">{experience}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">
                Salary CTC
              </span>
              <span className="text-sm font-bold text-[#006a61] mt-0.5">{formattedSalary}</span>
            </div>
            <div className="flex flex-col col-span-2 sm:col-span-1 lg:col-span-2">
              <span className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">
                Location
              </span>
              <div className="mt-0.5 text-xs sm:text-sm font-bold text-slate-900 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                {displayLocations.map((loc, idx) => (
                  <React.Fragment key={idx}>
                    <span>{loc}</span>
                    {idx < displayLocations.length - 1 && (
                      <span className="text-slate-400 font-normal select-none">·</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">
                Work Mode
              </span>
              <span className="text-sm font-bold text-slate-900 mt-0.5">{workplaceType}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">
                Vacancies
              </span>
              <span className="text-sm font-bold text-slate-900 mt-0.5">{vacancies}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">
                Posted Date
              </span>
              <span className="text-sm font-bold text-slate-900 mt-0.5">{postedAgo}</span>
            </div>
          </div>
        </div>

        {/* 3. PRIMARY 2-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start">
          {/* LEFT CONTENT COLUMN (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6 w-full">
            {/* Role Overview Card */}
            {description && (
              <section className="bg-white rounded-xl p-6 sm:p-7 border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <Workflow className="w-5 h-5 text-[#00288e]" />
                  <h2 className="text-lg font-bold text-slate-900 font-heading">Role Overview</h2>
                </div>
                <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {description}
                </div>
              </section>
            )}

            {/* Key Responsibilities Card */}
            <section className="bg-white rounded-xl p-6 sm:p-7 border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <Network className="w-5 h-5 text-[#00288e]" />
                <h2 className="text-lg font-bold text-slate-900 font-heading">Key Architectural Responsibilities</h2>
              </div>
              <ul className="flex flex-col gap-3 text-xs sm:text-sm text-slate-600">
                {responsibilities.map((resp, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00288e] mt-0.5 shrink-0" />
                    <div>
                      <strong className="text-slate-900 font-semibold">{resp.title}: </strong>
                      <span>{resp.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Required Core Stack & Competencies Card */}
            {skills && skills.length > 0 && (
              <section className="bg-white rounded-xl p-6 sm:p-7 border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-[#00288e]" />
                    <h2 className="text-lg font-bold text-slate-900 font-heading">Required Core Stack &amp; Competencies</h2>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {skills.map((token, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200/60"
                    >
                      {token}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Preferred Qualifications Card */}
            <section className="bg-white rounded-xl p-6 sm:p-7 border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-[#00288e]" />
                <h2 className="text-lg font-bold text-slate-900 font-heading">Preferred Qualifications</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-600">
                {qualifications.map((q, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <Award className="w-4 h-4 text-[#006a61] mt-0.5 shrink-0" />
                    <div>
                      <strong className="text-slate-900 font-semibold">{q.category}: </strong>
                      <span>{q.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Compensation, Equity & Perks Card */}
            {perks && perks.length > 0 && (
              <section className="bg-white rounded-xl p-6 sm:p-7 border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <IndianRupee className="w-5 h-5 text-[#00288e]" />
                  <h2 className="text-lg font-bold text-slate-900 font-heading">Compensation, Equity &amp; Perks</h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mb-4">
                  Offered perks and benefits curated for this opening to support employee wellbeing and professional growth.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {perks.map((p, idx) => {
                    const title = typeof p === 'string' ? p : p.title;
                    const desc = typeof p === 'string' ? 'Company-provided benefit' : (p.desc || 'Standard company benefit');
                    return (
                      <div key={idx} className="p-4 bg-[#eff4ff] rounded-lg border border-blue-100">
                        <h3 className="font-bold text-xs sm:text-sm text-slate-900 mb-1 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#00288e]" />
                          {title}
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed">{desc}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* About The Employer Card */}
            {company_about && (
              <section className="bg-white rounded-xl p-6 sm:p-7 border border-slate-200/80 shadow-xs">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                      About The Employer
                    </span>
                    <h2 className="text-lg font-bold text-slate-900">{company}</h2>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {company_about}
                </p>
              </section>
            )}
          </div>

          {/* RIGHT SIDEBAR / APPLICATION PANE (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-5 sticky top-24 w-full" id="applicationPane">
            {/* Card 1: Offered Package & Apply CTA */}
            <div className="bg-white rounded-2xl p-6 sm:p-6 border border-slate-200/90 shadow-sm transition-shadow hover:shadow-md">
              {/* Header: Label & Salary */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Offered Package
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight font-heading mt-1">
                  {formattedSalary}
                </div>
              </div>

              {/* Minimalist Divider */}
              <div className="border-t border-slate-100 my-4" />

              {/* Apply Action Form */}
              <form onSubmit={handleApplySubmit} className="flex flex-col gap-2.5">
                <button
                  type="submit"
                  disabled={isApplying || isApplied}
                  className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isApplied
                      ? 'bg-[#006a61] text-white cursor-default'
                      : 'bg-[#00288e] hover:bg-[#1e40af] text-white active:scale-[0.99]'
                  }`}
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Processing Application...</span>
                    </>
                  ) : isApplied ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>Application Dispatched</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Apply with Vakancy.in Profile</span>
                    </>
                  )}
                </button>

                {/* Upload Custom CV */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      setAuthModalReason('upload_cv');
                      setShowAuthModal(true);
                      return;
                    }
                    fileInputRef.current?.click();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-[#eff4ff] hover:text-[#00288e] hover:border-blue-200 text-slate-700 text-xs font-semibold transition-all flex items-center justify-center gap-2 border border-slate-200/80 cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {customCvName ? `CV: ${customCvName}` : 'Upload Custom CV (.pdf, .docx)'}
                  </span>
                </button>
              </form>

              {/* Success Notification */}
              {isApplied && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-150">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Application submitted directly to the employer.</span>
                </div>
              )}

              {/* Trust Indicators */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-slate-500 text-[11px] font-medium">
                <span className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-[#006a61] shrink-0" /> Free to Apply
                </span>
                <span className="text-slate-300 font-normal select-none">•</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-slate-400 shrink-0" /> 2-min Process
                </span>
                <span className="text-slate-300 font-normal select-none">•</span>
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-slate-400 shrink-0" /> Encrypted
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Page Bottom System Status & Assurance Bar */}
        <div className="mt-10 pt-5 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00288e]" />
            <span>Verified Vakancy.in Requisition • Direct Employer Application</span>
          </div>
          <SystemStatusIndicator />
        </div>
      </div>

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            toast.type === 'error'
              ? 'bg-red-600'
              : toast.type === 'info'
              ? 'bg-slate-800'
              : 'bg-[#00288e]'
          }`}
        >
          {toast.type === 'error' ? (
            <X className="w-4 h-4 text-white" />
          ) : (
            <Check className="w-4 h-4 text-emerald-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* GUEST AUTHENTICATION PROMPT MODAL */}
      {showAuthModal && (() => {
        const modalConfig = authModalReason === 'apply'
          ? {
              icon: <Send className="w-6 h-6 text-[#00288e]" />,
              title: 'Sign in to apply',
              description: 'Sign in or create an account to apply for this job with your Vakancy.in profile.',
              redirectDestination: `/jobs/${id}?action=apply#applicationPane`,
            }
          : authModalReason === 'upload_cv'
          ? {
              icon: <UploadCloud className="w-6 h-6 text-[#00288e]" />,
              title: 'Sign in to upload CV',
              description: 'Sign in or create an account to upload your CV and apply for this job.',
              redirectDestination: `/jobs/${id}?action=upload_cv#applicationPane`,
            }
          : {
              icon: <Bookmark className="w-6 h-6 text-[#00288e]" />,
              title: 'Sign in to save jobs',
              description: 'Sign in or create an account to save this job and access it later.',
              redirectDestination: `/jobs/${id}?saveJobId=${id}`,
            };

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            onClick={() => setShowAuthModal(false)}
          >
            <div
              className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-7 overflow-hidden animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Action Icon */}
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-[#00288e] flex items-center justify-center mb-4">
                {modalConfig.icon}
              </div>

              {/* Title & Description */}
              <h3 id="auth-modal-title" className="text-xl font-bold text-[#0f172a] mb-2 tracking-tight font-heading">
                {modalConfig.title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                {modalConfig.description}
              </p>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/login?role=candidate&redirect=${encodeURIComponent(modalConfig.redirectDestination)}`);
                  }}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white text-sm font-bold text-center transition-colors shadow-xs cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/register?role=candidate&redirect=${encodeURIComponent(modalConfig.redirectDestination)}`);
                  }}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold text-center transition-colors cursor-pointer"
                >
                  Register
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default JobDetailsPage;
