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
      icon: Code2,
      description: 'Backend, Frontend, Full Stack & Cloud Infrastructure roles.',
    },
    {
      name: 'Mobile App Development',
      icon: Smartphone,
      description: 'iOS, Android, React Native & Flutter engineering roles.',
    },
    {
      name: 'Sales & BD',
      icon: TrendingUp,
      description: 'Enterprise sales, account management & business expansion.',
    },
    {
      name: 'Marketing & Growth',
      icon: Sparkles,
      description: 'Performance marketing, brand strategy & content operations.',
    },
    {
      name: 'Finance & Control',
      icon: PieChart,
      description: 'Financial analysis, corporate accounting, audit & tax roles.',
    },
    {
      name: 'Product & Design',
      icon: Palette,
      description: 'Product management, UX/UI design & user research.',
    },
    {
      name: 'Human Resources',
      icon: Users,
      description: 'Talent acquisition, HR operations & people strategy.',
    },
    {
      name: 'Operations & Logistics',
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
      <section className="relative w-full pt-8 sm:pt-10 lg:pt-12 pb-14 sm:pb-16 lg:pb-20 bg-gradient-to-b from-[#f0f4ff]/80 via-[#f8f9ff] to-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            
            {/* Left: Text & Search Form */}
            <div className="lg:col-span-7 flex flex-col items-start text-left max-w-2xl">
              <RevealOnScroll>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#00288e] text-xs font-bold uppercase tracking-[0.16em] mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00288e]" />
                  Recruitment Platform
                </div>
              </RevealOnScroll>

              <RevealOnScroll delay={100}>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0f172a] tracking-tight leading-[1.12] mb-5">
                  Find the right opportunity.{' '}
                  <span className="text-[#00288e]">Connect with the right talent.</span>
                </h1>
              </RevealOnScroll>

              <RevealOnScroll delay={200}>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-7 max-w-xl">
                  Vakancy.in helps candidates discover relevant career opportunities while giving employers tools and recruitment services to manage their hiring needs.
                </p>
              </RevealOnScroll>

              {/* Functional Search Bar */}
              <RevealOnScroll delay={300} className="w-full">
                <form
                  onSubmit={handleSearchSubmit}
                  className="p-2 sm:p-2.5 rounded-2xl bg-white border border-slate-200/90 shadow-md flex flex-col sm:flex-row items-stretch gap-2.5 max-w-xl"
                >
                  <div className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50/70 border border-slate-100 focus-within:border-[#00288e] focus-within:bg-white transition-all">
                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="Job title or skill"
                      className="bg-transparent text-slate-900 text-sm font-medium placeholder:text-slate-400 focus:outline-none w-full"
                    />
                  </div>

                  <div className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50/70 border border-slate-100 focus-within:border-[#00288e] focus-within:bg-white transition-all">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="City or location"
                      className="bg-transparent text-slate-900 text-sm font-medium placeholder:text-slate-400 focus:outline-none w-full"
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center bg-[#00288e] hover:bg-[#1e40af] text-white text-sm font-bold px-6 py-3 rounded-xl transition-colors shadow-xs shrink-0"
                  >
                    Search jobs
                  </button>
                </form>

                <div className="mt-4 flex items-center gap-4 text-xs font-semibold text-slate-500">
                  <span>Hiring organization?</span>
                  <Link
                    to="/for-employers"
                    className="text-[#00288e] hover:text-[#1e40af] inline-flex items-center gap-1 transition-colors"
                  >
                    Hire Talent on Vakancy.in
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </RevealOnScroll>
            </div>

            {/* Right: Workplace Visual */}
            <div className="lg:col-span-5 relative w-full">
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

      {/* 2. BROWSE JOB CATEGORIES (New Meaningful Category Section) */}
      <section className="w-full py-16 sm:py-20 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <div className="max-w-2xl">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0f172a]">
                Browse Job Categories
              </h2>
              <p className="text-base sm:text-lg text-slate-600 mt-3 leading-relaxed">
                Explore openings across prominent disciplines and connect directly with roles that match your background.
              </p>
            </div>
            <Link
              to="/jobs"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#f8fafc] hover:bg-slate-100 border border-slate-200/90 text-sm font-bold text-[#0f172a] transition-all shrink-0 group"
            >
              <span>Explore All Categories</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </RevealOnScroll>

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {jobCategories.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <StaggerItem
                  key={cat.name}
                  index={idx}
                  className="bg-[#f8fafc] hover:bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#00288e] flex items-center justify-center mb-5 group-hover:bg-[#00288e] group-hover:text-white transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-[#0f172a] mb-2 group-hover:text-[#00288e] transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                      {cat.description}
                    </p>
                  </div>
                  <Link
                    to={`/jobs?category=${encodeURIComponent(cat.name)}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00288e] group-hover:text-[#1e40af] transition-colors"
                  >
                    <span>Browse roles</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>
      </section>

      {/* 3. JOB DISCOVERY SECTION (Featured Jobs with Real API Data) */}
      <section className="w-full py-16 sm:py-20 bg-[#f8fafc] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <div className="max-w-2xl">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0f172a]">
                Explore Verified Job Opportunities
              </h2>
              <p className="text-base sm:text-lg text-slate-600 mt-3 leading-relaxed">
                Candidates can browse available jobs, review employer requirements, explore company backgrounds, save positions, and apply directly.
              </p>
            </div>
            <Link
              to="/jobs"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-200/90 shadow-xs text-sm font-bold text-[#0f172a] hover:bg-slate-50 transition-all shrink-0 group"
            >
              <span>View All Jobs</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </RevealOnScroll>

          {/* Real Jobs Grid */}
          {loadingJobs ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bg-white rounded-2xl p-6 border border-slate-200/80 space-y-4 shadow-xs">
                  <LoadingSkeleton variant="rectangular" height="28px" width="55%" />
                  <LoadingSkeleton variant="rectangular" height="18px" width="85%" />
                  <LoadingSkeleton variant="rectangular" height="16px" width="60%" />
                </div>
              ))}
            </div>
          ) : featuredJobs.length > 0 ? (
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredJobs.map((job, idx) => (
                <StaggerItem key={job.id} index={idx}>
                  <JobCard job={job} />
                </StaggerItem>
              ))}
            </StaggerContainer>
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
      <section className="w-full py-18 sm:py-20 lg:py-24 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#00288e] mb-2 block">
              Candidate Journey
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0f172a]">
              How Vakancy.in Works
            </h2>
            <p className="text-base sm:text-lg text-slate-600 mt-3">
              A transparent three-step path designed to keep your job search organized and effective.
            </p>
          </RevealOnScroll>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {candidateSteps.map((step, idx) => (
              <StaggerItem
                key={step.step}
                index={idx}
                className="bg-[#f8fafc] rounded-3xl p-8 border border-slate-200/80 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <span className="text-4xl font-extrabold text-[#00288e] mb-6 block">
                    {step.step}
                  </span>
                  <h3 className="text-xl font-bold text-[#0f172a] mb-3">
                    {step.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* 5. EMPLOYER EXPERIENCE PREVIEW (Deep Navy Section - Restoring Visual Rhythm) */}
      <section className="relative w-full py-18 sm:py-20 lg:py-24 bg-[#0f172a] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/25 via-[#0f172a] to-[#0f172a] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <RevealOnScroll className="max-w-2xl mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-900/40 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-[0.18em] mb-4">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              Employer Experience
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
              Hiring Capabilities Built for Employers
            </h2>
            <p className="text-base sm:text-lg text-slate-300 mt-4 leading-relaxed">
              From building a company presence to managing open mandates and accessing recruitment services, Vakancy.in gives your team a structured hiring platform.
            </p>
          </RevealOnScroll>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {employerCapabilities.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <StaggerItem
                  key={feat.title}
                  index={idx}
                  className="bg-[#1e293b]/80 border border-slate-700/60 rounded-2xl p-7 hover:border-blue-500/40 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-5">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {feat.title}
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>

          <div className="mt-12 text-center">
            <Link
              to="/for-employers"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white font-bold text-sm transition-colors shadow-sm"
            >
              Explore For Employers
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 6. CANDIDATE EXPERIENCE & RECRUITMENT SUPPORT (Light Surface) */}
      <section className="w-full py-18 sm:py-20 lg:py-24 bg-[#f8fafc] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Visual Left */}
            <div className="lg:col-span-5 order-2 lg:order-1">
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

      {/* 7. EXECUTIVE SEARCH PREVIEW (Premium Deep Blue Banner) */}
      <FadeInSection className="relative w-full p-4 sm:p-8 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto rounded-[2.5rem] bg-[#00288e] overflow-hidden relative shadow-xl">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 p-8 sm:p-14 lg:p-16 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="max-w-2xl text-left text-white">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-800/60 border border-blue-400/30 text-blue-200 text-xs font-bold uppercase tracking-[0.16em] mb-4">
                <Award className="w-3.5 h-3.5 text-blue-300" />
                Focused Sourcing
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-3">
                Recruitment for Specialized and Leadership Roles
              </h2>
              <p className="text-base sm:text-lg text-blue-100 leading-relaxed">
                Executive Search is designed for situations requiring a more focused recruitment approach, including senior leadership, confidential replacements, and specialized talent profiles.
              </p>
            </div>

            <div className="shrink-0">
              <Link
                to="/executive-search"
                className="inline-flex items-center justify-center gap-2 bg-white text-[#00288e] px-7 py-4 rounded-xl font-bold text-sm hover:bg-blue-50 transition-all shadow-md"
              >
                Explore executive search
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </FadeInSection>

      {/* 8. FINAL CTA (Dual Audience Pathway) */}
      <section className="w-full py-16 sm:py-20 bg-white border-t border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#00288e] mb-2 block">
            Next Step
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f172a] mb-4">
            Your Next Opportunity Starts Here
          </h2>
          <p className="text-base sm:text-lg text-slate-600 mb-8 max-w-xl mx-auto">
            Whether you are advancing your career or looking for qualified talent to strengthen your organization, get started with Vakancy.in.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/jobs"
              className="inline-flex justify-center items-center px-8 py-3.5 rounded-xl bg-[#00288e] text-white font-bold text-sm hover:bg-[#1e40af] transition-colors shadow-sm"
            >
              Looking for your next opportunity?
            </Link>
            <Link
              to="/for-employers"
              className="inline-flex justify-center items-center px-8 py-3.5 rounded-xl bg-white border border-slate-300 text-[#0f172a] font-bold text-sm hover:bg-slate-50 transition-colors shadow-xs"
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
