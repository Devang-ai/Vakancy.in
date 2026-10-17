import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  FileText,
  Lock,
  Database,
  Eye,
  Server,
  CreditCard,
  Mail,
  Cpu,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { PageTransition, RevealOnScroll, FadeInSection } from '../../components/common/Motion';

export const PrivacyPage = () => {
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', title: '1. Overview & Platform Scope', icon: <Eye className="w-4 h-4" /> },
    { id: 'collection', title: '2. Information We Collect', icon: <Database className="w-4 h-4" /> },
    { id: 'usage', title: '3. How We Use Information', icon: <FileText className="w-4 h-4" /> },
    { id: 'candidate-privacy', title: '4. Candidate Privacy & Resumes', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'cookies', title: '5. Cookies & Technical Data', icon: <Lock className="w-4 h-4" /> },
    { id: 'third-parties', title: '6. Third-Party Services', icon: <Server className="w-4 h-4" /> },
    { id: 'retention', title: '7. Data Retention & Control', icon: <Shield className="w-4 h-4" /> },
    { id: 'user-rights', title: '8. User Rights & Inquiries', icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'updates', title: '9. Updates to this Policy', icon: <Mail className="w-4 h-4" /> },
  ];

  const scrollToSection = (id) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <PageTransition className="w-full bg-[#f8fafc] text-[#0f172a] min-h-screen font-sans">
      
      {/* Premium Hero Section */}
      <section className="relative w-full pt-32 pb-24 bg-[#0f172a] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,_var(--tw-gradient-stops))] from-blue-900/30 via-[#0f172a] to-[#0f172a] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10 text-center flex flex-col items-center">
          <RevealOnScroll>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[10px] font-bold uppercase tracking-[0.2em] mb-6 backdrop-blur-md">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              Privacy & Data Governance
            </div>
          </RevealOnScroll>
          <RevealOnScroll delay={100}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-6">
              Privacy Policy
            </h1>
          </RevealOnScroll>
          <RevealOnScroll delay={200}>
            <p className="text-slate-400 max-w-2xl text-lg leading-relaxed">
              Effective Date: October 1, 2024. Discover how Vakancy protects your personal and enterprise data with uncompromising security.
            </p>
          </RevealOnScroll>
        </div>
      </section>

      {/* Content Section with Sticky Sidebar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          
          {/* Sticky Sidebar Navigation (Desktop) */}
          <div className="hidden lg:block lg:col-span-4 sticky top-28">
            <RevealOnScroll>
              <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5 px-1">
                  Table of Contents
                </h3>
                <nav className="flex flex-col gap-1.5 max-h-[calc(100vh-230px)] overflow-y-auto pr-1">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${
                        activeSection === section.id
                          ? 'bg-blue-50 text-[#00288e]'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span className={activeSection === section.id ? 'text-[#00288e]' : 'text-slate-400'}>
                        {section.icon}
                      </span>
                      <span className="truncate">{section.title}</span>
                    </button>
                  ))}
                </nav>

                <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col gap-2">
                  <Link
                    to="/terms-and-conditions"
                    className="flex items-center justify-between text-xs font-semibold text-slate-500 hover:text-[#00288e] px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <span>Terms & Conditions</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    to="/contact"
                    className="flex items-center justify-between text-xs font-semibold text-slate-500 hover:text-[#00288e] px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <span>Contact Privacy Team</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </RevealOnScroll>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-8 flex flex-col gap-10">
            
            {/* 1. Overview */}
            <FadeInSection id="overview" className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
              <h2 className="text-2xl font-bold text-[#0f172a] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold shrink-0">1</div>
                Overview & Platform Scope
              </h2>
              <div className="max-w-none text-slate-600 text-sm sm:text-base leading-relaxed space-y-4">
                <p>
                  Vakancy.in provides an online technology and recruitment platform designed to connect career candidates with prospective employers and recruitment support services across India.
                </p>
                <p>
                  This Privacy Policy describes our practices regarding the collection, handling, and protection of personal and organizational information submitted through the Vakancy.in website, candidate portal, and employer workspaces.
                </p>
                <p>
                  By using or registering an account on Vakancy.in, you acknowledge the data handling practices outlined in this policy.
                </p>
              </div>
            </FadeInSection>

            {/* 2. Information We Collect */}
            <FadeInSection id="collection" className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
              <h2 className="text-2xl font-bold text-[#0f172a] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold shrink-0">2</div>
                Information We Collect
              </h2>
              <div className="max-w-none text-slate-600 text-sm sm:text-base leading-relaxed space-y-4">
                <p>
                  To deliver verified hiring services, Vakancy.in collects necessary information provided directly by users or generated during platform engagement:
                </p>
                
                <div className="space-y-4 mt-3">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h3 className="font-semibold text-slate-900 text-sm mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Candidate Information
                    </h3>
                    <ul className="text-sm text-slate-600 space-y-1.5 list-disc pl-5">
                      <li>Full name, primary email address, and contact mobile number.</li>
                      <li>Candidate profile details, headline, target role, and location preferences.</li>
                      <li>Resume / CV documents, work experience history, and education qualifications.</li>
                      <li>Submitted job applications, application statuses, and saved job bookmarks.</li>
                      <li>Verified credential or portfolio details provided during profile completion.</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h3 className="font-semibold text-slate-900 text-sm mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Employer & Organization Information
                    </h3>
                    <ul className="text-sm text-slate-600 space-y-1.5 list-disc pl-5">
                      <li>Contact representative name, official email address, and phone number.</li>
                      <li>Company name, website, industry, location, and organizational background.</li>
                      <li>Job posting titles, job specifications, compensation brackets, and hiring requirements.</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h3 className="font-semibold text-slate-900 text-sm mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Account & Communication Details
                    </h3>
                    <ul className="text-sm text-slate-600 space-y-1.5 list-disc pl-5">
                      <li>Authentication credentials (encrypted passwords and authentication tokens).</li>
                      <li>Inquiries submitted through the Contact Us form, including category and subject messages.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </FadeInSection>

            {/* 3. How We Use Information */}
            <FadeInSection id="usage" className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-purple-500"></div>
              <h2 className="text-2xl font-bold text-[#0f172a] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold shrink-0">3</div>
                How We Use Information
              </h2>
              <div className="max-w-none text-slate-600 text-sm sm:text-base leading-relaxed space-y-4">
                <p>
                  Vakancy.in uses collected information solely for legitimate operational and recruitment activities, including:
                </p>
                <ul className="space-y-2 text-sm sm:text-base list-disc pl-5">
                  <li><strong>Account Management:</strong> Provisioning and securing candidate and employer user accounts.</li>
                  <li><strong>Job Applications:</strong> Processing candidate applications submitted to posted openings and notifying hiring teams.</li>
                  <li><strong>Employer Job Management:</strong> Publishing verified job postings and enabling employer candidate review.</li>
                  <li><strong>Recruitment Operations:</strong> Facilitating communication regarding applicant screening, hiring progress, and service updates.</li>
                  <li><strong>Candidate Database Operations:</strong> Powering platform search matching in accordance with the controlled sharing workflow.</li>
                  <li><strong>Platform Optimization:</strong> Monitoring system health, preventing fraud or unauthorized access, and improving usability.</li>
                </ul>
              </div>
            </FadeInSection>

            {/* 4. Candidate Privacy & Resumes */}
            <FadeInSection id="candidate-privacy" className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
              <h2 className="text-2xl font-bold text-[#0f172a] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold shrink-0">4</div>
                Resume & Candidate Information Workflow
              </h2>
              <div className="max-w-none text-slate-600 text-sm sm:text-base leading-relaxed space-y-4">
                <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-100 text-indigo-900 text-sm font-semibold">
                  Controlled Candidate Access Rule: Employers do not receive unrestricted access to private personal details or resumes merely by browsing the platform.
                </div>
                <p>
                  Candidate profiles and resumes submitted on Vakancy.in are governed by structured recruitment workflows:
                </p>
                <ul className="space-y-2 text-sm sm:text-base list-disc pl-5">
                  <li>When a candidate applies directly to a specific job listing, their application details and submitted CV are shared with the hiring company for that specific vacancy.</li>
                  <li>Candidate database access for recruiters and employers is subject to Vakancy.in's internal review and controlled sharing workflow to prevent indiscriminate scraping or spamming.</li>
                  <li>We do not sell candidate contact lists, phone numbers, or email addresses to third-party telemarketers.</li>
                </ul>
              </div>
            </FadeInSection>

            {/* 5. Cookies & Technical Data */}
            <FadeInSection id="cookies" className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-teal-500"></div>
              <h2 className="text-2xl font-bold text-[#0f172a] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 font-bold shrink-0">5</div>
                Cookies & Technical Session Data
              </h2>
              <div className="max-w-none text-slate-600 text-sm sm:text-base leading-relaxed space-y-4">
                <p>
                  Vakancy.in employs browser local storage and session tokens strictly necessary for platform functionality:
                </p>
                <ul className="space-y-2 text-sm sm:text-base list-disc pl-5">
                  <li><strong>Authentication Tokens:</strong> Maintaining authenticated user sessions securely across page visits.</li>
                  <li><strong>Interface Preferences:</strong> Preserving view settings, search filters, and navigation states.</li>
                  <li><strong>Security Headers & Logs:</strong> Recording standard request headers and IP logs to safeguard against malicious traffic and brute-force attempts.</li>
                </ul>
                <p className="text-xs text-slate-500 pt-1">
                  Note: We do not deploy third-party advertising tracking networks or sell browsing profiles to behavioral marketing brokers.
                </p>
              </div>
            </FadeInSection>

            {/* 6. Third-Party Services */}
            <FadeInSection id="third-parties" className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-rose-500"></div>
              <h2 className="text-2xl font-bold text-[#0f172a] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 font-bold shrink-0">6</div>
                Third-Party Service Providers
              </h2>
              <div className="max-w-none text-slate-600 text-sm sm:text-base leading-relaxed space-y-4">
                <p>
                  Vakancy.in integrates with industry-standard infrastructure providers to support platform features:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="font-semibold text-slate-900 text-sm mb-1 flex items-center gap-2">
                      <Server className="w-4 h-4 text-rose-600" />
                      Cloudinary
                    </div>
                    <p className="text-xs text-slate-600">
                      Secure cloud storage and delivery for candidate resumes, profile photos, and company logos.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="font-semibold text-slate-900 text-sm mb-1 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-rose-600" />
                      Resend
                    </div>
                    <p className="text-xs text-slate-600">
                      Transactional email delivery for verification codes, application updates, and recruitment notices.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="font-semibold text-slate-900 text-sm mb-1 flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-rose-600" />
                      Gemini API Services
                    </div>
                    <p className="text-xs text-slate-600">
                      AI processing for automated resume structure formatting and job description generation assistance.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="font-semibold text-slate-900 text-sm mb-1 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-rose-600" />
                      Razorpay
                    </div>
                    <p className="text-xs text-slate-600">
                      PCI-DSS compliant payment processing for employer hiring plans and platform services.
                    </p>
                  </div>
                </div>
              </div>
            </FadeInSection>

            {/* 7. Data Retention */}
            <FadeInSection id="retention" className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-cyan-500"></div>
              <h2 className="text-2xl font-bold text-[#0f172a] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-600 font-bold shrink-0">7</div>
                Data Retention & Account Control
              </h2>
              <div className="max-w-none text-slate-600 text-sm sm:text-base leading-relaxed space-y-4">
                <p>
                  User information is retained for the duration of active platform registration to support continuous job matching, application tracking, and employer recruitment operations.
                </p>
                <p>
                  If you choose to close your account or delete your profile, your active listings and personal identifiers are removed or anonymized from platform search indexes, subject only to reasonable administrative retention required for financial reconciliation, dispute prevention, or legal recordkeeping.
                </p>
              </div>
            </FadeInSection>

            {/* 8. User Rights & Contact */}
            <FadeInSection id="user-rights" className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-violet-500"></div>
              <h2 className="text-2xl font-bold text-[#0f172a] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center text-violet-600 font-bold shrink-0">8</div>
                User Rights & Privacy Requests
              </h2>
              <div className="max-w-none text-slate-600 text-sm sm:text-base leading-relaxed space-y-4">
                <p>
                  Registered users maintain direct control over their information on Vakancy.in:
                </p>
                <ul className="space-y-2 text-sm sm:text-base list-disc pl-5">
                  <li><strong>Profile Editing:</strong> Update or replace your resume, contact details, work history, or job preferences directly inside your candidate profile.</li>
                  <li><strong>Application Oversight:</strong> Track active job submissions and withdrawn applications from your personal dashboard.</li>
                  <li><strong>Privacy & Deletion Requests:</strong> For data inquiries, rectification requests, or account closure assistance, contact our team through the official support channel.</li>
                </ul>
                <div className="pt-2">
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white text-sm font-bold transition-all shadow-md shadow-blue-900/10"
                  >
                    <span>Submit Privacy Inquiry</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </FadeInSection>

            {/* 9. Updates */}
            <FadeInSection id="updates" className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
              <h2 className="text-2xl font-bold text-[#0f172a] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold shrink-0">9</div>
                Updates to this Policy
              </h2>
              <div className="max-w-none text-slate-600 text-sm sm:text-base leading-relaxed space-y-4">
                <p>
                  We may revise this Privacy Policy periodically to reflect enhancements in platform services, regulatory updates, or operational changes.
                </p>
                <p>
                  When changes are implemented, the updated document will be published directly on this page. We encourage users to review this page periodically to remain informed about how Vakancy.in protects your information.
                </p>
              </div>
            </FadeInSection>

          </div>
        </div>
      </section>
    </PageTransition>
  );
};

export default PrivacyPage;
