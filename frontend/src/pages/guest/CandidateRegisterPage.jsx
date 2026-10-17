import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  Building2,
  CheckCircle2,
  ArrowRight,
  User,
  Mail,
  Briefcase,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  Star,
  TrendingUp,
  Shield,
  Award,
  AlertCircle,
  Banknote,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * CandidateRegisterPage Component
 * Candidate Registration Onboarding — Screen 1 of 2.
 * Source of Truth: Google Stitch Screen ID 8ae36de9511a4d389a41fea66dff77b5 ("Vakancy.in - Candidate Registration").
 * Project: Vakancy.in Recruitment Platform Design System (projects/13997293982053869540)
 */
export const CandidateRegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Form inputs
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [experience, setExperience] = useState('');
  const [location, setLocation] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginRedirect, setLoginRedirect] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Password strength calculation
  const getPasswordStrength = (val) => {
    if (!val || val.length === 0) {
      return { score: 0, label: 'Min. 8 characters', color: 'gray' };
    }
    if (val.length < 6) {
      return { score: 1, label: 'Weak', color: 'red' };
    }
    if (val.length < 10) {
      return { score: 3, label: 'Medium (8+ chars)', color: 'teal' };
    }
    return { score: 4, label: 'Strong & Secure', color: 'teal' };
  };

  const strength = getPasswordStrength(password);

  const validateForm = () => {
    const errs = {};
    if (!fullName.trim()) errs.fullName = 'Full Name is required.';
    
    if (!email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) {
      errs.phone = 'Mobile number is required.';
    } else if (cleanPhone.length < 10) {
      errs.phone = 'Mobile number must be at least 10 digits.';
    }

    if (!experience) {
      errs.experience = 'Please select your total experience bracket.';
    }

    if (!location.trim()) {
      errs.location = 'Current city or base location is required.';
    }

    if (!password) {
      errs.password = 'Password is required.';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }

    if (!agreeTerms) {
      errs.agreeTerms = 'You must agree to the Terms of Service and Privacy Policy to continue.';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: fullName.trim(),
        email: email.trim(),
        phone: `+91 ${phone.replace(/\D/g, '')}`,
        password,
        role: 'candidate',
        experience,
        location: location.trim(),
        whatsapp_alerts: whatsappAlerts ? 1 : 0
      };

      const res = await register(payload);
      if (res && res.success) {
        showToast('Candidate account created successfully. Navigating to portal...');
        const redirectUrl = searchParams.get('redirect') || searchParams.get('returnUrl');
        setTimeout(() => {
          navigate(redirectUrl || '/candidate');
        }, 600);
      } else {
        setError(res?.message || 'Registration could not be completed. Please verify your details.');
      }
    } catch (err) {
      setError(err?.message || 'Server error during candidate registration. Please try again.');
      if (err?.login_path) {
        setLoginRedirect(err.login_path);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialRegister = (provider) => {
    showToast(`Connecting to ${provider} Single Sign-On Gateway...`);
  };

  return (
    <div className="w-full bg-[#f8f9ff] min-h-[calc(100vh-16rem)] text-[#0b1c30]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#00288e] text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-[#86f2e4]" />
          <span>{toastMessage}</span>
        </div>
      )}

      <section className="w-full py-8 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* ========================================================================= */}
            {/* LEFT COLUMN: Candidate Benefits & Social Proof (5 cols on Desktop) */}
            {/* ========================================================================= */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              
              {/* Pillar Badge & Headings */}
              <div className="flex flex-col gap-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eff4ff] border border-blue-100/90 w-fit">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#006a61]" />
                  <span className="text-xs text-[#006a61] font-semibold uppercase tracking-wider">
                    Candidate Onboarding • 100% Free
                  </span>
                </div>

                <h1 className="text-3xl lg:text-4xl text-[#0b1c30] tracking-tight leading-tight font-bold">
                  Fast-track your career with verified employers.
                </h1>

                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  India's high-velocity tech &amp; leadership talent network. No blind listings, no ghosting recruiters. Direct hiring corridors into vetted top-tier companies.
                </p>
              </div>

              {/* 3 Core Value Proposition Cards */}
              <div className="flex flex-col gap-4">
                
                {/* Value Prop 1 */}
                <div className="flex items-start gap-3.5 bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
                  <div className="w-10 h-10 rounded-lg bg-[#eff4ff] flex items-center justify-center shrink-0 text-[#1e40af]">
                    <Banknote className="w-5 h-5 text-[#1e40af]" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-sm font-bold text-[#0b1c30]">
                      Salary-Transparent Requisitions
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      View benchmarked CTC breakdowns, fixed pay guarantees, and clear ESOP allocations before submitting your dossier.
                    </p>
                  </div>
                </div>

                {/* Value Prop 2 */}
                <div className="flex items-start gap-3.5 bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
                  <div className="w-10 h-10 rounded-lg bg-[#eff4ff] flex items-center justify-center shrink-0 text-[#1e40af]">
                    <Building2 className="w-5 h-5 text-[#1e40af]" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-sm font-bold text-[#0b1c30]">
                      Direct Hiring Manager Access
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Bypass keyword filters with integrated enterprise pipelines straight into technical leadership at Razorpay, CRED, PhonePe, and Swiggy.
                    </p>
                  </div>
                </div>

                {/* Value Prop 3 */}
                <div className="flex items-start gap-3.5 bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
                  <div className="w-10 h-10 rounded-lg bg-[#eff4ff] flex items-center justify-center shrink-0 text-[#1e40af]">
                    <CheckCircle2 className="w-5 h-5 text-[#1e40af]" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-sm font-bold text-[#0b1c30]">
                      Verified Skill Scorecard
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Stand out instantly with authenticated architectural evaluations, certified past projects, and standardized algorithmic competency.
                    </p>
                  </div>
                </div>
              </div>

              {/* Testimonial Quote Card */}
              <div className="p-5 rounded-xl bg-[#eff4ff] border border-blue-100/90 flex flex-col gap-3 relative overflow-hidden shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-200 flex items-center justify-center font-bold text-[#1e40af] text-sm">
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCb6O7-KIIZACD5tVNThqlakctF0CIWisHmVD16KXb4PwHg39PZnMwlhDYENQegxNNM3V6uLgA-QwRl-RPWDqHobLkXZU-g3VTG1ehdZZuRZ6C_rYlcwdhklb2Xw_dn0gTAI8BHBAhVcgj5l5XWeDlLIP7MO65BWDKbC_7zIbJXzyC-RdqfOMvv563AVV9PiNoqQ9VSIFHiVi9uNguZ_CKSkK8pxH0dhAyWfA9iUSQY1LTgIgKiERhwDw"
                      alt="Aditi Deshmukh portrait"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <span>AD</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-0.5 text-[#006a61]">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-[#006a61] text-[#006a61]" />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-[#0b1c30] pt-0.5">
                      Aditi Deshmukh
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Staff Backend Architect, FinTech
                    </span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 font-medium italic leading-relaxed">
                  "Placed at a leading unicorn in exactly 14 days with an audited 42% hike. The direct access to the VP of Engineering completely skipped bureaucratic recruiter delays."
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-blue-200/50">
                  <span className="text-[11px] text-[#006a61] font-semibold uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-[#006a61]" />
                    42% Guaranteed Hike
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Verified Hiring Dossier #2940
                  </span>
                </div>
              </div>

              {/* Zero Spam Institutional Trust Strip */}
              <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-slate-600">
                  <Shield className="w-4 h-4 text-[#006a61] shrink-0" />
                  <span className="text-xs font-medium">
                    Institutional Data Protection (DPDP Act Compliant)
                  </span>
                </div>
                <span className="text-xs text-[#00288e] font-semibold shrink-0">
                  Zero Spam Guarantee
                </span>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* RIGHT COLUMN: Onboarding Registration Form (7 cols on Desktop) */}
            {/* ========================================================================= */}
            <div className="lg:col-span-7">
              <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-slate-200/90 flex flex-col gap-6">
                
                {/* Header with Title & Step Badge */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-[#0b1c30] tracking-tight">
                      Create Candidate Account
                    </h2>
                    <span className="text-xs px-2.5 py-1 rounded-md bg-[#eff4ff] text-[#1e40af] font-semibold border border-blue-100">
                      Step 1 of 2
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Enter your credentials to begin building your verified profile and unlocked requisition feed.
                  </p>
                </div>

                {/* Social Single Sign-On Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSocialRegister('Google')}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#f8f9ff] hover:bg-slate-100 border border-slate-200/90 transition-colors shadow-xs text-xs font-semibold text-slate-800"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSocialRegister('LinkedIn')}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#f8f9ff] hover:bg-slate-100 border border-slate-200/90 transition-colors shadow-xs text-xs font-semibold text-slate-800"
                  >
                    <svg className="w-4 h-4 shrink-0 fill-[#0A66C2]" viewBox="0 0 24 24">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.27a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24z" />
                    </svg>
                    <span>Continue with LinkedIn</span>
                  </button>
                </div>

                {/* Divider */}
                <div className="relative flex items-center justify-center my-0.5">
                  <div className="w-full h-px bg-slate-200" />
                  <span className="absolute px-3 bg-white text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    Or register with Email
                  </span>
                </div>

                {/* Server Error Alert */}
                {error && (
                  <div
                    role="alert"
                    className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex flex-col gap-2 animate-in fade-in"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span className="font-medium">{error}</span>
                    </div>
                    {loginRedirect && (
                      <Link 
                        to={loginRedirect}
                        className="self-start mt-1 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold rounded-md transition-colors"
                      >
                        Go to Login
                      </Link>
                    )}
                  </div>
                )}

                {/* Registration Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                  
                  {/* Row 1: Full Name & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="fullName" className="text-xs font-semibold text-[#0b1c30]">
                        Full Name <span className="text-rose-600">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <User className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
                        <input
                          id="fullName"
                          name="fullName"
                          type="text"
                          autoComplete="name"
                          value={fullName}
                          onChange={(e) => {
                            setFullName(e.target.value);
                            if (fieldErrors.fullName) setFieldErrors((p) => ({ ...p, fullName: undefined }));
                          }}
                          placeholder="e.g. Rahul Sharma"
                          className={`w-full pl-9 pr-3 py-2 bg-white text-sm text-[#0b1c30] rounded-lg border shadow-xs transition-all focus:outline-none focus:ring-1 ${
                            fieldErrors.fullName
                              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-400 bg-rose-50/20'
                              : 'border-slate-300 focus:border-[#1e40af] focus:ring-[#1e40af]'
                          } placeholder:text-slate-400`}
                        />
                      </div>
                      {fieldErrors.fullName && (
                        <p className="text-rose-600 text-xs font-medium pl-1">{fieldErrors.fullName}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="email" className="text-xs font-semibold text-[#0b1c30]">
                        Work or Personal Email <span className="text-rose-600">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <Mail className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                          }}
                          placeholder="rahul.sharma@example.com"
                          className={`w-full pl-9 pr-3 py-2 bg-white text-sm text-[#0b1c30] rounded-lg border shadow-xs transition-all focus:outline-none focus:ring-1 ${
                            fieldErrors.email
                              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-400 bg-rose-50/20'
                              : 'border-slate-300 focus:border-[#1e40af] focus:ring-[#1e40af]'
                          } placeholder:text-slate-400`}
                        />
                      </div>
                      {fieldErrors.email && (
                        <p className="text-rose-600 text-xs font-medium pl-1">{fieldErrors.email}</p>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Mobile Number & Total Experience */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="phone" className="text-xs font-semibold text-[#0b1c30]">
                        Mobile Number <span className="text-rose-600">*</span>
                      </label>
                      <div className={`flex items-center shadow-xs rounded-lg overflow-hidden border bg-white focus-within:ring-1 ${
                        fieldErrors.phone
                          ? 'border-rose-400 focus-within:border-rose-500 focus-within:ring-rose-400 bg-rose-50/20'
                          : 'border-slate-300 focus-within:border-[#1e40af] focus-within:ring-[#1e40af]'
                      }`}>
                        <span className="px-3 py-2 bg-[#f8f9ff] border-r border-slate-200 text-xs font-semibold text-slate-700 select-none shrink-0">
                          🇮🇳 +91
                        </span>
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          autoComplete="tel"
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: undefined }));
                          }}
                          placeholder="98765 43210"
                          className="w-full px-3 py-2 text-sm text-[#0b1c30] bg-transparent focus:outline-none placeholder:text-slate-400"
                        />
                      </div>
                      {fieldErrors.phone && (
                        <p className="text-rose-600 text-xs font-medium pl-1">{fieldErrors.phone}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="experience" className="text-xs font-semibold text-[#0b1c30]">
                        Total Experience <span className="text-rose-600">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <Briefcase className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
                        <select
                          id="experience"
                          name="experience"
                          value={experience}
                          onChange={(e) => {
                            setExperience(e.target.value);
                            if (fieldErrors.experience) setFieldErrors((p) => ({ ...p, experience: undefined }));
                          }}
                          className={`w-full pl-9 pr-8 py-2 bg-white text-sm text-[#0b1c30] rounded-lg border shadow-xs transition-all focus:outline-none focus:ring-1 appearance-none cursor-pointer ${
                            fieldErrors.experience
                              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-400 bg-rose-50/20'
                              : 'border-slate-300 focus:border-[#1e40af] focus:ring-[#1e40af]'
                          } ${!experience ? 'text-slate-400' : 'text-[#0b1c30]'}`}
                        >
                          <option value="" disabled>Select experience bracket</option>
                          <option value="fresher">Fresher (Entry Level / 0-1 Yr)</option>
                          <option value="1-3">1 - 3 Years (Associate)</option>
                          <option value="3-5">3 - 5 Years (Mid-Senior)</option>
                          <option value="5-8">5 - 8 Years (Lead / Principal)</option>
                          <option value="8+">8+ Years (Executive / Director / VP)</option>
                        </select>
                        <div className="pointer-events-none absolute right-3 text-slate-400 text-xs">
                          ▼
                        </div>
                      </div>
                      {fieldErrors.experience && (
                        <p className="text-rose-600 text-xs font-medium pl-1">{fieldErrors.experience}</p>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Current City / Base & Create Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="location" className="text-xs font-semibold text-[#0b1c30]">
                        Current City / Base <span className="text-rose-600">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <MapPin className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
                        <input
                          id="location"
                          name="location"
                          type="text"
                          value={location}
                          onChange={(e) => {
                            setLocation(e.target.value);
                            if (fieldErrors.location) setFieldErrors((p) => ({ ...p, location: undefined }));
                          }}
                          placeholder="e.g. Bengaluru, Karnataka"
                          className={`w-full pl-9 pr-3 py-2 bg-white text-sm text-[#0b1c30] rounded-lg border shadow-xs transition-all focus:outline-none focus:ring-1 ${
                            fieldErrors.location
                              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-400 bg-rose-50/20'
                              : 'border-slate-300 focus:border-[#1e40af] focus:ring-[#1e40af]'
                          } placeholder:text-slate-400`}
                        />
                      </div>
                      {fieldErrors.location && (
                        <p className="text-rose-600 text-xs font-medium pl-1">{fieldErrors.location}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="password" className="text-xs font-semibold text-[#0b1c30]">
                          Create Password <span className="text-rose-600">*</span>
                        </label>
                        <span className={`text-[11px] font-semibold ${
                          strength.color === 'red' ? 'text-rose-600' : strength.color === 'teal' ? 'text-[#006a61]' : 'text-slate-400'
                        }`}>
                          {strength.label}
                        </span>
                      </div>
                      <div className="relative flex items-center">
                        <Lock className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                          }}
                          placeholder="Min. 8 characters"
                          className={`w-full pl-9 pr-10 py-2 bg-white text-sm text-[#0b1c30] rounded-lg border shadow-xs transition-all focus:outline-none focus:ring-1 ${
                            fieldErrors.password
                              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-400 bg-rose-50/20'
                              : 'border-slate-300 focus:border-[#1e40af] focus:ring-[#1e40af]'
                          } placeholder:text-slate-400`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-700 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {/* Password Strength 4-Bar Meter */}
                      <div className="w-full grid grid-cols-4 gap-1 pt-1">
                        <div className={`h-1 rounded-full ${
                          strength.score >= 1 ? (strength.color === 'red' ? 'bg-rose-500' : 'bg-[#006a61]') : 'bg-slate-200'
                        }`} />
                        <div className={`h-1 rounded-full ${
                          strength.score >= 2 ? 'bg-[#006a61]' : 'bg-slate-200'
                        }`} />
                        <div className={`h-1 rounded-full ${
                          strength.score >= 3 ? 'bg-[#006a61]' : 'bg-slate-200'
                        }`} />
                        <div className={`h-1 rounded-full ${
                          strength.score >= 4 ? 'bg-[#006a61]' : 'bg-slate-200'
                        }`} />
                      </div>
                      {fieldErrors.password && (
                        <p className="text-rose-600 text-xs font-medium pl-1">{fieldErrors.password}</p>
                      )}
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="flex flex-col gap-2 pt-1">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        id="whatsappAlerts"
                        type="checkbox"
                        checked={whatsappAlerts}
                        onChange={(e) => setWhatsappAlerts(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#1e40af] focus:ring-0 cursor-pointer"
                      />
                      <span className="text-xs text-slate-700 leading-tight">
                        <strong className="font-semibold text-[#0b1c30]">Send real-time WhatsApp alerts</strong> for shortlisted roles matching my minimum CTC &amp; remote preference.
                      </span>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        id="agreeTerms"
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => {
                          setAgreeTerms(e.target.checked);
                          if (fieldErrors.agreeTerms) setFieldErrors((p) => ({ ...p, agreeTerms: undefined }));
                        }}
                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#1e40af] focus:ring-0 cursor-pointer"
                      />
                      <span className="text-xs text-slate-600 leading-tight">
                        I agree to the{' '}
                        <a href="/about" className="text-[#1e40af] font-semibold underline hover:text-[#00288e]">
                          Terms of Service
                        </a>
                        ,{' '}
                        <a href="/about" className="text-[#1e40af] font-semibold underline hover:text-[#00288e]">
                          Privacy Policy
                        </a>
                        , and Candidate Integrity Code.
                      </span>
                    </label>
                    {fieldErrors.agreeTerms && (
                      <p className="text-rose-600 text-xs font-medium pl-1">{fieldErrors.agreeTerms}</p>
                    )}
                  </div>

                  {/* Submit Button & Sign In Link */}
                  <div className="pt-2 flex flex-col gap-3">
                    <button
                      id="btn-create-candidate-account"
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 px-4 rounded-lg bg-[#1e40af] hover:bg-[#00288e] text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 group disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Creating Account...</span>
                        </>
                      ) : (
                        <>
                          <span>Create Candidate Account</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>

                    <p className="text-xs text-slate-500 text-center">
                      Already registered on Vakancy.in?{' '}
                      <Link
                        to="/login"
                        className="text-[#1e40af] hover:text-[#00288e] font-semibold hover:underline"
                      >
                        Log in to your candidate portal
                      </Link>
                    </p>
                  </div>
                </form>

                {/* Sub-Banner: Zero Agency Spam */}
                <div className="bg-[#eff4ff] p-3.5 rounded-lg border border-blue-100 flex items-center gap-3">
                  <Award className="w-5 h-5 text-[#006a61] shrink-0" />
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <span className="font-bold text-[#0b1c30]">Zero Agency Spam:</span> Candidates registered on Vakancy.in retain private anonymous profile mode until they actively grant disclosure rights to employers.
                  </p>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};

export default CandidateRegisterPage;
