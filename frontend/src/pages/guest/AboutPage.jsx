import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building,
  Building2,
  Users,
  Target,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Search,
  FileText,
  Lock,
  Compass,
  Briefcase,
  Layers,
  Eye,
  UserCheck,
  Award
} from 'lucide-react';
import { PageTransition, RevealOnScroll, StaggerContainer, StaggerItem, FadeInSection } from '../../components/common/Motion';
import BrandLogo from '../../components/common/BrandLogo';
import useSEO from '../../hooks/useSEO';

export const AboutPage = () => {
  useSEO({
    title: 'About Us — Global Recruitment Ecosystem | Vakancy.in',
    description: 'Learn about Vakancy.in’s mission to connect professionals and organizations across India and international markets with transparent standards.',
    canonical: '/about'
  });
  const whatWeDoCards = [
    {
      icon: Search,
      title: 'Job discovery',
      mobileSummary: 'Explore verified career opportunities with transparent requirements and direct application tools.',
      description: 'Help candidates discover and explore relevant career opportunities with transparent role requirements, employer details, and direct application tools.',
    },
    {
      icon: Building2,
      title: 'Employer hiring',
      mobileSummary: 'Create verified company profiles, publish roles, and manage applicant pipelines.',
      description: 'Give organizations a structured way to create company profiles, publish jobs, and manage openings from an intuitive recruitment workspace.',
    },
    {
      icon: Layers,
      title: 'Recruitment support',
      mobileSummary: 'Specialized candidate sourcing, candidate review workflows, and recruitment advisory assistance.',
      description: 'Support employers with candidate database services, internal review workflows, and focused search assistance where specialized hiring is needed.',
    },
  ];

  const missionPoints = [
    {
      title: 'Making recruitment more organized',
      description: 'Replacing fragmented spreadsheets and noisy email threads with structured candidate tracking and verified job management.',
    },
    {
      title: 'Improving access to opportunities',
      description: 'Connecting job seekers to genuine career roles across India with clear descriptions and simple application workflows.',
    },
    {
      title: 'Helping employers present roles clearly',
      description: 'Enabling companies to highlight their mission, workplace culture, and exact skill expectations to prospective applicants.',
    },
    {
      title: 'Supporting better communication',
      description: 'Fostering structured feedback and timely status updates between hiring teams and applicants.',
    },
    {
      title: 'Maintaining responsible data handling',
      description: 'Protecting candidate privacy through controlled database workflows instead of treating resumes as public commodities.',
    },
  ];

  const candidateCapabilities = [
    'Create and maintain a comprehensive profile',
    'Manage formatted resumes and credentials',
    'Search and filter jobs by location, department, and work mode',
    'Save opportunities for later review',
    'Submit direct applications to verified companies',
    'Track application review stages in real time',
  ];

  const employerCapabilities = [
    'Quick employer registration and organization verification',
    'Build an authoritative company profile',
    'Publish structured job postings with customized criteria',
    'Manage active job openings from an administrative dashboard',
    'Request candidate database access through platform workflows',
    'Dedicated recruitment support for complex mandates',
    'Executive search assistance for leadership requirements',
  ];

  const approachPrinciples = [
    {
      number: '01',
      title: 'Clarity',
      description: 'Make recruitment information easier to understand by eliminating confusing jargon and ambiguous job descriptions.',
    },
    {
      number: '02',
      title: 'Organization',
      description: 'Keep hiring activity structured so that every vacancy, applicant review, and decision is tracked cleanly.',
    },
    {
      number: '03',
      title: 'Relevance',
      description: 'Help candidates and employers focus on suitable opportunities and requirements that truly match capabilities.',
    },
    {
      number: '04',
      title: 'Human connection',
      description: 'Recruitment fundamentally involves human communication and coordination, not just automated software.',
    },
    {
      number: '05',
      title: 'Privacy',
      description: 'Candidate information must be handled responsibly and only shared through verified, authorized platform workflows.',
    },
  ];

  return (
    <PageTransition className="w-full bg-[#f8fafc] text-[#0f172a] min-h-screen overflow-x-hidden font-sans">

      {/* 1. HERO SECTION (Deep Navy / Rich Contrast Benchmark) */}
      <section className="relative w-full pt-6 sm:pt-12 lg:pt-14 pb-10 sm:pb-16 lg:pb-22 bg-[#0f172a] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/25 via-[#0f172a] to-[#0f172a] pointer-events-none" />
        <div className="absolute top-12 right-12 w-[450px] h-[450px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">

            {/* Left: Text Content */}
            <div className="lg:col-span-7 flex flex-col items-start text-left max-w-2xl">
              <RevealOnScroll delay={50}>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>About Vakancy.in</span>
                </div>
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15] mb-3 sm:mb-5">
                  A smarter way to connect <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-blue-200">talent with opportunity.</span>
                </h1>
              </RevealOnScroll>

              <RevealOnScroll delay={200}>
                <p className="text-sm sm:text-lg text-slate-200 leading-relaxed mb-6 sm:mb-8">
                  We bridge the gap between job seekers and employers with a simple, transparent and efficient platform. Vakancy.in connects talent and organizations with structured tools and verified workflows.
                </p>
              </RevealOnScroll>

              <RevealOnScroll delay={300} className="w-full">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Link
                    to="/jobs"
                    className="px-6 py-3.5 sm:px-7 rounded-xl bg-[#00288e] text-white text-xs sm:text-sm font-bold hover:bg-[#1e40af] shadow-[0_0_20px_rgba(30,64,175,0.3)] transition-all flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    Explore jobs
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/for-employers"
                    className="px-6 py-3.5 sm:px-7 rounded-xl bg-white/10 text-white border border-white/20 text-xs sm:text-sm font-bold hover:bg-white/15 transition-all backdrop-blur-sm flex items-center justify-center min-h-[44px]"
                  >
                    For employers
                  </Link>
                </div>
              </RevealOnScroll>
            </div>

            {/* Right: Abstract Ecosystem Visual */}
            <div className="lg:col-span-5 hidden lg:block relative h-[420px] w-full">
              <FadeInSection delay={200} className="w-full h-full relative">
                {/* Central Global Network Hub Node */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full bg-gradient-to-br from-blue-600/30 via-indigo-600/20 to-sky-500/30 border border-blue-400/50 backdrop-blur-md flex items-center justify-center z-20 shadow-[0_0_40px_rgba(37,99,235,0.45)] group">
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-[#00288e] to-sky-600 flex items-center justify-center shadow-inner overflow-hidden border border-blue-300/40">
                    {/* Globe Grid lines SVG */}
                    <svg className="w-14 h-14 text-sky-200/90 animate-[spin_40s_linear_infinite]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.2" opacity="0.8" />
                      <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1" opacity="0.7" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" strokeWidth="1.2" opacity="0.9" />
                      <path d="M4.5 7.5h15" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
                      <path d="M4.5 16.5h15" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
                    </svg>
                    {/* Glowing pulse core */}
                    <div className="absolute inset-0 bg-radial from-sky-400/25 via-transparent to-transparent pointer-events-none" />
                  </div>
                  {/* Subtle orbiting pulse pin */}
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-500 border border-white/80"></span>
                  </span>
                </div>

                {/* Connecting Radar Rings */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 border border-slate-700/60 rounded-full border-dashed" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-52 border border-blue-500/20 rounded-full" />

                {/* Candidate Node (Top Left) */}
                <div className="absolute top-8 left-4 p-3.5 bg-[#1e293b]/90 backdrop-blur-md rounded-2xl border border-slate-700 shadow-xl z-20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Candidate Workspace</div>
                      <div className="text-[10px] text-slate-400">Profiles & Applications</div>
                    </div>
                  </div>
                </div>

                {/* Employer Node (Bottom Right) */}
                <div className="absolute bottom-8 right-4 p-3.5 bg-[#1e293b]/90 backdrop-blur-md rounded-2xl border border-slate-700 shadow-xl z-20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Employer Portal</div>
                      <div className="text-[10px] text-slate-400">Postings & Pipelines</div>
                    </div>
                  </div>
                </div>
              </FadeInSection>
            </div>

          </div>
        </div>
      </section>

      {/* 1.2 CORE PRINCIPLES 3-CARD GRID (Matching Storyboard Screen 6) */}
      <section className="w-full bg-white py-12 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-[#f8f9ff] p-7 rounded-2xl border border-blue-100/80 flex flex-col items-start gap-3 transition-all hover:shadow-md">
              <div className="w-12 h-12 rounded-xl bg-blue-100/70 text-[#00288e] flex items-center justify-center shrink-0">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 font-heading">
                Our Mission
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                To bridge the gap between job seekers and employers with modern, transparent hiring workflows.
              </p>
            </div>

            <div className="bg-[#f8f9ff] p-7 rounded-2xl border border-blue-100/80 flex flex-col items-start gap-3 transition-all hover:shadow-md">
              <div className="w-12 h-12 rounded-xl bg-emerald-100/70 text-[#006a61] flex items-center justify-center shrink-0">
                <Eye className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 font-heading">
                Our Vision
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                To be a trusted global recruitment platform for meaningful career opportunities across industries worldwide.
              </p>
            </div>

            <div className="bg-[#f8f9ff] p-7 rounded-2xl border border-blue-100/80 flex flex-col items-start gap-3 transition-all hover:shadow-md">
              <div className="w-12 h-12 rounded-xl bg-indigo-100/70 text-indigo-700 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 font-heading">
                Our Values
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Trust, transparency and a better hiring experience for candidates and organizations alike.
              </p>
            </div>
          </div>

          {/* WHO WE ARE (Introduction with Clean Compact Visual) */}
          <div className="bg-[#f8f9ff] p-6 sm:p-8 rounded-2xl border border-blue-100/80 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-100/70 text-[#00288e] text-[11px] font-bold uppercase tracking-wider mb-2">
                Introduction
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 font-heading mb-2">
                Who We Are
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Vakancy.in is a recruitment platform designed to make hiring and job search simpler, faster and more transparent for employers and job seekers alike.
              </p>
            </div>
            <div className="w-full md:w-64 lg:w-72 shrink-0 aspect-[16/9] md:aspect-[4/3] max-h-[180px] rounded-xl overflow-hidden shadow-xs border border-blue-200/60 bg-white">
              <img
                src="/images/about_global_teamwork.jpg"
                alt="Global talent acquisition and collaborative teamwork"
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. WHAT WE DO (Light Surface - 3 Structured Cards) */}
      <section className="w-full py-10 sm:py-18 lg:py-24 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll className="max-w-2xl mb-8 sm:mb-14">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#00288e] mb-2 block">
              Core Capabilities
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#0f172a]">
              What We Do
            </h2>
            <p className="text-sm sm:text-lg text-slate-600 mt-2 sm:mt-3 leading-relaxed">
              We provide practical tools and structured recruitment pathways that serve candidates and hiring teams with clarity.
            </p>
          </RevealOnScroll>

          {/* Unified Responsive What We Do Cards */}
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {whatWeDoCards.map((item, idx) => {
              const Icon = item.icon;
              return (
                <StaggerItem
                  key={item.title}
                  index={idx}
                  className="bg-[#f8fafc] hover:bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                >
                  <div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 text-[#00288e] flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-[#00288e] group-hover:text-white transition-colors">
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <h3 className="text-base sm:text-xl font-bold text-[#0f172a] capitalize mb-1.5 sm:mb-3">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>
      </section>

      {/* 3. MISSION SECTION (Concise, Meaningful Mission) */}
      <section className="w-full py-10 sm:py-18 lg:py-24 bg-[#eff6ff]/70 border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

            <div className="lg:col-span-5 lg:sticky lg:top-24">
              <RevealOnScroll>
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#00288e] mb-2 block">
                  Our Mission
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#0f172a] mb-3 sm:mb-5">
                  Building a More Organized Recruitment Ecosystem
                </h2>
                <p className="text-sm sm:text-lg text-slate-600 leading-relaxed mb-4 sm:mb-6">
                  Vakancy.in was founded to bridge the gap between talented individuals and reputable organizations by establishing transparent hiring standards and responsible privacy workflows.
                </p>
                <div className="relative rounded-2xl overflow-hidden aspect-[4/3] shadow-md border border-blue-200/80 hidden sm:block">
                  <img
                    src="/images/about_recruitment_operations.jpg"
                    alt="Diverse recruitment operations team managing structured hiring workflows across global markets"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover object-[center_35%]"
                  />
                </div>
              </RevealOnScroll>
            </div>

            <div className="lg:col-span-7">
              <StaggerContainer className="flex flex-col gap-3 sm:gap-4">
                {missionPoints.map((point, idx) => (
                  <StaggerItem
                    key={point.title}
                    index={idx}
                    className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-7 border border-blue-200/60 shadow-xs"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-50 text-[#00288e] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-lg font-bold text-[#0f172a] mb-1">
                          {point.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                          {point.description}
                        </p>
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>

          </div>
        </div>
      </section>

      {/* 4. FOR CANDIDATES & FOR EMPLOYERS (Dual Experience Panels) */}
      <section className="w-full py-10 sm:py-18 lg:py-24 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll className="text-center max-w-2xl mx-auto mb-8 sm:mb-16">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#00288e] mb-2 block">
              Dedicated Workspaces
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#0f172a]">
              Built for Candidates and Employers
            </h2>
            <p className="text-sm sm:text-lg text-slate-600 mt-2 sm:mt-3">
              Clear tools and verified processes for both sides of the hiring table.
            </p>
          </RevealOnScroll>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-stretch">
            {/* Candidate Card */}
            <RevealOnScroll delay={100} className="bg-[#f8fafc] rounded-2xl sm:rounded-[2rem] p-5 sm:p-10 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50 text-[#00288e] flex items-center justify-center font-bold">
                    <UserCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-[#0f172a]">For Candidates</h3>
                    <p className="text-xs text-slate-500">Career discovery & application tracking</p>
                  </div>
                </div>

                <p className="text-slate-600 text-xs sm:text-base leading-relaxed mb-4 sm:mb-6">
                  Take ownership of your career with structured job postings, organized resume management, and clear application statuses.
                </p>

                <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                  {candidateCapabilities.map((cap) => (
                    <li key={cap} className="flex items-start gap-2.5 sm:gap-3 text-xs sm:text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-[#00288e] shrink-0 mt-0.5" />
                      <span>{cap}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                to="/jobs"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white font-bold text-xs sm:text-sm transition-colors shadow-xs min-h-[44px]"
              >
                Explore jobs
                <ArrowRight className="w-4 h-4" />
              </Link>
            </RevealOnScroll>

            {/* Employer Card */}
            <RevealOnScroll delay={200} className="bg-[#f8fafc] rounded-2xl sm:rounded-[2rem] p-5 sm:p-10 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-200 text-slate-800 flex items-center justify-center font-bold">
                    <Building className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-[#0f172a]">For Employers</h3>
                    <p className="text-xs text-slate-500">Job publishing & recruitment support</p>
                  </div>
                </div>

                <p className="text-slate-600 text-xs sm:text-base leading-relaxed mb-4 sm:mb-6">
                  Present your company, publish verified openings, manage applicant pipelines, and request recruitment support.
                </p>

                <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                  {employerCapabilities.map((cap) => (
                    <li key={cap} className="flex items-start gap-2.5 sm:gap-3 text-xs sm:text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-slate-800 shrink-0 mt-0.5" />
                      <span>{cap}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                to="/for-employers"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition-colors shadow-xs min-h-[44px]"
              >
                For employers
                <ArrowRight className="w-4 h-4" />
              </Link>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* 5. OUR APPROACH (Deep Navy Section - Core Principles) */}
      <section className="relative w-full py-12 sm:py-20 lg:py-24 bg-[#0f172a] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0f172a] to-[#0f172a] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <RevealOnScroll className="max-w-2xl mb-8 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-900/40 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-[0.18em] mb-4">
              <Compass className="w-3.5 h-3.5 text-blue-400" />
              Core Principles
            </div>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
              Our Approach
            </h2>
            <p className="text-sm sm:text-lg text-slate-300 mt-2 sm:mt-4 leading-relaxed">
              We operate on five consistent principles that prioritize clarity, coordination, and respect for both candidates and employers.
            </p>
          </RevealOnScroll>

          {/* Unified Responsive Approach Principles Grid */}
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {approachPrinciples.map((item, idx) => (
              <StaggerItem
                key={item.title}
                index={idx}
                className="bg-[#1e293b]/80 border border-slate-700/60 rounded-2xl p-5 sm:p-7 hover:border-blue-500/40 transition-colors flex flex-col justify-between"
              >
                <div>
                  <span className="text-2xl sm:text-3xl font-extrabold text-blue-400/80 mb-2 sm:mb-4 block">
                    {item.number}
                  </span>
                  <h3 className="text-base sm:text-xl font-bold text-white mb-1.5 sm:mb-2.5">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* 6. FINAL ABOUT CTA (Elevated Container with Dual Links) */}
      <FadeInSection className="relative w-full p-3 sm:p-8 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto rounded-3xl sm:rounded-[2.5rem] bg-gradient-to-br from-[#0f172a] via-[#111e38] to-[#00288e] overflow-hidden relative shadow-xl">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 px-5 py-10 sm:px-14 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 items-center">

            <div className="lg:col-span-8">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300 mb-2 sm:mb-3 block">
                Next Step
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight mb-2 sm:mb-4">
                Ready to take the next step in your recruitment journey?
              </h2>
              <p className="text-sm sm:text-lg text-slate-200 max-w-xl">
                Whether you are exploring your next career move or looking to connect with qualified talent, Vakancy.in provides the tools to move forward.
              </p>
            </div>

            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3">
              <Link
                to="/jobs"
                className="w-full text-center px-6 py-3.5 rounded-xl bg-white text-[#0f172a] font-bold text-xs sm:text-sm hover:bg-slate-100 transition-colors shadow-sm min-h-[44px] flex items-center justify-center"
              >
                Looking for your next opportunity?
              </Link>
              <Link
                to="/for-employers"
                className="w-full text-center px-6 py-3.5 rounded-xl bg-white/10 text-white font-bold text-xs sm:text-sm hover:bg-white/20 transition-colors backdrop-blur-md border border-white/20 min-h-[44px] flex items-center justify-center"
              >
                Building your next team?
              </Link>
            </div>

          </div>
        </div>
      </FadeInSection>

    </PageTransition>
  );
};

export default AboutPage;
