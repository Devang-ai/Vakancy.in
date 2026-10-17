import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  UserCheck,
  Building2,
  Briefcase,
  AlertCircle,
  Database,
  CreditCard,
  ShieldAlert,
  Award,
  Globe,
  ArrowRight,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import { PageTransition, RevealOnScroll, FadeInSection } from '../../components/common/Motion';

export const TermsPage = () => {
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', title: '1. Platform Overview', icon: <Globe className="w-4 h-4" /> },
    { id: 'candidate-accounts', title: '2. Candidate Accounts & Conduct', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'employer-accounts', title: '3. Employer Accounts & Roles', icon: <Building2 className="w-4 h-4" /> },
    { id: 'job-listings', title: '4. Job Listings & Accuracy', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'applications', title: '5. Applications & Disclaimers', icon: <AlertCircle className="w-4 h-4" /> },
    { id: 'candidate-access', title: '6. Candidate Database Access', icon: <Database className="w-4 h-4" /> },
    { id: 'payments', title: '7. Paid Services & Payments', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'prohibited', title: '8. Prohibited Platform Use', icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'intellectual-property', title: '9. Intellectual Property & Content', icon: <Award className="w-4 h-4" /> },
    { id: 'liability', title: '10. Platform Responsibility & Limits', icon: <FileText className="w-4 h-4" /> },
    { id: 'modifications', title: '11. Changes to Terms', icon: <Globe className="w-4 h-4" /> },
    { id: 'contact', title: '12. Contact & Inquiries', icon: <HelpCircle className="w-4 h-4" /> },
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_0%,_var(--tw-gradient-stops))] from-blue-900/30 via-[#0f172a] to-[#0f172a] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10 text-center flex flex-col items-center">
          <RevealOnScroll>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[10px] font-bold uppercase tracking-[0.2em] mb-6 backdrop-blur-md">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              Platform Terms of Use
            </div>
          </RevealOnScroll>
          <RevealOnScroll delay={100}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-6">
              Terms & Conditions
            </h1>
          </RevealOnScroll>
          <RevealOnScroll delay={200}>
            <p className="text-slate-400 max-w-2xl text-lg leading-relaxed">
              Guidelines and operational conditions governing the use of the Vakancy.in recruitment platform for candidates and employers.
            </p>
          </RevealOnScroll>
        </div>
      </section>

      {/* Main Document Body */}
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
                    to="/privacy-policy"
                    className="flex items-center justify-between text-xs font-semibold text-slate-500 hover:text-[#00288e] px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <span>Privacy Policy</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    to="/contact"
                    className="flex items-center justify-between text-xs font-semibold text-slate-500 hover:text-[#00288e] px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <span>Contact Support</span>
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
                Platform Overview
              </h2>
              <div className="max-w-none text-slate-600 text-sm sm:text-base leading-relaxed space-y-4">
                <p>
                  Vakancy.in ("the Platform") operates an online recruitment and talent discovery ecosystem connecting job seekers ("Candidates") and hiring organizations ("Employers"), alongside recruitment operations support.
                </p>
                <p>
                  By creating an account, browsing job listings, submitting applications, or publishing employment opportunities on Vakancy.in, you agree to comply with and be bound by these Terms & Conditions.
                </p>
              </div>
            </FadeInSection>

            {/* 2. Candidate Accounts */}
            <FadeInSection id="candidate-accounts" className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
              <h2 className="text-2xl font-bold text-[#0f172a] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold shrink-0">2</div>
                Candidate Accounts & Conduct
              </h2>
              <div className="max-w-none text-slate-600 text-sm sm:text-base leading-relaxed space-y-4">
                <p>
                  Job seekers accessing the Platform agree to adhere to the following standards:
                </p>
                <ul className="space-y-2 text-sm sm:text-base list-disc pl-5">
                  <li><strong>Accurate Information:</strong> Candidates must provide truthful, current, and complete details regarding their identity, educational qualifications, employment history, and skills.</li>
                  <li><strong>Resume Authenticity:</strong> Submitted resumes and portfolio links must genuinely reflect the candidate's own work experience and credentials.</li>
                  <li><strong>Account Security:</strong> You are responsible for safeguarding your login credentials and preventing unauthorized access to your account.</li>
                  <li><strong>Appropriate Use:</strong> Candidate accounts must be used solely for genuine career discovery and application purposes.</li>
                </ul>
              </div>
            </FadeInSection>

            {/* 3. Employer Accounts */}
            <FadeInSection id="employer-accounts" className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-purple-500"></div>
              <h2 className="text-2xl font-bold text-[#0f172a] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold shrink-0">3</div>
                Employer Accounts & Roles
              </h2>
              <div className="max-w-none text-slate-600 text-sm sm:text-base leading-relaxed space-y-4">
                <p>
                  Organizations and recruitment representatives using the Platform agree that:
                </p>
                <ul className="space-y-2 text-sm sm:text-base list-disc pl-5">
                  <li><strong>Verified Representation:</strong> Employer profiles must represent legitimate companies or authorized talent acquisition personnel.</li>
                  <li><strong>Bona Fide Hiring:</strong> All job postings must represent genuine, active employment vacancies. Postings designed solely for marketing, lead generation, or fee collection from candidates are strictly prohibited.</li>
                  <li><strong>Data Confidentiality:</strong> Applicant details and resumes shared with an employer may only be used for reviewing qualifications for the relevant role and may not be sold or redistributed.</li>
                  <li><strong>Employment Law Compliance:</strong> Employers are responsible for complying with applicable labor, equal opportunity, and fair employment laws.</li>
                </ul>
              </div>
            </FadeInSection>

            {/* 4. Job Listings */}
            <FadeInSection id="job-listings" className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
              <h2 className="text-2xl font-bold text-[#0f172a] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold shrink-0">4</div>
                Job Listings & Information Accuracy
              </h2>
              <div className="max-w-none text-slate-600 text-sm sm:text-base leading-relaxed space-y-4">
                <p>
                  Employers are solely responsible for the accuracy, completeness, and legitimacy of their published job listings, including role responsibilities, experience criteria, and compensation ranges.
                </p>
                <p>
                  Vakancy.in provides the technology platform, search indexing, and recruitment workflow. While we reserve the right to review or remove listings that violate platform standards, Vakancy.in does not endorse or independently guarantee every job vacancy posted by third-party employers.
                </p>
                <p>
                  Job details and role availability are subject to change by the posting company at any time.
                </p>
              </div>
            </FadeInSection>

            {/* 5. Applications & Disclaimers */}
            <FadeInSection id="applications" className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-amber-500"></div>
              <h2 className="text-2xl font-bold text-[#0f172a] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 font-bold shrink-0">5</div>
                Candidate Applications & Hiring Disclaimers
              </h2>
              <div className="max-w-none text-slate-600 text-sm sm:text-base leading-relaxed space-y-4">
                <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 font-medium text-amber-900 text-sm">
                  Submitting a job application via Vakancy.in connects your profile and CV with the hiring team, but does not guarantee an interview, selection, job offer, or specific compensation.
                </div>
                <p>
                  All evaluation, interviewing, credential verification, and final hiring decisions remain solely within the discretion of the prospective employer. Vakancy.in is not an employer of applicants applying to third-party vacancies and does not guarantee employment outcomes.
                </p>
              </div>
            </FadeInSection>

            {/* 6. Candidate Access */}
            <FadeInSection id="candidate-access" className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-teal-500"></div>
              <h2 className="text-2xl font-bold text-[#0f172a] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 font-bold shrink-0">6</div>
                Candidate Database Access & Controlled Workflows
              </h2>
              <div className="max-w-none text-slate-600 text-sm sm:text-base leading-relaxed space-y-4">
                <p>
                  Vakancy.in enforces a controlled candidate database access workflow. In accordance with agreed platform standards:
                </p>
                <ul className="space-y-2 text-sm sm:text-base list-disc pl-5">
                  <li>Employers and recruiters do not receive unrestricted or unverified access to private personal contact details or candidate resumes simply by browsing the public platform.</li>
                  <li>Candidate database search and candidate introduction services are subject to platform review and controlled sharing workflows.</li>
                  <li>Automated scraping, bulk extraction, or unauthorized harvesting of candidate data is strictly prohibited and subject to immediate account termination.</li>
                </ul>
              </div>
            </FadeInSection>

            {/* 7. Payments */}
            <FadeInSection id="payments" className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-rose-500"></div>
              <h2 className="text-2xl font-bold text-[#0f172a] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 font-bold shrink-0">7</div>
                Paid Services & Payment Flow
              </h2>
              <div className="max-w-none text-slate-600 text-sm sm:text-base leading-relaxed space-y-4">
                <p>
                  Where employers choose premium recruitment plans or specialized recruitment support, transactions are processed securely through established payment gateways (such as Razorpay).
                </p>
                <p>
                  Services and credits are activated as specified in the platform workflow upon confirmed transaction completion. All billing and transaction records are managed through the employer workspace.
                </p>
              </div>
            </FadeInSection>

            {/* 8. Prohibited Conduct */}
            <FadeInSection id="prohibited" className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-red-500"></div>
              <h2 className="text-2xl font-bold text-[#0f172a] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 font-bold shrink-0">8</div>
                Prohibited Platform Conduct
              </h2>
              <div className="max-w-none text-slate-600 text-sm sm:text-base leading-relaxed space-y-4">
                <p>
                  Users may not engage in any of the following activities on Vakancy.in:
                </p>
                <ul className="space-y-2 text-sm sm:text-base list-disc pl-5">
                  <li>Publishing fraudulent, misleading, or deceptive job listings or candidate profiles.</li>
                  <li>Impersonating any person, business entity, or recruitment agency.</li>
                  <li>Requesting unlawful fees, deposits, or payments from candidates as a condition of application or interview.</li>
                  <li>Scraping, crawling, or extracting platform data using automated scripts or bots.</li>
                  <li>Transmitting spam, unsolicited advertising, or malicious code through the platform.</li>
                  <li>Harassing, discriminating against, or violating the privacy of other users.</li>
                </ul>
              </div>
            </FadeInSection>

            {/* 9. Intellectual Property */}
            <FadeInSection id="intellectual-property" className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-cyan-500"></div>
              <h2 className="text-2xl font-bold text-[#0f172a] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-600 font-bold shrink-0">9</div>
                Intellectual Property & Content
              </h2>
              <div className="max-w-none text-slate-600 text-sm sm:text-base leading-relaxed space-y-4">
                <p>
                  The Vakancy.in platform interface, trademarks, brand identity, layout, and underlying code are the property of Vakancy.in and protected under intellectual property laws.
                </p>
                <p>
                  Users retain ownership of the content, resumes, documents, and corporate logos they upload. By uploading materials to the Platform, users grant Vakancy.in a non-exclusive license to host, process, and display such content strictly as necessary to deliver platform recruitment services.
                </p>
              </div>
            </FadeInSection>

            {/* 10. Platform Responsibility & Limits */}
            <FadeInSection id="liability" className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-violet-500"></div>
              <h2 className="text-2xl font-bold text-[#0f172a] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center text-violet-600 font-bold shrink-0">10</div>
                Platform Responsibility & Limitations
              </h2>
              <div className="max-w-none text-slate-600 text-sm sm:text-base leading-relaxed space-y-4">
                <p>
                  Vakancy.in provides its technology platform on an "as is" and "as available" basis. While we strive for continuous availability and verified listings, we do not warrant that platform operations will be uninterrupted or error-free.
                </p>
                <p>
                  Vakancy.in is not liable for disputes arising directly between candidates and hiring employers, employment contractual agreements, compensation negotiations, or decisions made outside the platform.
                </p>
              </div>
            </FadeInSection>

            {/* 11. Changes to Terms */}
            <FadeInSection id="modifications" className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
              <h2 className="text-2xl font-bold text-[#0f172a] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold shrink-0">11</div>
                Changes to Terms
              </h2>
              <div className="max-w-none text-slate-600 text-sm sm:text-base leading-relaxed space-y-4">
                <p>
                  We reserve the right to revise these Terms & Conditions as platform capabilities and legal requirements evolve.
                </p>
                <p>
                  Updated terms will become effective upon being published on this page. Your continued use of Vakancy.in following modifications signifies your acceptance of the updated terms.
                </p>
              </div>
            </FadeInSection>

            {/* 12. Contact */}
            <FadeInSection id="contact" className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-emerald-600"></div>
              <h2 className="text-2xl font-bold text-[#0f172a] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold shrink-0">12</div>
                Contact & Inquiries
              </h2>
              <div className="max-w-none text-slate-600 text-sm sm:text-base leading-relaxed space-y-4">
                <p>
                  For any questions or clarifications regarding these Terms & Conditions, please contact our support team using the official Contact Us page.
                </p>
                <div className="pt-2">
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white text-sm font-bold transition-all shadow-md shadow-blue-900/10"
                  >
                    <span>Contact Support Team</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </FadeInSection>

          </div>
        </div>
      </section>
    </PageTransition>
  );
};

export default TermsPage;
