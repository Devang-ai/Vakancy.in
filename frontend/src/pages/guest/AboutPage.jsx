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

export const AboutPage = () => {
  const whatWeDoCards = [
    {
      icon: Search,
      title: 'Job discovery',
      description: 'Help candidates discover and explore relevant career opportunities with transparent role requirements, employer details, and direct application tools.',
    },
    {
      icon: Building2,
      title: 'Employer hiring',
      description: 'Give organizations a structured way to create company profiles, publish jobs, and manage openings from an intuitive recruitment workspace.',
    },
    {
      icon: Layers,
      title: 'Recruitment support',
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
      <section className="relative w-full pt-10 sm:pt-12 lg:pt-14 pb-16 lg:pb-22 bg-[#0f172a] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/25 via-[#0f172a] to-[#0f172a] pointer-events-none" />
        <div className="absolute top-12 right-12 w-[450px] h-[450px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left: Text Content */}
            <div className="lg:col-span-7 flex flex-col items-start text-left max-w-2xl">
              <RevealOnScroll>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-900/40 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-[0.18em] mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  About Vakancy.in
                </div>
              </RevealOnScroll>
              
              <RevealOnScroll delay={100}>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.12] mb-5">
                  We connect people with the{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-blue-200">
                    right opportunities.
                  </span>
                </h1>
              </RevealOnScroll>
              
              <RevealOnScroll delay={200}>
                <p className="text-lg sm:text-xl text-slate-200 leading-relaxed mb-8">
                  Vakancy.in brings candidates and employers together through job discovery, employer hiring tools, recruitment support, candidate database services, and focused search capabilities.
                </p>
              </RevealOnScroll>
              
              <RevealOnScroll delay={300}>
                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    to="/jobs"
                    className="px-7 py-3.5 rounded-xl bg-[#00288e] text-white text-sm font-bold hover:bg-[#1e40af] shadow-[0_0_20px_rgba(30,64,175,0.3)] transition-all flex items-center gap-2"
                  >
                    Explore jobs
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/for-employers"
                    className="px-7 py-3.5 rounded-xl bg-white/10 text-white border border-white/20 text-sm font-bold hover:bg-white/15 transition-all backdrop-blur-sm"
                  >
                    For employers
                  </Link>
                </div>
              </RevealOnScroll>
            </div>

            {/* Right: Abstract Ecosystem Visual */}
            <div className="lg:col-span-5 hidden lg:block relative h-[420px] w-full">
              <FadeInSection delay={200} className="w-full h-full relative">
                {/* Central Hub Node */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-blue-600/25 rounded-2xl border border-blue-500/40 backdrop-blur-md flex items-center justify-center z-20 shadow-[0_0_35px_rgba(37,99,235,0.3)]">
                  <div className="w-12 h-12 rounded-xl bg-[#00288e] flex items-center justify-center shadow-inner text-white font-bold text-xl">
                    V
                  </div>
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

      {/* 2. WHAT WE DO (Light Surface - 3 Structured Cards) */}
      <section className="w-full py-18 sm:py-20 lg:py-24 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll className="max-w-2xl mb-14">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#00288e] mb-2 block">
              Core Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0f172a]">
              What We Do
            </h2>
            <p className="text-base sm:text-lg text-slate-600 mt-3 leading-relaxed">
              We provide practical tools and structured recruitment pathways that serve candidates and hiring teams with clarity.
            </p>
          </RevealOnScroll>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {whatWeDoCards.map((item, idx) => {
              const Icon = item.icon;
              return (
                <StaggerItem
                  key={item.title}
                  index={idx}
                  className="bg-[#f8fafc] hover:bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                >
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#00288e] flex items-center justify-center mb-6 group-hover:bg-[#00288e] group-hover:text-white transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-[#0f172a] capitalize mb-3">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
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
      <section className="w-full py-18 sm:py-20 lg:py-24 bg-[#eff6ff]/70 border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            <div className="lg:col-span-5 sticky top-24">
              <RevealOnScroll>
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#00288e] mb-2 block">
                  Our Mission
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0f172a] mb-5">
                  Building a More Organized Recruitment Ecosystem
                </h2>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-6">
                  Vakancy.in was founded to bridge the gap between talented individuals and reputable organizations by establishing transparent hiring standards and responsible privacy workflows.
                </p>
                <div className="relative rounded-2xl overflow-hidden aspect-[4/3] shadow-md border border-blue-200/80 hidden sm:block">
                  <img
                    src="/images/recruitment_office.jpg"
                    alt="Vakancy Office Workspace"
                    className="w-full h-full object-cover"
                  />
                </div>
              </RevealOnScroll>
            </div>

            <div className="lg:col-span-7">
              <StaggerContainer className="flex flex-col gap-4">
                {missionPoints.map((point, idx) => (
                  <StaggerItem
                    key={point.title}
                    index={idx}
                    className="bg-white rounded-2xl p-6 sm:p-7 border border-blue-200/60 shadow-xs"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-[#00288e] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-[#0f172a] mb-1.5">
                          {point.title}
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
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
      <section className="w-full py-18 sm:py-20 lg:py-24 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#00288e] mb-2 block">
              Dedicated Workspaces
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0f172a]">
              Built for Candidates and Employers
            </h2>
            <p className="text-base sm:text-lg text-slate-600 mt-3">
              Clear tools and verified processes for both sides of the hiring table.
            </p>
          </RevealOnScroll>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* Candidate Card */}
            <RevealOnScroll delay={100} className="bg-[#f8fafc] rounded-[2rem] p-8 sm:p-10 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#00288e] flex items-center justify-center font-bold">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-[#0f172a]">For Candidates</h3>
                    <p className="text-xs text-slate-500">Career discovery & application tracking</p>
                  </div>
                </div>

                <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6">
                  Take ownership of your career with structured job postings, organized resume management, and clear application statuses.
                </p>

                <ul className="space-y-3 mb-8">
                  {candidateCapabilities.map((cap) => (
                    <li key={cap} className="flex items-start gap-3 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-[#00288e] shrink-0 mt-0.5" />
                      <span>{cap}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                to="/jobs"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white font-bold text-sm transition-colors shadow-xs"
              >
                Explore jobs
                <ArrowRight className="w-4 h-4" />
              </Link>
            </RevealOnScroll>

            {/* Employer Card */}
            <RevealOnScroll delay={200} className="bg-[#f8fafc] rounded-[2rem] p-8 sm:p-10 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 text-slate-800 flex items-center justify-center font-bold">
                    <Building className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-[#0f172a]">For Employers</h3>
                    <p className="text-xs text-slate-500">Job publishing & recruitment support</p>
                  </div>
                </div>

                <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6">
                  Present your company, publish verified openings, manage applicant pipelines, and request recruitment support.
                </p>

                <ul className="space-y-3 mb-8">
                  {employerCapabilities.map((cap) => (
                    <li key={cap} className="flex items-start gap-3 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-slate-800 shrink-0 mt-0.5" />
                      <span>{cap}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                to="/for-employers"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white font-bold text-sm transition-colors shadow-xs"
              >
                For employers
                <ArrowRight className="w-4 h-4" />
              </Link>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* 5. OUR APPROACH (Deep Navy Section - Core Principles) */}
      <section className="relative w-full py-20 sm:py-24 bg-[#0f172a] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0f172a] to-[#0f172a] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <RevealOnScroll className="max-w-2xl mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-900/40 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-[0.18em] mb-4">
              <Compass className="w-3.5 h-3.5 text-blue-400" />
              Core Principles
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
              Our Approach
            </h2>
            <p className="text-base sm:text-lg text-slate-300 mt-4 leading-relaxed">
              We operate on five consistent principles that prioritize clarity, coordination, and respect for both candidates and employers.
            </p>
          </RevealOnScroll>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {approachPrinciples.map((item, idx) => (
              <StaggerItem
                key={item.title}
                index={idx}
                className="bg-[#1e293b]/80 border border-slate-700/60 rounded-2xl p-7 hover:border-blue-500/40 transition-colors flex flex-col justify-between"
              >
                <div>
                  <span className="text-3xl font-extrabold text-blue-400/80 mb-4 block">
                    {item.number}
                  </span>
                  <h3 className="text-xl font-bold text-white mb-2.5">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* 6. FINAL ABOUT CTA (Elevated Container with Dual Links) */}
      <FadeInSection className="relative w-full p-4 sm:p-8 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto rounded-[2.5rem] bg-gradient-to-br from-[#0f172a] via-[#111e38] to-[#00288e] overflow-hidden relative shadow-xl">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 px-6 py-16 sm:px-14 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-8">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300 mb-3 block">
                Next Step
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-4">
                Ready to take the next step in your recruitment journey?
              </h2>
              <p className="text-base sm:text-lg text-slate-200 max-w-xl">
                Whether you are exploring your next career move or looking to connect with qualified talent, Vakancy.in provides the tools to move forward.
              </p>
            </div>

            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3.5">
              <Link
                to="/jobs"
                className="w-full text-center px-6 py-3.5 rounded-xl bg-white text-[#0f172a] font-bold text-sm hover:bg-slate-100 transition-colors shadow-sm"
              >
                Looking for your next opportunity?
              </Link>
              <Link
                to="/for-employers"
                className="w-full text-center px-6 py-3.5 rounded-xl bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition-colors backdrop-blur-md border border-white/20"
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
