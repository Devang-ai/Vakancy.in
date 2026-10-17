import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  CheckCircle2,
  ArrowRight,
  Briefcase,
  Target,
  FileText,
  Search,
  Headphones,
  Lock,
  ShieldCheck,
  Layers,
  Sparkles,
  BarChart2,
  HelpCircle
} from 'lucide-react';
import { PageTransition, RevealOnScroll, StaggerContainer, StaggerItem, FadeInSection } from '../../components/common/Motion';
import { RecruitmentAvatar } from '../../components/common/RecruitmentAvatar';
import { RecruitmentSupportIllustration } from '../../components/common/RecruitmentIllustrations';

export const ForEmployersPage = () => {
  const challenges = [
    {
      icon: Target,
      tag: 'Candidate Reach',
      title: 'Reaching Suitable Candidates',
      description: 'Cutting through generic applicant volume to connect with job seekers whose skills and experience match the role.',
    },
    {
      icon: Briefcase,
      tag: 'Multi-Role Pipeline',
      title: 'Managing Multiple Openings',
      description: 'Keeping diverse roles, requirements, and candidate pipelines structured across growing departments.',
    },
    {
      icon: Building2,
      tag: 'Employer Brand',
      title: 'Presenting Company Professionally',
      description: 'Establishing an organized, credible organizational presence that appeals to career-minded professionals.',
    },
    {
      icon: Search,
      tag: 'Niche Sourcing',
      title: 'Finding Specialized Profiles',
      description: 'Sourcing qualified talent for technical, niche, or senior roles that require active candidate engagement.',
    },
    {
      icon: FileText,
      tag: 'Posting Structure',
      title: 'Keeping Postings Organized',
      description: 'Ensuring job descriptions, qualification criteria, and application intake remain current and accurate.',
    },
    {
      icon: Headphones,
      tag: 'Recruiter Support',
      title: 'Accessing Recruitment Support',
      description: 'Getting dedicated recruitment assistance when internal hiring bandwidth is stretched.',
    },
  ];

  const capabilities = [
    {
      icon: Building2,
      tag: 'Employer Profile',
      title: 'Company Profile & Verified Presence',
      description: 'Establish a credible, verified organization presence that attracts qualified applicants. Showcase your company mission, workplace culture, active vacancies, and industry domain.',
      badge: 'Verified Employer',
      features: ['Structured company overview', 'Active vacancies showcase', 'Verified organization status'],
    },
    {
      icon: FileText,
      tag: 'Job Operations',
      title: 'Structured Job Publishing & Intake',
      description: 'Create, edit, and maintain structured job openings detailing required competencies, qualification criteria, compensation structure, and direct applicant review.',
      badge: 'Active Job Control',
      features: ['Role qualification criteria', 'Applicant intake review', 'Real-time posting status'],
    },
    {
      icon: ShieldCheck,
      tag: 'Candidate Sourcing',
      title: 'Controlled Candidate Discovery',
      description: 'Request access to curated candidate database services backed by structured privacy handling and verified credentials rather than unstructured public web data.',
      badge: 'Privacy-First Workflow',
      features: ['Internal team verification', 'Role-specific permissions', 'Structured privacy handling'],
    },
    {
      icon: Headphones,
      tag: 'Recruitment Advisory',
      title: 'Dedicated Specialist Support',
      description: 'Work with the Vakancy.in recruitment team for specialized candidate sourcing, preliminary screening assistance, or hard-to-fill technical and leadership mandates.',
      badge: 'Specialist Team',
      features: ['Targeted talent sourcing', 'Preliminary screening support', 'Collaborative hiring assistance'],
    },
  ];

  const hiringSteps = [
    {
      step: '01',
      title: 'Register',
      description: 'Create an employer account and provide preliminary organization information for verification.',
    },
    {
      step: '02',
      title: 'Build your company profile',
      description: 'Add relevant organization information, workplace details, and industry focus to showcase your employer brand.',
    },
    {
      step: '03',
      title: 'Publish and manage jobs',
      description: 'Create, edit, and maintain active job openings with specific qualification criteria.',
    },
    {
      step: '04',
      title: 'Connect through the appropriate recruitment workflow',
      description: 'Review incoming applications or engage available recruitment services and candidate database access where applicable.',
    },
  ];

  const whyEmployersChooseUs = [
    {
      title: 'Organized Hiring Workflow',
      description: 'A centralized space to create, manage, and monitor job listings without fragmented communication.',
      avatarType: 'recruiter-male',
      tag: 'Workflow',
    },
    {
      title: 'Professional Employer Presence',
      description: 'Showcase your company profile directly to candidates seeking legitimate, structured career opportunities.',
      avatarType: 'employer-female',
      tag: 'Employer Profile',
    },
    {
      title: 'Easier Job Management',
      description: 'Quickly adjust requirements, pause listings, or review applicants from a clean administrative interface.',
      avatarType: 'hiring-manager',
      tag: 'Job Management',
    },
    {
      title: 'Recruitment Support',
      description: 'Access dedicated team assistance when your organization requires supplementary candidate screening or sourcing.',
      avatarType: 'recruiter-duo',
      tag: 'Recruitment Support',
    },
    {
      title: 'Controlled Candidate Discovery',
      description: 'Request candidate database access backed by structured privacy handling rather than raw public data lists.',
      avatarType: 'candidate-profile',
      tag: 'Candidate Discovery',
    },
    {
      title: 'Centralized Activity',
      description: 'Keep your recruitment team, postings, and candidate touchpoints synchronized in one dependable ecosystem.',
      avatarType: 'team-cluster',
      tag: 'Hiring Team',
    },
  ];

  return (
    <PageTransition className="w-full bg-[#f8fafc] text-[#0f172a] min-h-screen overflow-x-hidden font-sans">
      
      {/* 1. HERO SECTION (Balanced Spacing below Navbar) */}
      <section className="relative w-full pt-8 sm:pt-10 lg:pt-12 pb-12 sm:pb-14 lg:pb-16 bg-gradient-to-b from-[#f0f4ff]/80 via-[#f8f9ff] to-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            
            {/* Left: Headline & Actions */}
            <div className="lg:col-span-7 flex flex-col items-start text-left max-w-2xl">
              <RevealOnScroll>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#00288e] text-xs font-bold uppercase tracking-[0.16em] mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00288e]" />
                  Employer Solutions
                </div>
              </RevealOnScroll>

              <RevealOnScroll delay={100}>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0f172a] tracking-tight leading-[1.12] mb-5">
                  Hire people who move your{' '}
                  <span className="text-[#00288e]">business forward.</span>
                </h1>
              </RevealOnScroll>

              <RevealOnScroll delay={200}>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-7 max-w-xl">
                  Vakancy.in helps organizations establish their employer presence, publish opportunities, manage job openings, and access recruitment services based on their hiring requirements.
                </p>
              </RevealOnScroll>

              <RevealOnScroll delay={300} className="w-full">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                  <Link
                    to="/register?role=employer"
                    className="inline-flex justify-center items-center gap-2 bg-[#00288e] hover:bg-[#1e40af] text-white text-sm font-bold px-7 py-3.5 rounded-xl transition-colors shadow-sm"
                  >
                    Post a job
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/contact"
                    className="inline-flex justify-center items-center gap-2 bg-white hover:bg-slate-50 border border-slate-300 text-[#0f172a] text-sm font-bold px-7 py-3.5 rounded-xl transition-colors shadow-xs"
                  >
                    Talk to our team
                  </Link>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  Quick employer registration. Verified recruitment platform.
                </p>
              </RevealOnScroll>
            </div>

            {/* Right: Dashboard Visual */}
            <div className="lg:col-span-5 relative w-full">
              <FadeInSection delay={200}>
                <div className="relative w-full aspect-[4/3] max-h-[380px] rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 bg-white">
                  <img
                    src="/images/employer_dashboard.jpg"
                    alt="Vakancy Employer Workspace"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/30 via-transparent to-transparent pointer-events-none" />
                </div>
              </FadeInSection>
            </div>

          </div>
        </div>
      </section>

      {/* 1.5 RECRUITMENT PROMOTIONAL ONBOARDING BANNER */}
      <section className="w-full bg-[#f8fafc]/60 border-b border-slate-200/90 py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-white via-blue-50/30 to-slate-50/70 border border-slate-200/90 shadow-sm p-6 sm:p-10 lg:p-12 relative overflow-hidden">
            {/* Ambient background accents */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-50/30 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
              {/* Left Column: Onboarding Hierarchy & Action */}
              <div className="lg:col-span-7 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/70 text-[#00288e] text-xs font-semibold mb-4 w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00288e]" />
                  <span className="uppercase tracking-wider font-bold text-[11px]">Employer Onboarding</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-600 font-medium text-xs">Verified Hiring Ecosystem</span>
                </div>

                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0f172a] tracking-tight leading-tight">
                  Build your employer presence on Vakancy.in
                </h2>

                <p className="text-sm sm:text-base text-slate-600 mt-4 leading-relaxed max-w-xl">
                  Create your company profile and start publishing jobs to connect with active career professionals.
                </p>

                {/* Practical capability highlights */}
                <div className="flex flex-wrap items-center gap-y-2.5 gap-x-6 mt-6 pt-5 border-t border-slate-200/70 text-xs text-slate-600 font-medium">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00288e] shrink-0" />
                    <span>Direct applicant review</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00288e] shrink-0" />
                    <span>Structured role publishing</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00288e] shrink-0" />
                    <span>Verified company presence</span>
                  </div>
                </div>

                {/* Primary CTA */}
                <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Link
                    to="/register?role=employer"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white text-sm font-bold transition-all shadow-md shadow-blue-900/15"
                  >
                    Register as Employer
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Right Column: Layered Recruitment Composition */}
              <div className="lg:col-span-5 relative">
                <div className="relative mx-auto max-w-md lg:max-w-none">
                  {/* Subtle backing accent frame */}
                  <div className="absolute inset-0 bg-blue-100/60 rounded-2xl transform rotate-2 translate-x-2 translate-y-2 pointer-events-none" />

                  {/* Main recruitment visual container */}
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200/90 shadow-lg bg-white aspect-[4/3] sm:aspect-[16/11]">
                    <img
                      src="/images/recruitment_office.jpg"
                      alt="Vakancy Employer Hiring Workspace"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/35 via-transparent to-transparent pointer-events-none" />
                  </div>

                  {/* Floating contextual UI Card 1 (Top-Left on sm+) */}
                  <div className="hidden sm:flex absolute -top-4 -left-4 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md rounded-xl p-3 items-center gap-2.5 z-10">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#00288e] flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[#0f172a]">Employer Profile</p>
                      <p className="text-[10px] text-slate-500 font-medium">Verified presence & branding</p>
                    </div>
                  </div>

                  {/* Floating contextual UI Card 2 (Bottom-Right on sm+) */}
                  <div className="hidden sm:flex absolute -bottom-4 -right-4 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md rounded-xl p-3 items-center gap-2.5 z-10">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[#0f172a]">Publish Openings</p>
                      <p className="text-[10px] text-slate-500 font-medium">Structured candidate intake</p>
                    </div>
                  </div>
                </div>

                {/* Mobile version of contextual cards (stacked cleanly below image) */}
                <div className="sm:hidden grid grid-cols-2 gap-2.5 mt-3">
                  <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-2.5 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#00288e] flex items-center justify-center shrink-0">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0f172a] truncate">Employer Profile</p>
                      <p className="text-[10px] text-slate-500 truncate">Verified presence</p>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 shadow-xs rounded-xl p-2.5 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Briefcase className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0f172a] truncate">Publish Openings</p>
                      <p className="text-[10px] text-slate-500 truncate">Candidate intake</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. EMPLOYER CHALLENGES (Light Surface with Compact Information Density) */}
      <section className="w-full py-16 sm:py-20 lg:py-22 bg-[#f8fafc] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll className="text-center max-w-2xl mx-auto mb-12 sm:mb-14">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#00288e] mb-2 block">
              Recruitment Reality
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0f172a]">
              Common Hiring Challenges
            </h2>
            <p className="text-base sm:text-lg text-slate-600 mt-3 leading-relaxed">
              Recruitment requires navigating operational and sourcing challenges that standard job portals often fail to address.
            </p>
          </RevealOnScroll>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {challenges.map((challenge, idx) => {
              const Icon = challenge.icon;
              return (
                <StaggerItem
                  key={challenge.title}
                  index={idx}
                  className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-200/80 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#00288e] flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/60">
                        {challenge.tag}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-[#0f172a] mb-2">
                      {challenge.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {challenge.description}
                    </p>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>
      </section>

      {/* 3. EMPLOYER CAPABILITIES (Deep Navy Section - High-Density Recruitment Modules) */}
      <section className="relative w-full py-18 sm:py-20 lg:py-24 bg-[#0f172a] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0f172a] to-[#0f172a] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <RevealOnScroll className="max-w-2xl mb-12 sm:mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-900/40 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-[0.18em] mb-4">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              Employer Capabilities
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
              What Employers Can Do
            </h2>
            <p className="text-base sm:text-lg text-slate-300 mt-4 leading-relaxed">
              A purposeful suite of recruitment tools designed to manage your hiring operations, candidate discovery, and specialist support.
            </p>
          </RevealOnScroll>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-7">
            {capabilities.map((item, idx) => {
              const Icon = item.icon;
              return (
                <StaggerItem
                  key={item.title}
                  index={idx}
                  className="bg-[#1e293b]/90 border border-slate-700/70 rounded-2xl p-7 hover:border-blue-400/50 hover:bg-[#1e293b] transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Icon + Category Tag + Badge */}
                    <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 flex items-center justify-center">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                          {item.tag}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
                        {item.badge}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2.5">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed mb-6">
                      {item.description}
                    </p>

                    {/* Feature Highlights */}
                    <div className="pt-4 border-t border-slate-700/60 space-y-2">
                      {item.features.map((feature, fIdx) => (
                        <div key={fIdx} className="flex items-center gap-2 text-xs text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>
      </section>

      {/* 4. HOW EMPLOYER HIRING WORKS (4-Step Visual Process) */}
      <section className="w-full py-16 sm:py-20 lg:py-24 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll className="text-center max-w-2xl mx-auto mb-14 sm:mb-16">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#00288e] mb-2 block">
              Hiring Process
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0f172a]">
              How Employer Hiring Works
            </h2>
            <p className="text-base sm:text-lg text-slate-600 mt-3">
              Follow a straightforward 4-step path from registration to candidate connection.
            </p>
          </RevealOnScroll>

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {hiringSteps.map((step, idx) => (
              <StaggerItem
                key={step.step}
                index={idx}
                className="bg-[#f8fafc] rounded-2xl p-7 border border-slate-200/80 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <span className="text-3xl font-extrabold text-[#00288e] mb-4 block">
                    {step.step}
                  </span>
                  <h3 className="text-lg font-bold text-[#0f172a] mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* 5. CANDIDATE DATABASE (Privacy Model & Controlled Workflow) */}
      <section className="w-full py-16 sm:py-20 lg:py-24 bg-[#eff6ff]/60 border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-7">
              <RevealOnScroll>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100/80 border border-blue-300 text-[#00288e] text-xs font-bold uppercase tracking-[0.18em] mb-4">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Privacy-First Database Access
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f172a] tracking-tight mb-5">
                  Candidate Database Access Workflow
                </h2>
                <p className="text-base sm:text-lg text-slate-700 leading-relaxed mb-6">
                  Candidate database access on Vakancy.in is a controlled employer service. We do not provide unrestricted public downloads or unverified candidate browsing.
                </p>

                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#00288e] shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-700">
                      <strong>Internal Team Review:</strong> The Vakancy.in internal team reviews and handles candidate information according to our verified recruitment process before profiles are shared.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#00288e] shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-700">
                      <strong>Controlled Employer Permissions:</strong> Employers request access for active hiring requirements rather than engaging in unrestricted data scraping.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#00288e] shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-700">
                      <strong>Transparent Terms:</strong> Where applicable, access terms follow agreed platform workflows without artificial guarantees.
                    </p>
                  </div>
                </div>

                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white font-bold text-sm transition-colors shadow-xs"
                >
                  Inquire About Database Access
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </RevealOnScroll>
            </div>

            <div className="lg:col-span-5">
              <FadeInSection delay={150}>
                <div className="bg-white rounded-3xl p-8 border border-blue-200/80 shadow-md space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#00288e] flex items-center justify-center font-bold">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-[#0f172a]">Privacy Protection</h4>
                      <p className="text-xs text-slate-500">Responsible candidate data management</p>
                    </div>
                  </div>
                  <hr className="border-slate-100" />
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Candidates trust Vakancy.in with their career information. We uphold that trust by ensuring access is provided only to verified employers with legitimate open roles.
                  </p>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                    <span>Approval Status</span>
                    <span className="font-bold text-[#00288e]">Verified Employers Only</span>
                  </div>
                </div>
              </FadeInSection>
            </div>

          </div>
        </div>
      </section>

      {/* 6. RECRUITMENT SUPPORT & VALUE CARDS (Light Neutral Cards with Professional Avatars - No fake CTAs) */}
      <section className="w-full py-16 sm:py-20 lg:py-24 bg-[#f8fafc] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll className="max-w-2xl mb-12 sm:mb-14">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#00288e] mb-2 block">
              Recruitment Support
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0f172a]">
              Dedicated Recruitment Support
            </h2>
            <p className="text-base sm:text-lg text-slate-600 mt-3 leading-relaxed">
              When your team needs additional assistance beyond publishing a job, our recruitment specialists can support your search.
            </p>
          </RevealOnScroll>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {whyEmployersChooseUs.map((item, idx) => (
              <StaggerItem
                key={item.title}
                index={idx}
                className="group bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:shadow-[0_12px_24px_rgba(0,40,142,0.07)] hover:border-blue-200/90 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Visual Anchor: Human Avatar & Category Tag */}
                  <div className="flex items-center justify-between mb-5">
                    <RecruitmentAvatar type={item.avatarType} size="md" />
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-blue-50/80 text-[#00288e] border border-blue-100">
                      {item.tag}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#0f172a] group-hover:text-[#00288e] transition-colors mb-2.5">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* Illustrated Promotional Module: Specialist Recruitment Assistance (Naukri-inspired) */}
          <FadeInSection delay={200} className="mt-10 sm:mt-12">
            <div className="rounded-3xl bg-gradient-to-br from-white via-blue-50/40 to-slate-50 border border-blue-200/90 p-7 sm:p-9 shadow-[0_4px_20px_rgba(0,40,142,0.04)]">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/70 border border-blue-300/80 text-[#00288e] text-xs font-bold uppercase tracking-[0.16em] mb-4">
                    <Sparkles className="w-3.5 h-3.5 text-[#00288e]" />
                    Specialist Recruitment Assistance
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-[#0f172a] tracking-tight mb-3">
                    Need help finding the right candidates?
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6 max-w-xl">
                    Get structured recruitment support from the Vakancy.in specialist team. When your internal hiring bandwidth is stretched or a role requires targeted sourcing, our team can support your candidate search.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      to="/contact"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white font-bold text-sm transition-colors shadow-xs"
                    >
                      Contact Recruitment Team
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <span className="text-xs text-slate-500 font-medium px-2 py-1">
                      Direct consultation with recruitment specialists
                    </span>
                  </div>
                </div>
                <div className="lg:col-span-5 flex justify-center lg:justify-end">
                  <RecruitmentSupportIllustration className="w-full max-w-[280px] h-auto drop-shadow-sm" />
                </div>
              </div>
            </div>
          </FadeInSection>

        </div>
      </section>

      {/* 7. EMPLOYER FINAL CTA (Dark Slate / Blue Gradient) */}
      <FadeInSection className="relative w-full p-4 sm:p-8 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto rounded-[2.5rem] bg-gradient-to-br from-[#0f172a] via-[#111e38] to-[#00288e] overflow-hidden relative shadow-xl">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 px-6 py-16 sm:px-14 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-8">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300 mb-3 block">
                Connect With Us
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-4">
                Have a hiring requirement?
              </h2>
              <p className="text-base sm:text-lg text-slate-200 max-w-xl">
                Share your requirement with Vakancy.in. Our team will understand your hiring needs and guide you toward the appropriate platform and recruitment workflow.
              </p>
            </div>

            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3.5">
              <Link
                to="/register?role=employer"
                className="w-full text-center px-6 py-3.5 rounded-xl bg-white text-[#0f172a] font-bold text-sm hover:bg-slate-100 transition-colors shadow-sm"
              >
                Post a job
              </Link>
              <Link
                to="/contact"
                className="w-full text-center px-6 py-3.5 rounded-xl bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition-colors backdrop-blur-md border border-white/20"
              >
                Talk to our team
              </Link>
            </div>

          </div>
        </div>
      </FadeInSection>

    </PageTransition>
  );
};

export default ForEmployersPage;
