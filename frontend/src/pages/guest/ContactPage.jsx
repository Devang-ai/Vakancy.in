import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail, Phone, Clock, Building2, Users, ShieldCheck,
  CheckCircle2, ArrowRight, MapPin, HelpCircle,
  Briefcase, Lock
} from 'lucide-react';
import API from '../../services/api';
import { PageTransition, RevealOnScroll, StaggerContainer, StaggerItem, FadeInSection } from '../../components/common/Motion';

export const ContactPage = () => {
  const [category, setCategory] = useState('Enterprise Sales');
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', company: '', subject: '', message: ''
  });
  const [loading, setLoading] = useState(false);
  const [successTicket, setSuccessTicket] = useState(null);
  const [error, setError] = useState(null);

  const categories = [
    'Enterprise Sales', 'Recruiter Support', 'Candidate Help', 'Executive Search', 'Media & Legal'
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await API.post('/contact', { ...formData, category });
      if (res && res.success) {
        setSuccessTicket(res.reference || 'REQ-SUCCESS');
        setFormData({ name: '', email: '', phone: '', company: '', subject: '', message: '' });
      } else {
        setError(res?.message || 'Unable to submit enquiry. Please verify your details.');
      }
    } catch (err) {
      console.error('Contact enquiry error:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to submit enquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition className="w-full bg-[#f8fafc] text-[#0f172a] min-h-screen">
      
      {/* 1. DARK HERO SECTION */}
      <section className="relative w-full pt-32 pb-24 lg:pt-40 lg:pb-32 bg-[#0f172a] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,_var(--tw-gradient-stops))] from-blue-900/30 via-[#0f172a] to-[#0f172a] pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            <div className="flex flex-col items-start text-left max-w-2xl">
              <RevealOnScroll>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-900/40 border border-blue-500/20 text-blue-300 text-[10px] font-bold uppercase tracking-[0.2em] mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                  Support & Advisory Hub
                </div>
              </RevealOnScroll>
              
              <RevealOnScroll delay={100}>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.1] mb-6">
                  How can we <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-200">help you?</span>
                </h1>
              </RevealOnScroll>
              
              <RevealOnScroll delay={200}>
                <p className="text-lg text-slate-400 leading-relaxed max-w-lg mb-10">
                  Whether you are an enterprise employer scaling hiring, an executive seeking confidential advisory, or a candidate with questions about your applications, our specialized desks are here for you.
                </p>
              </RevealOnScroll>
            </div>

            <div className="hidden lg:block">
              <FadeInSection delay={200}>
                <div className="relative w-full aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl border border-slate-800">
                  <img src="/images/recruitment_office.jpg" alt="Vakancy Office" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-blue-900/20 mix-blend-overlay"></div>
                </div>
              </FadeInSection>
            </div>

          </div>
        </div>
      </section>

      {/* 2. DEPARTMENTS GRID (Overlapping) */}
      <section className="relative w-full pb-24 -mt-16 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <StaggerItem index={0} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 flex flex-col justify-between hover:-translate-y-2 transition-transform duration-300">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-[#0f172a] mb-2">Enterprise Sales</h3>
                <p className="text-sm text-slate-500 mb-6">Custom employer solutions, institutional hiring mandates, and ATS support.</p>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <a href="mailto:sales@vakancy.in" className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4" /> sales@vakancy.in
                </a>
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" /> SLA: &lt; 2 Business Hours
                </span>
              </div>
            </StaggerItem>

            <StaggerItem index={1} className="bg-[#0f172a] text-white p-8 rounded-3xl shadow-xl border border-slate-800 flex flex-col justify-between hover:-translate-y-2 transition-transform duration-300">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
                  <Briefcase className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Employer Desk</h3>
                <p className="text-sm text-slate-400 mb-6">Assistance with job postings, applicant pipelines, and coordination.</p>
              </div>
              <div className="pt-4 border-t border-slate-800">
                <a href="mailto:employers@vakancy.in" className="text-sm font-bold text-blue-400 hover:text-blue-300 flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4" /> employers@vakancy.in
                </a>
                <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  <Phone className="w-3 h-3" /> +91 (80) 4129-8800
                </span>
              </div>
            </StaggerItem>

            <StaggerItem index={2} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 flex flex-col justify-between hover:-translate-y-2 transition-transform duration-300">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-[#0f172a] mb-2">Candidate Support</h3>
                <p className="text-sm text-slate-500 mb-6">Guidance on applications, account credentials, and job alerts.</p>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <a href="mailto:candidates@vakancy.in" className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4" /> candidates@vakancy.in
                </a>
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" /> 24/7 Knowledge Base
                </span>
              </div>
            </StaggerItem>

            <StaggerItem index={3} className="bg-gradient-to-br from-blue-900 to-[#0f172a] text-white p-8 rounded-3xl shadow-xl border border-blue-800/50 flex flex-col justify-between hover:-translate-y-2 transition-transform duration-300">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
                  <ShieldCheck className="w-6 h-6 text-blue-300" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Executive Search</h3>
                <p className="text-sm text-blue-200/70 mb-6">Discreet inquiries for leadership mandates and retained searches.</p>
              </div>
              <div className="pt-4 border-t border-blue-800/50">
                <a href="mailto:executive@vakancy.in" className="text-sm font-bold text-blue-300 hover:text-white flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4" /> executive@vakancy.in
                </a>
                <span className="text-[11px] text-blue-400 font-medium flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Senior Partner Direct Line
                </span>
              </div>
            </StaggerItem>

          </StaggerContainer>
        </div>
      </section>

      {/* 3. FORM & LOCATIONS GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          
          {/* Left Column: Direct Inquiry Form (7 cols) */}
          <div className="lg:col-span-7">
            <RevealOnScroll>
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-[#0f172a] mb-2">Direct Specialized Inquiry</h2>
                <p className="text-slate-500">Route your request directly to the appropriate regional management team.</p>
              </div>

              {successTicket ? (
                <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-200 text-center flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#0f172a] mb-4">Inquiry Dispatched</h3>
                  <p className="text-slate-600 mb-8 max-w-md">
                    Ticket <strong className="text-blue-600 font-mono">#{successTicket}</strong> has been generated. A senior representative will follow up shortly.
                  </p>
                  <button
                    onClick={() => setSuccessTicket(null)}
                    className="px-6 py-3 bg-[#0f172a] text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    Send Another Inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200 flex flex-col gap-6">
                  {/* Category Chips */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-3">
                      Inquiry Department
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategory(cat)}
                          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                            category === cat
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Full Name *</label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full bg-slate-50 px-4 py-3 rounded-xl text-sm text-[#0f172a] border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Email Address *</label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full bg-slate-50 px-4 py-3 rounded-xl text-sm text-[#0f172a] border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Phone Number</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full bg-slate-50 px-4 py-3 rounded-xl text-sm text-[#0f172a] border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Company</label>
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        className="w-full bg-slate-50 px-4 py-3 rounded-xl text-sm text-[#0f172a] border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Subject *</label>
                    <input
                      type="text"
                      name="subject"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full bg-slate-50 px-4 py-3 rounded-xl text-sm text-[#0f172a] border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Message *</label>
                    <textarea
                      name="message"
                      required
                      rows={4}
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full bg-slate-50 px-4 py-3 rounded-xl text-sm text-[#0f172a] border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-y"
                    />
                  </div>

                  {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

                  <div className="flex items-center justify-between mt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-8 py-4 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {loading ? 'Transmitting...' : 'Send Message'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-medium hidden sm:flex">
                      <ShieldCheck className="w-4 h-4" /> 256-bit Encrypted
                    </span>
                  </div>
                </form>
              )}
            </RevealOnScroll>
          </div>

          {/* Right Column: Office Locations & Regional Desks (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            
            {/* Live Operational Status */}
            <RevealOnScroll delay={100}>
              <div className="bg-[#0f172a] p-6 rounded-3xl shadow-xl border border-slate-800 flex flex-col gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
                <div className="flex items-center gap-4 relative z-10">
                  <span className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-white">All Desks Online</h4>
                    <p className="text-xs text-slate-400">Live response coordinators on standby</p>
                  </div>
                </div>
              </div>
            </RevealOnScroll>

            {/* Office Locations */}
            <RevealOnScroll delay={200}>
              <div className="flex flex-col gap-6">
                <h3 className="text-lg font-bold text-[#0f172a] flex items-center gap-2 border-b border-slate-200 pb-4">
                  <MapPin className="w-5 h-5 text-blue-600" /> Regional Offices
                </h3>

                <div className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all flex flex-col gap-2">
                  <span className="text-sm font-bold text-[#0f172a] group-hover:text-blue-600 transition-colors">Bengaluru Headquarters</span>
                  <span className="text-sm text-slate-500">100ft Road, Indiranagar, Bengaluru, Karnataka 560038</span>
                  <span className="text-sm text-blue-600 font-bold mt-2">Tel: +91 (80) 4129-8800</span>
                </div>

                <div className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all flex flex-col gap-2">
                  <span className="text-sm font-bold text-[#0f172a] group-hover:text-blue-600 transition-colors">Mumbai Financial Desk</span>
                  <span className="text-sm text-slate-500">G-Block, BKC, Mumbai, Maharashtra 400051</span>
                  <span className="text-sm text-blue-600 font-bold mt-2">Tel: +91 (22) 6780-4400</span>
                </div>

                <div className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all flex flex-col gap-2">
                  <span className="text-sm font-bold text-[#0f172a] group-hover:text-blue-600 transition-colors">Gurugram Enterprise</span>
                  <span className="text-sm text-slate-500">DLF Cyber City, Building 10, Gurugram, Haryana 122002</span>
                  <span className="text-sm text-blue-600 font-bold mt-2">Tel: +91 (124) 490-2100</span>
                </div>
              </div>
            </RevealOnScroll>

          </div>
        </div>
      </section>
    </PageTransition>
  );
};

export default ContactPage;

