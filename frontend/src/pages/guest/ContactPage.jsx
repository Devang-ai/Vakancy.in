import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  HelpCircle,
  MessageSquare,
  Sparkles,
  Send
} from 'lucide-react';
import API from '../../services/api';
import { SUPPORT_EMAIL, SUPPORT_MAILTO, PLATFORM_NAME } from '../../config/constants';
import { PageTransition, RevealOnScroll } from '../../components/common/Motion';
import useSEO from '../../hooks/useSEO';

export const ContactPage = () => {
  useSEO({
    title: 'Contact Support & Employer Advisory | Vakancy.in',
    description: 'Get in touch with the Vakancy recruitment team for candidate support, hiring inquiries, or executive search consultation.',
    canonical: '/contact'
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    website: '' // Honeypot field for bot spam protection
  });

  const [loading, setLoading] = useState(false);
  const [successTicket, setSuccessTicket] = useState(null);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = 'Full name is required.';
    } else if (formData.name.trim().length < 2) {
      errs.name = 'Please provide a valid full name.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!emailRegex.test(formData.email.trim())) {
      errs.email = 'Please provide a valid email address.';
    }

    if (formData.phone && formData.phone.trim().length > 0) {
      const phoneClean = formData.phone.replace(/[\s\-\+\(\)]/g, '');
      if (phoneClean.length < 7 || phoneClean.length > 15) {
        errs.phone = 'Please provide a valid contact number (7-15 digits).';
      }
    }

    if (!formData.subject.trim()) {
      errs.subject = 'Subject is required.';
    } else if (formData.subject.trim().length < 3) {
      errs.subject = 'Subject must be at least 3 characters.';
    }

    if (!formData.message.trim()) {
      errs.message = 'Message is required.';
    } else if (formData.message.trim().length < 10) {
      errs.message = 'Please provide more details in your message (minimum 10 characters).';
    } else if (formData.message.trim().length > 3000) {
      errs.message = 'Message cannot exceed 3,000 characters.';
    }

    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Silent honeypot drop
    if (formData.website) {
      setSuccessTicket('REQ-SUBMITTED');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        category: 'General Enquiry',
        website: formData.website || undefined
      };

      const res = await API.post('/contact', payload);

      if (res && res.success) {
        setSuccessTicket(res.reference || 'REQ-SUCCESS');
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: '',
          message: '',
          website: ''
        });
        setValidationErrors({});
      } else {
        setError(res?.message || 'Unable to submit your enquiry at this time. Please try again or email us directly.');
      }
    } catch (err) {
      console.error('Contact enquiry submission error:', err);
      // Ensure no raw internal database error messages are leaked
      const friendlyError =
        err?.response?.data?.message ||
        err?.message ||
        'Unable to process your request. Please try again later or contact our support email directly.';
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition className="w-full bg-[#f8fafc] text-[#0f172a] min-h-screen">
      {/* 1. HERO SECTION */}
      <section className="relative w-full pt-28 pb-20 lg:pt-36 lg:pb-28 bg-[#0f172a] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,_var(--tw-gradient-stops))] from-blue-900/30 via-[#0f172a] to-[#0f172a] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 z-10 text-center">
          <RevealOnScroll>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-900/40 border border-blue-500/20 text-blue-300 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Official Support & Inquiries
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={100}>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
              Contact Vakancy
            </h1>
          </RevealOnScroll>

          <RevealOnScroll delay={200}>
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Have a question or need assistance? Our team is here to help.
            </p>
          </RevealOnScroll>
        </div>
      </section>

      {/* 2. MAIN CONTENT GRID */}
      <section className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 pb-20 z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Official Support Channels (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Official Support Email Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/90 space-y-6">
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Mail className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Official Support Email</h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  For platform assistance, recruitment advisory, account support, or general enquiries, write to our official desk.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/70 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-900">
                  Primary Mailbox
                </div>
                <a
                  href={SUPPORT_MAILTO}
                  className="text-base font-extrabold text-blue-700 hover:text-blue-800 break-all transition-colors flex items-center gap-2"
                >
                  <span>{SUPPORT_EMAIL}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </a>
              </div>

              <div className="space-y-3 pt-2 text-xs text-slate-600 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Response Time: Typically within 1 business day</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Verified {PLATFORM_NAME} Communications</span>
                </div>
              </div>
            </div>

            {/* Global Communication Desk Visual */}
            <div className="rounded-3xl overflow-hidden shadow-md border border-slate-200/80 bg-white aspect-[16/9] hidden sm:block">
              <img
                src="/images/contact_global_desk.jpg"
                alt="Vakancy Global Support Desk"
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Quick Links Help Card */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/30 text-blue-300 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Frequently Requested</h3>
                  <p className="text-xs text-slate-400">Self-serve answers & portals</p>
                </div>
              </div>

              <div className="space-y-2 pt-2 text-xs">
                <Link
                  to="/jobs"
                  className="block p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 transition-colors border border-slate-700/60"
                >
                  <span className="font-bold text-white">Looking for open vacancies?</span>
                  <p className="text-[11px] text-slate-400">Explore active positions on our job board</p>
                </Link>
                <Link
                  to="/register?role=employer"
                  className="block p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 transition-colors border border-slate-700/60"
                >
                  <span className="font-bold text-white">Hiring talent for your team?</span>
                  <p className="text-[11px] text-slate-400">Create an employer account to post jobs</p>
                </Link>
              </div>
            </div>

          </div>

          {/* Right Column: Contact Form (7 cols) */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200/90">
              
              {successTicket ? (
                <div className="py-8 text-center flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-inner">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  
                  <div className="space-y-2 max-w-md">
                    <h2 className="text-xl font-extrabold text-slate-900">Message Received</h2>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Thank you for contacting Vakancy. Your enquiry has been routed directly to our administration and support team.
                    </p>
                    {successTicket && successTicket !== 'REQ-SUBMITTED' && (
                      <div className="pt-2">
                        <span className="inline-block px-3 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono text-xs font-semibold">
                          Reference: #{successTicket}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={() => setSuccessTicket(null)}
                      className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-colors"
                    >
                      Send Another Message
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-blue-700" />
                      Send Us a Message
                    </h2>
                    <p className="text-xs text-slate-500">
                      Fill out the form below and our team will get back to you shortly.
                    </p>
                  </div>

                  {error && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="font-bold">Submission Notice</div>
                        <div>{error}</div>
                      </div>
                    </div>
                  )}

                  {/* Honeypot field (hidden from real users, traps automated bots) */}
                  <div style={{ display: 'none' }} aria-hidden="true">
                    <label htmlFor="contact_website">Leave this blank</label>
                    <input
                      type="text"
                      id="contact_website"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g. Rahul Sharma"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${
                          validationErrors.name
                            ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                            : 'border-slate-300 focus:ring-blue-600 focus:border-blue-600 bg-white'
                        }`}
                      />
                      {validationErrors.name && (
                        <p className="text-[11px] text-rose-600 mt-1 font-medium">{validationErrors.name}</p>
                      )}
                    </div>

                    {/* Email Address */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="e.g. rahul@example.com"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${
                          validationErrors.email
                            ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                            : 'border-slate-300 focus:ring-blue-600 focus:border-blue-600 bg-white'
                        }`}
                      />
                      {validationErrors.email && (
                        <p className="text-[11px] text-rose-600 mt-1 font-medium">{validationErrors.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Phone Number (Optional) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="e.g. +91 98765 43210"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${
                          validationErrors.phone
                            ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                            : 'border-slate-300 focus:ring-blue-600 focus:border-blue-600 bg-white'
                        }`}
                      />
                      {validationErrors.phone && (
                        <p className="text-[11px] text-rose-600 mt-1 font-medium">{validationErrors.phone}</p>
                      )}
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Subject <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="subject"
                        required
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="e.g. Inquiry regarding recruitment solutions"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${
                          validationErrors.subject
                            ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                            : 'border-slate-300 focus:ring-blue-600 focus:border-blue-600 bg-white'
                        }`}
                      />
                      {validationErrors.subject && (
                        <p className="text-[11px] text-rose-600 mt-1 font-medium">{validationErrors.subject}</p>
                      )}
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Message <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400">
                        {formData.message.length} / 3000 chars
                      </span>
                    </div>
                    <textarea
                      name="message"
                      required
                      rows={5}
                      maxLength={3000}
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Please provide details about your enquiry..."
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 resize-y ${
                        validationErrors.message
                          ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                          : 'border-slate-300 focus:ring-blue-600 focus:border-blue-600 bg-white'
                      }`}
                    />
                    {validationErrors.message && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{validationErrors.message}</p>
                    )}
                  </div>

                  {/* Submit Button & Security Note */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full sm:w-auto px-7 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Sending Message...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Send Message</span>
                        </>
                      )}
                    </button>

                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Protected by Vakancy Spam Defense</span>
                    </div>
                  </div>
                </form>
              )}

            </div>
          </div>

        </div>
      </section>
    </PageTransition>
  );
};

export default ContactPage;
