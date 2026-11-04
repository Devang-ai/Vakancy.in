import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Users,
  UserCheck,
  Building2,
  Building,
  FileText,
  ShieldCheck,
  Layers,
  Sparkles,
  Lock,
  Headphones,
  Award,
  Code2,
  Smartphone,
  TrendingUp,
  PieChart,
  Palette,
  Truck
} from 'lucide-react';
import { JobCard } from '../../components/common/JobCard';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { jobService } from '../../services/jobService';
import { PageTransition, RevealOnScroll, StaggerContainer, StaggerItem, FadeInSection } from '../../components/common/Motion';

export const HomePage = () => {
  const navigate = useNavigate();

  // Search state
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');

  // Data fetching state
  const [featuredJobs, setFeaturedJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setLoadingJobs(true);
        const jobs = await jobService.getFeaturedJobs(6);
        if (isMounted) setFeaturedJobs(jobs || []);
      } catch (err) {
        console.error('Error fetching featured jobs:', err);
      } finally {
        if (isMounted) setLoadingJobs(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, []);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.append('search', keyword.trim());
    if (location.trim()) params.append('location', location.trim());
    const queryString = params.toString();
    navigate(`/jobs${queryString ? `?${queryString}` : ''}`);
  };

  const jobCategories = [
    {
      name: 'Engineering',
      shortLabel: 'Engineering',
      icon: Code2,
      description: 'Backend, Frontend, Full Stack & Cloud Infrastructure roles.',
    },
    {
      name: 'Mobile App Development',
      shortLabel: 'Mobile App',
      icon: Smartphone,
      description: 'iOS, Android, React Native & Flutter engineering roles.',
    },
    {
      name: 'Sales & BD',
      shortLabel: 'Sales & BD',
      icon: TrendingUp,
      description: 'Enterprise sales, account management & business expansion.',
    },
    {
      name: 'Marketing & Growth',
      shortLabel: 'Marketing',
      icon: Sparkles,
      description: 'Performance marketing, brand strategy & content operations.',
    },
    {
      name: 'Finance & Control',
      shortLabel: 'Finance',
      icon: PieChart,
      description: 'Financial analysis, corporate accounting, audit & tax roles.',
    },
    {
      name: 'Product & Design',
      shortLabel: 'Design & UI',
      icon: Palette,
      description: 'Product management, UX/UI design & user research.',
    },
    {
      name: 'Human Resources',
      shortLabel: 'HR & People',
      icon: Users,
      description: 'Talent acquisition, HR operations & people strategy.',
    },
    {
      name: 'Operations & Logistics',
      shortLabel: 'Operations',
      icon: Truck,
      description: 'Supply chain, vendor management & business operations.',
    },
  ];

  const employerCapabilities = [
    {
      icon: Building2,
      title: 'Company Profile',
      description: 'Build an authoritative employer presence showcasing your organization, culture, and active vacancies.',
    },
    {
      icon: FileText,
      title: 'Job Posting',
      description: 'Publish verified job openings with detailed responsibilities, skill expectations, and location terms.',
    },
    {
      icon: Briefcase,
      title: 'Job Management',
      description: 'Edit, update, pause, and monitor incoming applications in a centralized administrative workspace.',
    },
    {
      icon: ShieldCheck,
      title: 'Candidate Database Access',
      description: 'Request access to candidate profiles and resumes through Vakancy.in’s privacy-preserving approval workflow.',
    },
    {
      icon: Headphones,
      title: 'Recruitment Support',
      description: 'Collaborate with our recruitment team when specialized screening or extra hiring coordination is required.',
    },
    {
      icon: Users,
      title: 'Employer Inquiries',
      description: 'Consult directly with our recruitment specialists regarding custom hiring timelines and project requirements.',
    },
  ];

  const candidateSteps = [
    {
      step: '01',
      title: 'Create your profile',
      description: 'Build your professional profile and manage relevant career information, skills, and resume details.',
    },
    {
      step: '02',
      title: 'Find suitable opportunities',
      description: 'Search and filter jobs based on your role preferences, salary expectations, and desired locations.',
    },
    {
      step: '03',
      title: 'Apply and track',
      description: 'Apply directly to verified employers and track your application progress through your candidate dashboard.',
    },
  ];

  return (
    <PageTransition className="w-full bg-[#f8fafc] text-[#0f172a] min-h-screen overflow-x-hidden font-sans">
      
      {/* 1. HERO SECTION (Light Surface with Brand Gradient Backdrop - Balanced Navbar Spacing) */}
      <section className="relative w-full pt-6 sm:pt-10 lg:pt-12 pb-10 sm:pb-16 lg:pb-20 bg-gradient-to-b from-[#f0f4ff]/80 via-[#f8f9ff] to-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            
            {/* Left: Text & Search Form */}
            <div className="lg:col-span-7 flex flex-col items-start text-left max-w-2xl">
              <RevealOnScroll delay={50}>
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-[#0f172a] tracking-tight leading-tight sm:leading-[1.15] mb-3 sm:mb-4">
                  Find the right opportunity,{' '}
                  <span className="text-[#00288e] block sm:inline">connect with the right talent.</span>
                </h1>
              </RevealOnScroll>

              <RevealOnScroll delay={150}>
                <p className="text-xs sm:text-base text-slate-600 leading-relaxed mb-5 sm:mb-6 max-w-xl">
                  Discover verified career opportunities across industries or recruit qualified talent with structured hiring workflows.
                </p>
              </RevealOnScroll>

              {/* Functional Search Bar - Unified Responsive Architecture */}
              <RevealOnScroll delay={250} className="w-full">
                <form
                  onSubmit={handleSearchSubmit}
                  className="w-full max-w-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 p-1.5 sm:p-2 rounded-2xl bg-white border border-slate-200/90 shadow-xs sm:shadow-md"
                >
                  <div className="flex-1 flex items-center gap-2.5 sm:gap-3 px-3.5 py-2 sm:py-1.5">
                    <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="Search jobs by title, skills or company"
                      className="bg-transparent text-slate-900 text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:outline-none w-full"
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center bg-[#00288e] hover:bg-[#1e40af] text-white text-xs sm:text-sm font-bold px-5 sm:px-7 py-2.5 sm:py-3 rounded-xl transition-colors shadow-xs shrink-0 cursor-pointer min-h-[42px] sm:min-h-[44px]"
                  >
                    Search Jobs
                  </button>
                </form>

                {/* Dual Hero Action Buttons - Unified for Mobile, Tablet & Desktop */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-3.5 sm:mt-5 w-full max-w-xl">
                  <Link
                    to="/jobs"
                    className="py-2.5 sm:py-3.5 px-3 sm:px-5 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl sm:rounded-2xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-slate-800 hover:text-[#00288e] group cursor-pointer min-h-[42px] sm:min-h-[48px]"
                  >
                    <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00288e] group-hover:scale-110 transition-transform shrink-0" />
                    <span>Find Jobs</span>
                  </Link>
                  <Link
                    to="/for-employers"
                    className="py-2.5 sm:py-3.5 px-3 sm:px-5 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl sm:rounded-2xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-slate-800 hover:text-[#00288e] group cursor-pointer min-h-[42px] sm:min-h-[48px]"
                  >
                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00288e] group-hover:scale-110 transition-transform shrink-0" />
                    <span>Hire Talent</span>
                  </Link>
                </div>
              </RevealOnScroll>
            </div>

            {/* Right: Workplace Visual (Hidden on mobile to save critical vertical space) */}
            <div className="hidden lg:block lg:col-span-5 relative w-full">
              <FadeInSection delay={200}>
                <div className="relative w-full aspect-[4/3] max-h-[380px] rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 bg-white">
                  <img
                    src="/images/candidate_interview.jpg"
                    alt="Professional workplace and candidate interview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/30 via-transparent to-transparent pointer-events-none" />
                </div>
              </FadeInSection>
            </div>

          </div>
        </div>
      </section>

      {/* 2. BROWSE JOB CATEGORIES (Compact mobile tiles + rich desktop cards) */}
      <section className="w-full py-8 sm:py-16 lg:py-20 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll className="flex items-center justify-between mb-4 sm:mb-8">
            <div>
              <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-[#0f172a]">
                Job Categories
              </h2>
            </div>
            <Link
              to="/jobs"
              className="text-xs sm:text-sm font-bold text-[#00288e] hover:text-[#1e40af] inline-flex items-center gap-1 transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Link>
          </RevealOnScroll>

          {/* Unified Responsive Category Cards (2 cols on small mobile, 3 on tablet, 6 on desktop) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {jobCategories.slice(0, 6).map((cat, idx) => {
              const Icon = cat.icon;
              const bgTints = [
                'bg-blue-50 text-[#00288e]',
                'bg-emerald-50 text-emerald-600',
                'bg-sky-50 text-sky-600',
                'bg-rose-50 text-rose-600',
                'bg-amber-50 text-amber-600',
                'bg-violet-50 text-violet-600'
              ];
              const tint = bgTints[idx % bgTints.length];
              return (
                <Link
                  key={cat.name}
                  to={`/jobs?category=${encodeURIComponent(cat.name)}`}
                  className="bg-white hover:bg-slate-50 active:bg-blue-50/40 rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col items-center justify-center text-center group cursor-pointer min-h-[96px] sm:min-h-[120px]"
                >
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${tint} flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-105 transition-transform shrink-0`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#00288e] transition-colors leading-tight text-center break-words px-1">
                    {cat.shortLabel || cat.name}
                  </h3>
                </Link>
              );
            })}
          </div>

          {/* Employer Value Callout Banner */}
          <div className="relative mt-4 sm:mt-6 rounded-2xl overflow-hidden p-4 sm:p-5 text-white flex items-center justify-between shadow-xs border border-blue-900/20">
            <div className="absolute inset-0 z-0 pointer-events-none">
              <img
                src="/images/employer_dashboard.jpg"
                alt=""
                loading="lazy"
                className="w-full h-full object-cover object-center opacity-20"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#00288e] via-[#00288e]/95 to-[#1e40af]/90 mix-blend-multiply" />
            </div>
            <div className="relative z-10 max-w-[75%] sm:max-w-xl">
              <h3 className="font-bold text-sm sm:text-base leading-snug">Build a stronger team with Vakancy.in</h3>
              <p className="text-xs sm:text-sm text-blue-100 mt-0.5 leading-relaxed">Access verified talent across industries.</p>
            </div>
            <Link
              to="/for-employers"
              className="relative z-10 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-[#00288e] font-bold text-xs hover:bg-blue-50 transition-colors shrink-0 shadow-sm cursor-pointer"
              aria-label="Build a team with Vakancy.in"
            >
              <span>For Employers</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 3. JOB DISCOVERY SECTION (Swipeable Carousel on Mobile + Grid on Desktop) */}
      <section className="w-full py-10 sm:py-16 lg:py-20 bg-[#f8fafc] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll className="flex items-center justify-between mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-[#0f172a]">
              Featured Jobs
            </h2>
            <Link
              to="/jobs"
              className="text-xs sm:text-sm font-bold text-[#00288e] hover:text-[#1e40af] inline-flex items-center gap-1 transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Link>
          </RevealOnScroll>

          {/* Real Jobs Grid (Desktop & Tablet) + Swipeable Snap Carousel (Mobile) */}
          {loadingJobs ? (
            <>
              {/* Desktop / Tablet Skeletons */}
              <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="bg-white rounded-2xl p-6 border border-slate-200/80 space-y-4 shadow-xs">
                    <LoadingSkeleton variant="rectangular" height="28px" width="55%" />
                    <LoadingSkeleton variant="rectangular" height="18px" width="85%" />
                    <LoadingSkeleton variant="rectangular" height="16px" width="60%" />
                  </div>
                ))}
              </div>
              {/* Mobile Swipeable Skeletons */}
              <div className="sm:hidden flex overflow-x-auto snap-x snap-mandatory gap-3.5 pb-3 -mx-4 px-4 no-scrollbar">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="w-[84vw] max-w-[320px] shrink-0 snap-center bg-white rounded-2xl p-5 border border-slate-200/80 space-y-4 shadow-xs">
                    <LoadingSkeleton variant="rectangular" height="24px" width="55%" />
                    <LoadingSkeleton variant="rectangular" height="16px" width="85%" />
                    <LoadingSkeleton variant="rectangular" height="14px" width="60%" />
                  </div>
                ))}
              </div>
            </>
          ) : featuredJobs.length > 0 ? (
            <>
              {/* Desktop / Tablet Grid */}
              <StaggerContainer className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                {featuredJobs.map((job, idx) => (
                  <StaggerItem key={job.id} index={idx} className="h-full flex flex-col">
                    <JobCard job={job} className="h-full" />
                  </StaggerItem>
                ))}
              </StaggerContainer>

              {/* Mobile Touch-Friendly Swipeable Snap Carousel */}
              <div className="sm:hidden flex overflow-x-auto snap-x snap-mandatory gap-3.5 pb-3 -mx-4 px-4 no-scrollbar items-stretch scroll-smooth">
                {featuredJobs.map((job) => (
                  <div key={job.id} className="w-[84vw] max-w-[320px] shrink-0 snap-center flex flex-col h-full">
                    <JobCard job={job} className="h-full shadow-xs hover:shadow-md transition-shadow" />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/80 shadow-xs max-w-xl mx-auto">
              <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-[#0f172a]">Explore Active Openings</h3>
              <p className="text-sm text-slate-500 mb-5">Browse the latest verified jobs published across industries.</p>
              <Link
                to="/jobs"
                className="inline-flex items-center gap-2 bg-[#00288e] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#1e40af] transition-colors"
              >
                Browse Job Directory
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 4. HOW VAKANCY.IN WORKS (3-Step Candidate Journey) */}
      <section className="w-full py-12 sm:py-18 lg:py-24 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll className="text-center max-w-2xl mx-auto mb-10 sm:mb-16">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#00288e] mb-2 block">
              Candidate Journey
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#0f172a]">
              How Vakancy.in Works
            </h2>
            <p className="text-sm sm:text-lg text-slate-600 mt-2 sm:mt-3">
              A transparent three-step path designed to keep your job search organized and effective.
            </p>
          </RevealOnScroll>

          {/* Unified Steps Grid */}
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {candidateSteps.map((step, idx) => (
              <StaggerItem
                key={step.step}
                index={idx}
                className="bg-[#f8fafc] rounded-2xl sm:rounded-3xl p-5 sm:p-7 lg:p-8 border border-slate-200/80 shadow-xs flex flex-row md:flex-col items-start gap-4 md:gap-0 justify-between"
              >
                <div className="flex md:flex-col items-start gap-3.5 md:gap-0 w-full">
                  <span className="w-10 h-10 sm:w-12 sm:h-12 md:w-auto md:h-auto rounded-xl md:rounded-none bg-[#00288e] md:bg-transparent text-white md:text-[#00288e] flex items-center justify-center font-extrabold text-base md:text-4xl md:mb-6 shrink-0">
                    {step.step}
                  </span>
                  <div>
                    <h3 className="text-base sm:text-lg lg:text-xl font-bold text-[#0f172a] mb-1.5 md:mb-3">
                      {step.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* 5. EMPLOYER EXPERIENCE PREVIEW (Deep Navy Section - Restoring Visual Rhythm) */}
      <section className="relative w-full py-12 sm:py-18 lg:py-24 bg-[#0f172a] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/25 via-[#0f172a] to-[#0f172a] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <RevealOnScroll className="max-w-2xl mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-900/40 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-[0.18em] mb-4">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              Employer Experience
            </div>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
              Hiring Capabilities Built for Employers
            </h2>
            <p className="text-sm sm:text-lg text-slate-300 mt-3 sm:mt-4 leading-relaxed">
              From building a company presence to managing open mandates and accessing recruitment services, Vakancy.in gives your team a structured hiring platform.
            </p>
          </RevealOnScroll>

          {/* Unified Employer Capabilities Grid */}
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {employerCapabilities.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <StaggerItem
                  key={feat.title}
                  index={idx}
                  className="bg-[#1e293b]/80 border border-slate-700/60 rounded-2xl p-5 sm:p-7 hover:border-blue-500/40 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-3 sm:mb-5">
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <h3 className="text-base sm:text-xl font-bold text-white mb-1.5 sm:mb-2">
                      {feat.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>

          <div className="mt-8 sm:mt-12 text-center">
            <Link
              to="/for-employers"
              className="inline-flex items-center gap-2 px-7 py-3 sm:px-8 sm:py-3.5 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white font-bold text-xs sm:text-sm transition-colors shadow-sm"
            >
              Explore For Employers
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 6. CANDIDATE EXPERIENCE & RECRUITMENT SUPPORT (Light Surface) */}
      <section className="w-full py-12 sm:py-18 lg:py-24 bg-[#f8fafc] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Visual Left (Hidden on mobile to save vertical scrolling) */}
            <div className="hidden lg:block lg:col-span-5 order-2 lg:order-1">
              <FadeInSection>
                <div className="relative rounded-3xl overflow-hidden shadow-lg border border-slate-200/80 aspect-[4/3] bg-white">
                  <img
                    src="/images/recruitment_office.jpg"
                    alt="Vakancy Recruitment Workspace"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/30 via-transparent to-transparent pointer-events-none" />
                </div>
              </FadeInSection>
            </div>

            {/* Text Right */}
            <div className="lg:col-span-7 order-1 lg:order-2">
              <RevealOnScroll>
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#00288e] mb-2 block">
                  Comprehensive Platform
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0f172a] mb-5">
                  Organized Candidate Experience & Recruitment Support
                </h2>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-6">
                  Candidates benefit from an organized profile, resume management, saved jobs, and real-time application tracking. For employers with active mandates, Vakancy.in provides recruitment assistance and controlled candidate database access under strict privacy workflows.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                    <h4 className="font-bold text-[#0f172a] text-sm mb-1">Candidate Profile Tools</h4>
                    <p className="text-xs text-slate-500">Manage resumes, credentials, and application timelines effortlessly.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                    <h4 className="font-bold text-[#0f172a] text-sm mb-1">Recruitment Assistance</h4>
                    <p className="text-xs text-slate-500">Coordinated candidate search and screening support from our team.</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    to="/jobs"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00288e] text-white font-bold text-sm hover:bg-[#1e40af] transition-colors shadow-xs"
                  >
                    Explore Jobs
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/for-employers"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-300 text-[#0f172a] font-bold text-sm hover:bg-slate-50 transition-colors shadow-xs"
                  >
                    For Employers
                  </Link>
                </div>
              </RevealOnScroll>
            </div>

          </div>
        </div>
      </section>

      {/* 7. EXECUTIVE SEARCH PREVIEW (Refined Brand Palette Section) */}
      <FadeInSection className="relative w-full p-3 sm:p-8 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto rounded-3xl sm:rounded-[2.5rem] bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] border border-slate-800 overflow-hidden relative shadow-xl">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 p-5 sm:p-12 lg:p-16 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 sm:gap-8">
            <div className="max-w-2xl text-left text-white">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-900/50 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-[0.16em] mb-3 sm:mb-4">
                <Award className="w-3.5 h-3.5 text-blue-400" />
                Focused Sourcing
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold leading-tight mb-2 sm:mb-3 text-white">
                Recruitment for Specialized and Leadership Roles
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Executive Search is designed for situations requiring a focused recruitment approach, including leadership appointments, confidential searches, and specialized technical talent.
              </p>
            </div>

            <div className="shrink-0 w-full sm:w-auto">
              <Link
                to="/executive-search"
                className="inline-flex items-center justify-center gap-2 bg-[#00288e] hover:bg-[#1e40af] text-white px-6 py-3.5 sm:px-7 sm:py-4 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md w-full sm:w-auto min-h-[44px] cursor-pointer"
              >
                Explore executive search
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </FadeInSection>

      {/* 8. FINAL CTA (Dual Audience Pathway) */}
      <section className="w-full py-12 sm:py-16 lg:py-20 bg-white border-t border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#00288e] mb-2 block">
            Next Step
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#0f172a] mb-3 sm:mb-4">
            Your Next Opportunity Starts Here
          </h2>
          <p className="text-sm sm:text-lg text-slate-600 mb-6 sm:mb-8 max-w-xl mx-auto">
            Whether you are advancing your career or looking for qualified talent to strengthen your organization, get started with Vakancy.in.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Link
              to="/jobs"
              className="inline-flex justify-center items-center px-6 py-3.5 sm:px-8 sm:py-3.5 rounded-xl bg-[#00288e] text-white font-bold text-xs sm:text-sm hover:bg-[#1e40af] transition-colors shadow-sm min-h-[44px]"
            >
              Looking for your next opportunity?
            </Link>
            <Link
              to="/for-employers"
              className="inline-flex justify-center items-center px-6 py-3.5 sm:px-8 sm:py-3.5 rounded-xl bg-white border border-slate-300 text-[#0f172a] font-bold text-xs sm:text-sm hover:bg-slate-50 transition-colors shadow-xs min-h-[44px]"
            >
              Looking for the right talent?
            </Link>
          </div>
        </div>
      </section>

    </PageTransition>
  );
};

export default HomePage;
