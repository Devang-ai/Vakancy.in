import React, { useState } from 'react';
import {
  ShieldCheck,
  Briefcase,
  Target,
  ArrowRight,
  Crosshair,
  Users,
  LineChart,
  Lock,
  Layers,
  Award,
  Sparkles,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { PageTransition, RevealOnScroll, StaggerContainer, StaggerItem, FadeInSection } from '../../components/common/Motion';
import API from '../../services/api';

export const ExecutiveSearchPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    subject: '',
    openings_count: '1',
    location: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [reference, setReference] = useState('');
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        subject: formData.subject,
        openings_count: formData.openings_count || 1,
        location: formData.location,
        message: formData.message || `Executive search mandate for ${formData.subject} at ${formData.company}.`,
        category: 'EXECUTIVE_SEARCH',
        source: 'EXECUTIVE_SERVICE'
      };

      const res = await API.post('/contact', payload);
      if (res && res.success) {
        setSuccess(true);
        setReference(res.reference || 'REQ-CONFIRMED');
        setFormData({
          name: '', email: '', phone: '', company: '',
          subject: '', openings_count: '1', location: '', message: ''
        });
      } else {
        setError(res?.message || 'Unable to submit enquiry right now. Please try again.');
      }
    } catch (err) {
      console.error('Executive enquiry failed:', err);
      setError(err?.response?.data?.message || err?.message || 'Unable to submit enquiry right now. Please try again or email us.');
    } finally {
      setLoading(false);
    }
  };

  const situations = [
    {
      title: 'Senior-Level Hiring',
      description: 'Positions with significant executive accountability, department oversight, and critical business ownership.',
    },
    {
      title: 'Leadership Positions',
      description: 'C-suite, VP, and Director-level roles requiring demonstrated strategic vision, team mentorship, and commercial impact.',
    },
    {
      title: 'Specialized Expertise',
      description: 'Roles requiring rare domain knowledge, niche technical depth, or unique industry certifications.',
    },
    {
      title: 'Focused Talent Sourcing',
      description: 'Situations where targeted market mapping and personalized outreach produce better outcomes than public postings.',
    },
  ];

  const methodologySteps = [
    {
      number: '01',
      title: 'Understand',
      description: 'Understand the organization, role, responsibilities, culture, and hiring requirement through consultation.',
    },
    {
      number: '02',
      title: 'Define',
      description: 'Establish the relevant experience, capability profile, leadership benchmarks, and candidate criteria.',
    },
    {
      number: '03',
      title: 'Search',
      description: 'Conduct a focused candidate identification and search process, mapping the market and engaging professionals discreetly.',
    },
    {
      number: '04',
      title: 'Coordinate',
      description: 'Support communication, structured introductions, interview feedback, and coordination throughout the recruitment process.',
    },
  ];

  const roleCategories = [
    {
      icon: Award,
      title: 'Senior Management & Leadership',
      examples: 'Chief Executive, Managing Director, General Manager, Country Head',
    },
    {
      icon: Crosshair,
      title: 'Technology & Engineering',
      examples: 'Chief Technology Officer, VP Engineering, Head of Architecture, Data Director',
    },
    {
      icon: LineChart,
      title: 'Sales & Business Development',
      examples: 'Chief Commercial Officer, Head of Sales, VP Strategic Partnerships',
    },
    {
      icon: ShieldCheck,
      title: 'Finance & Risk',
      examples: 'Chief Financial Officer, Head of FP&A, Director of Corporate Governance',
    },
    {
      icon: Layers,
      title: 'Operations & Supply Chain',
      examples: 'Head of Operations, VP Procurement, Director of Logistics',
    },
    {
      icon: Users,
      title: 'Specialized Professional Roles',
      examples: 'Practice Leaders, Legal Counsel, Chief Human Resources Officer',
    },
  ];

  return (
    <PageTransition className="w-full bg-[#0f172a] text-slate-100 min-h-screen overflow-x-hidden font-sans">
      
      {/* 1. ASYMMETRIC PREMIUM HERO (Benchmark Visual Direction) */}
      <section className="relative w-full pt-10 sm:pt-12 lg:pt-14 pb-16 lg:pb-22 bg-[#0f172a] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,_var(--tw-gradient-stops))] from-blue-900/35 via-[#0f172a] to-[#0f172a] pointer-events-none" />
        <div className="absolute top-1/2 right-0 w-[550px] h-[550px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none transform translate-x-1/3 -translate-y-1/2" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            
            {/* Left: Text Content */}
            <div className="flex flex-col items-start text-left max-w-2xl">
              <RevealOnScroll>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-900/50 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-[0.18em] mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  Focused Sourcing
                </div>
              </RevealOnScroll>
              
              <RevealOnScroll delay={100}>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.12] mb-5">
                  Executive search for{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-blue-200">
                    leadership and specialized roles.
                  </span>
                </h1>
              </RevealOnScroll>
              
              <RevealOnScroll delay={200}>
                <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl mb-8">
                  Vakancy.in provides a focused recruitment approach for organizations looking for senior, leadership, or specialized talent where discretion, depth, and targeted sourcing are required.
                </p>
              </RevealOnScroll>
              
              <RevealOnScroll delay={300}>
                <a
                  href="#enquiry-form"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-[#0f172a] font-bold text-sm hover:bg-slate-100 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                >
                  Discuss your requirement
                  <ArrowRight className="w-4 h-4" />
                </a>
              </RevealOnScroll>
            </div>

            {/* Right: Abstract Radar Visual Component */}
            <div className="hidden lg:block relative w-full h-[460px]">
              <FadeInSection delay={200} className="w-full h-full relative">
                {/* Outer Ring */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-slate-700/60 rounded-full border-dashed" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-blue-500/30 rounded-full" />
                
                {/* Central Target */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full shadow-[0_0_40px_rgba(37,99,235,0.4)] flex items-center justify-center z-20">
                  <span className="w-6 h-6 bg-white rounded-full" />
                </div>

                {/* Satellite Profile 1 */}
                <div className="absolute top-[12%] right-[18%] p-3.5 bg-[#1e293b]/90 backdrop-blur-md rounded-2xl border border-slate-700 shadow-xl z-10 animate-[float_4s_ease-in-out_infinite]">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-400 flex items-center justify-center mb-2">
                    <Award className="w-5 h-5 text-blue-300" />
                  </div>
                  <div className="w-16 h-2 rounded bg-slate-600 mb-1" />
                  <div className="w-10 h-2 rounded bg-blue-500/60" />
                </div>

                {/* Satellite Profile 2 */}
                <div className="absolute bottom-[18%] left-[12%] p-3.5 bg-[#1e293b]/90 backdrop-blur-md rounded-2xl border border-blue-500/30 shadow-xl z-10 animate-[float_5s_ease-in-out_infinite_reverse]">
                  <div className="w-10 h-10 rounded-full bg-sky-500/20 border border-sky-400 flex items-center justify-center mb-2">
                    <Crosshair className="w-5 h-5 text-sky-300" />
                  </div>
                  <div className="w-16 h-2 rounded bg-sky-400/50 mb-1" />
                  <div className="w-10 h-2 rounded bg-blue-500/80" />
                </div>

                {/* Connecting Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" viewBox="0 0 500 500">
                  <line x1="250" y1="250" x2="360" y2="110" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 4" />
                  <line x1="250" y1="250" x2="130" y2="390" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 4" />
                </svg>
              </FadeInSection>
            </div>

          </div>
        </div>
      </section>

      {/* 2. WHEN EXECUTIVE SEARCH MAKES SENSE (Light Surface) */}
      <section className="relative w-full py-18 sm:py-20 lg:py-24 bg-[#f8fafc] text-[#0f172a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll className="max-w-2xl mb-14">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#00288e] mb-2 block">
              Strategic Sourcing
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0f172a]">
              When Executive Search Makes Sense
            </h2>
            <p className="text-base sm:text-lg text-slate-600 mt-3 leading-relaxed">
              Executive Search is suited for critical appointments where traditional job listings are insufficient.
            </p>
          </RevealOnScroll>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {situations.map((item, idx) => (
              <StaggerItem
                key={item.title}
                index={idx}
                className="bg-white rounded-2xl p-7 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#00288e] flex items-center justify-center font-bold mb-4">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-[#0f172a] mb-2.5">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* 3. OUR APPROACH (Deep Slate Section - 4 Steps) */}
      <section className="relative w-full py-18 sm:py-20 lg:py-24 bg-[#0f172a] text-white border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <RevealOnScroll className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400 mb-2 block">
                Methodology
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4">
                Our Approach
              </h2>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
                A structured, consultative methodology designed to understand organizational needs and engage proven leaders.
              </p>
            </RevealOnScroll>

            <div className="hidden lg:block">
              <FadeInSection>
                <div className="relative w-full aspect-[21/9] rounded-3xl overflow-hidden shadow-xl border border-slate-700/60 bg-[#1e293b]">
                  <img
                    src="/images/recruitment_office.jpg"
                    alt="Vakancy Executive Search Methodology"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-blue-900/20 mix-blend-overlay pointer-events-none" />
                </div>
              </FadeInSection>
            </div>
          </div>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {methodologySteps.map((step, idx) => (
              <StaggerItem
                key={step.step}
                index={idx}
                className="bg-[#1e293b]/80 border border-slate-700/60 rounded-2xl p-7 hover:border-blue-500/40 transition-colors flex flex-col justify-between"
              >
                <div>
                  <span className="text-3xl font-extrabold text-blue-400/80 mb-4 block">
                    {step.number}
                  </span>
                  <h4 className="text-xl font-bold text-white mb-2.5">
                    {step.title}
                  </h4>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* 4. ROLES WE CAN SUPPORT (Light Surface - Examples Only) */}
      <section className="relative w-full py-18 sm:py-20 lg:py-24 bg-[#f8fafc] text-[#0f172a] border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll className="max-w-2xl mb-14">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#00288e] mb-2 block">
              Representative Roles
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0f172a]">
              Roles We Can Support
            </h2>
            <p className="text-base sm:text-lg text-slate-600 mt-3 leading-relaxed">
              We coordinate searches across diverse disciplines. These example categories reflect the types of mandates we support.
            </p>
          </RevealOnScroll>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roleCategories.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <StaggerItem
                  key={cat.title}
                  index={idx}
                  className="bg-white rounded-2xl p-7 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#00288e] flex items-center justify-center mb-5">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-[#0f172a] mb-2">
                      {cat.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {cat.examples}
                    </p>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>
      </section>

      {/* 5. WHY A FOCUSED SEARCH (Deep Slate Section) */}
      <section className="relative w-full py-18 sm:py-20 lg:py-24 bg-[#1e293b] text-white border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-5">
              <RevealOnScroll>
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400 mb-2 block">
                  Search vs. Posting
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">
                  Why Choose a Focused Search Approach
                </h2>
                <p className="text-base text-slate-300 leading-relaxed mb-6">
                  Standard job advertising reaches active candidates in the market. A focused search systematically identifies and engages passive leaders who are already performing in key industry roles.
                </p>
                <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-xl border border-slate-700/60 hidden lg:block">
                  <img
                    src="/images/executive_meeting.jpg"
                    alt="Executive Consultation"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-blue-900/15 mix-blend-overlay pointer-events-none" />
                </div>
              </RevealOnScroll>
            </div>

            <div className="lg:col-span-7">
              <StaggerContainer className="flex flex-col gap-5">
                {[
                  {
                    title: 'Narrower Talent Pool',
                    desc: 'When only a limited group of professionals possess the necessary scale, technical background, and domain credentials.',
                  },
                  {
                    title: 'Specific Experience Profiles',
                    desc: 'Leadership demands deep technical, commercial, or operational track records that require qualitative evaluation.',
                  },
                  {
                    title: 'Targeted Sourcing & Discretion',
                    desc: 'Direct outreach ensures strategic mandates are conducted with the highest confidentiality and professional dignity.',
                  },
                  {
                    title: 'Significant Organizational Responsibility',
                    desc: 'Senior appointments shape company direction; thorough vetting and reference alignment minimize hiring risk.',
                  },
                ].map((item, idx) => (
                  <StaggerItem
                    key={item.title}
                    index={idx}
                    className="bg-[#0f172a] p-6 sm:p-7 rounded-2xl border border-slate-700/60 hover:border-blue-500/30 transition-colors"
                  >
                    <h3 className="text-lg font-bold text-white mb-1.5">{item.title}</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">{item.desc}</p>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>

          </div>
        </div>
      </section>

      {/* 6. INTERACTIVE ENQUIRY FORM DESTINATION */}
      <section id="enquiry-form" className="relative w-full py-18 sm:py-24 bg-[#0f172a] overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
        
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <RevealOnScroll>
            <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-8 sm:p-12 rounded-[2.5rem] shadow-2xl border border-slate-700/60 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />

              <div className="mb-10 text-center sm:text-left">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400 mb-2 block">
                  Confidential Inquiry
                </span>
                <h3 className="text-3xl font-extrabold text-white mb-3">
                  Discuss your requirement
                </h3>
                <p className="text-sm sm:text-base text-slate-300">
                  Share your hiring details confidentially. Our recruitment team will review the mandate and connect with you to discuss timelines and search parameters.
                </p>
              </div>

              {success ? (
                <div className="p-8 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-xl font-bold text-white">Mandate Received</h4>
                  <p className="text-xs text-emerald-300 font-mono">Reference: {reference}</p>
                  <p className="text-sm text-emerald-200 max-w-md mx-auto">
                    Thank you. We have received your executive search mandate. An Executive Director will reach out within one business day for a confidential consultation.
                  </p>
                  <button
                    onClick={() => setSuccess(false)}
                    className="mt-4 px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
                  >
                    Submit Another Requirement
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs">
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                        Contact Person *
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g. John Doe"
                        className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                        Work Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="e.g. john@company.com"
                        className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        name="company"
                        required
                        value={formData.company}
                        onChange={handleChange}
                        placeholder="e.g. TechCorp India"
                        className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                        Target Role / Mandate *
                      </label>
                      <input
                        type="text"
                        name="subject"
                        required
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="e.g. Chief Operating Officer"
                        className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                        Openings Count
                      </label>
                      <input
                        type="number"
                        min="1"
                        name="openings_count"
                        value={formData.openings_count}
                        onChange={handleChange}
                        placeholder="1"
                        className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                      Target Location
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="e.g. Bengaluru / Mumbai / Remote"
                      className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                      Mandate Overview & Requirements
                    </label>
                    <textarea
                      rows="3"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Describe the executive mandate, required leadership experience, timeline, or key qualifications..."
                      className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-4 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm transition-colors shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      'Submitting Enquiry...'
                    ) : (
                      <>
                        Submit enquiry
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-slate-400 text-center mt-2">
                    All enquiries are treated strictly confidential under standard recruiter NDA guidelines.
                  </p>
                </form>
              )}
            </div>
          </RevealOnScroll>
        </div>
      </section>

    </PageTransition>
  );
};

export default ExecutiveSearchPage;