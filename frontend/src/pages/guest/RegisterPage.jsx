import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  Building2,
  User,
  Mail,
  Phone,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Lock,
  Globe
} from 'lucide-react';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import Toast from '../../components/ui/Toast';
import { PageTransition, RevealOnScroll } from '../../components/common/Motion';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();

  // Changed: No default role, user must select if not provided in URL
  const initialRole = ['employer', 'candidate'].includes(searchParams.get('role')) 
    ? searchParams.get('role') 
    : null;
    
  const [role, setRole] = useState(initialRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [successMode, setSuccessMode] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    const paramRole = searchParams.get('role');
    if (paramRole === 'employer') {
      setRole('employer');
    } else if (paramRole === 'candidate') {
      setRole('candidate');
    }
  }, [searchParams]);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    company_name: '',
    agree_terms: false
  });

  const toastTimer = useRef(null);

  const showToast = (message, type = 'info', title = null) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    const toastObj = typeof message === 'object' && message !== null ? message : { message, type, title };
    setToastMessage(toastObj);
    toastTimer.current = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setError('');
    setFieldErrors({});
    // Reset specific fields when switching roles
    setFormData((prev) => ({
      ...prev,
      company_name: ''
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (error) setError('');
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.first_name.trim()) errs.first_name = 'First name is required.';
    if (!formData.last_name.trim()) errs.last_name = 'Last name is required.';
    
    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!formData.phone.trim()) {
      errs.phone = 'Mobile number is required.';
    } else if (formData.phone.replace(/\D/g, '').length < 10) {
      errs.phone = 'Please enter a valid 10-digit mobile number.';
    }

    if (role === 'employer' && !formData.company_name.trim()) {
      errs.company_name = 'Company name is required for employer registration.';
    }

    if (!formData.password) {
      errs.password = 'Password is required.';
    } else if (formData.password.length < 8) {
      errs.password = 'Password must be at least 8 characters.';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errs.password = 'Password must contain uppercase, lowercase, and numbers.';
    }

    if (formData.password !== formData.confirm_password) {
      errs.confirm_password = 'Passwords do not match.';
    }

    if (!formData.agree_terms) {
      errs.agree_terms = 'You must agree to the Terms of Service to register.';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const payload = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        role: role,
        company_name: role === 'employer' ? formData.company_name.trim() : undefined,
      };

      const res = await API.post('/auth/register', payload);

      if (res && res.success) {
        setSuccessMode(true);
        // Automatically sign in after 3 seconds
        setTimeout(async () => {
          try {
            await login(formData.email, formData.password, role);
            const redirectUrl = searchParams.get('redirect') || searchParams.get('returnUrl');
            if (redirectUrl) {
              navigate(redirectUrl);
            } else if (role === 'employer') {
              navigate('/recruiter/onboarding');
            } else {
              navigate('/candidate/onboarding');
            }
          } catch (err) {
            const redirectUrl = searchParams.get('redirect') || searchParams.get('returnUrl');
            navigate(`/login?role=${role}${redirectUrl ? `&redirect=${encodeURIComponent(redirectUrl)}` : ''}`);
          }
        }, 3000);
      } else {
        setError(res?.message || 'Registration failed. Please check your details.');
      }
    } catch (err) {
      setError(err?.message || 'A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition className="w-full bg-[#0f172a] min-h-screen text-slate-100 font-sans flex flex-col">
      <section className="relative w-full flex-grow flex items-center justify-center py-12 lg:py-24 overflow-hidden">
        
        {/* Background Accents */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,_rgba(37,99,235,0.1),_transparent_70%)] pointer-events-none" />
        <div className="absolute bottom-0 -left-40 w-[600px] h-[600px] rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none translate-y-1/2" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* LEFT COLUMN: Editorial Image & Context */}
            <div className="hidden lg:flex flex-col gap-8 pr-8">
              <RevealOnScroll>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[11px] font-bold uppercase tracking-widest backdrop-blur-md">
                  <Globe className="w-4 h-4 text-blue-400" />
                  Global Talent Network
                </div>
              </RevealOnScroll>

              <RevealOnScroll delay={100}>
                <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.15]">
                  Join the platform connecting <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">elite professionals</span>.
                </h1>
                <p className="text-lg text-slate-400 mt-6 leading-relaxed max-w-lg">
                  Create your unified identity to unlock enterprise hiring tools, confidential executive opportunities, and AI-driven career matching.
                </p>
              </RevealOnScroll>

              <RevealOnScroll delay={200}>
                <div className="relative w-full aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl border border-slate-700/50">
                  <img src="/images/recruitment_office.jpg" alt="Vakancy HQ" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-emerald-900/20 mix-blend-overlay"></div>
                </div>
              </RevealOnScroll>

              <RevealOnScroll delay={300}>
                <div className="flex items-center gap-8 text-slate-400 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" /> AES-256 Encryption
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-emerald-400" /> SOC2 Compliant
                  </div>
                </div>
              </RevealOnScroll>
            </div>

            {/* RIGHT COLUMN: Registration Card */}
            <div className="w-full flex justify-center lg:justify-end">
              <RevealOnScroll delay={150} className="w-full max-w-lg">
                <div className="bg-white rounded-[2rem] shadow-2xl p-8 sm:p-10 text-[#0f172a] relative overflow-hidden">
                  
                  {/* Vakancy brand top border line */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#1E40AF]"></div>

                  {successMode ? (
                    <div className="py-8 flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
                      <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                      </div>
                      <h2 className="text-3xl font-extrabold text-[#0f172a] mb-4">Identity Verified</h2>
                      <p className="text-slate-600 text-lg mb-8 max-w-sm">
                        Your secure account has been created successfully. Generating your personalized workspace...
                      </p>
                      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-full animate-progress origin-left"></div>
                      </div>
                    </div>
                  ) : !role ? (
                    <div className="animate-in fade-in duration-500">
                      <div className="mb-8">
                        <h2 className="text-3xl font-extrabold tracking-tight mb-2">Get Started</h2>
                        <p className="text-slate-500 text-sm">Select your account type to continue.</p>
                      </div>

                      <div className="flex flex-col gap-4">
                        <button
                          onClick={() => setRole('candidate')}
                          className="group relative overflow-hidden flex items-center gap-5 p-5 sm:p-6 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-500 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all text-left"
                        >
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                            <User className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
                          </div>
                          <div className="flex-1 pr-6">
                            <h3 className="text-base sm:text-lg font-bold text-[#0f172a] mb-1">I am a Candidate</h3>
                            <p className="text-xs sm:text-sm text-slate-500">Find premium jobs, build your AI resume, and track applications.</p>
                          </div>
                          <div className="absolute right-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">
                            <ArrowRight className="w-5 h-5 text-blue-500" />
                          </div>
                        </button>

                        <button
                          onClick={() => setRole('employer')}
                          className="group relative overflow-hidden flex items-center gap-5 p-5 sm:p-6 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-[#0f172a] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all text-left"
                        >
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#0f172a] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                            <Building2 className="w-7 h-7 sm:w-8 sm:h-8 text-blue-400" />
                          </div>
                          <div className="flex-1 pr-6">
                            <h3 className="text-base sm:text-lg font-bold text-[#0f172a] mb-1">I am an Employer</h3>
                            <p className="text-xs sm:text-sm text-slate-500">Post jobs, access the talent pool, and use advanced screening tools.</p>
                          </div>
                          <div className="absolute right-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">
                            <ArrowRight className="w-5 h-5 text-[#0f172a]" />
                          </div>
                        </button>
                      </div>

                      <div className="mt-8 text-center">
                        <p className="text-sm text-slate-500">
                          Already have an account?{' '}
                          <Link to="/login" className="text-blue-600 font-bold hover:text-blue-700 underline">
                            Sign in
                          </Link>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-8">
                        <h2 className="text-3xl font-extrabold tracking-tight mb-2">Create Account</h2>
                        <p className="text-slate-500 text-sm">Registering as a {role === 'employer' ? 'Company / Recruiter' : 'Candidate'}.</p>
                      </div>

                      {/* Role Switcher */}
                      <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
                        <button
                          type="button"
                          onClick={() => handleRoleChange('candidate')}
                          className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                            role === 'candidate' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          <User className="w-4 h-4" /> Candidate
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRoleChange('employer')}
                          className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                            role === 'employer' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          <Building2 className="w-4 h-4" /> Employer
                        </button>
                      </div>

                      {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-3 animate-in fade-in">
                          <AlertCircle className="w-5 h-5 shrink-0" />
                          <span className="font-medium">{error}</span>
                        </div>
                      )}

                      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">First Name</label>
                            <input
                              type="text"
                              name="first_name"
                              value={formData.first_name}
                              onChange={handleChange}
                              className={`w-full bg-slate-50 text-[#0f172a] text-sm px-4 py-3 rounded-xl border focus:outline-none transition-all ${
                                fieldErrors.first_name ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                              }`}
                            />
                            {fieldErrors.first_name && <p className="text-red-500 text-[11px] font-medium mt-1">{fieldErrors.first_name}</p>}
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Last Name</label>
                            <input
                              type="text"
                              name="last_name"
                              value={formData.last_name}
                              onChange={handleChange}
                              className={`w-full bg-slate-50 text-[#0f172a] text-sm px-4 py-3 rounded-xl border focus:outline-none transition-all ${
                                fieldErrors.last_name ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                              }`}
                            />
                            {fieldErrors.last_name && <p className="text-red-500 text-[11px] font-medium mt-1">{fieldErrors.last_name}</p>}
                          </div>
                        </div>

                        {role === 'employer' && (
                          <div>
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Company Name</label>
                            <div className="relative">
                              <Building2 className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                              <input
                                type="text"
                                name="company_name"
                                value={formData.company_name}
                                onChange={handleChange}
                                placeholder="e.g. Apex Global"
                                className={`w-full bg-slate-50 text-[#0f172a] text-sm pl-11 pr-4 py-3 rounded-xl border focus:outline-none transition-all ${
                                  fieldErrors.company_name ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                                }`}
                              />
                            </div>
                            {fieldErrors.company_name && <p className="text-red-500 text-[11px] font-medium mt-1">{fieldErrors.company_name}</p>}
                          </div>
                        )}

                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Email Address</label>
                          <div className="relative">
                            <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleChange}
                              placeholder={role === 'employer' ? 'name@company.com' : 'you@example.com'}
                              className={`w-full bg-slate-50 text-[#0f172a] text-sm pl-11 pr-4 py-3 rounded-xl border focus:outline-none transition-all ${
                                fieldErrors.email ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                              }`}
                            />
                          </div>
                          {fieldErrors.email && <p className="text-red-500 text-[11px] font-medium mt-1">{fieldErrors.email}</p>}
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Mobile Number</label>
                          <div className="relative">
                            <Phone className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                              type="tel"
                              name="phone"
                              value={formData.phone}
                              onChange={handleChange}
                              placeholder="+91 98765 43210"
                              className={`w-full bg-slate-50 text-[#0f172a] text-sm pl-11 pr-4 py-3 rounded-xl border focus:outline-none transition-all ${
                                fieldErrors.phone ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                              }`}
                            />
                          </div>
                          {fieldErrors.phone && <p className="text-red-500 text-[11px] font-medium mt-1">{fieldErrors.phone}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Password</label>
                            <div className="relative">
                              <KeyRound className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                              <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className={`w-full bg-slate-50 text-[#0f172a] text-sm pl-11 pr-10 py-3 rounded-xl border focus:outline-none transition-all ${
                                  fieldErrors.password ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                            {fieldErrors.password && <p className="text-red-500 text-[11px] font-medium mt-1">{fieldErrors.password}</p>}
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Confirm</label>
                            <input
                              type={showPassword ? 'text' : 'password'}
                              name="confirm_password"
                              value={formData.confirm_password}
                              onChange={handleChange}
                              placeholder="••••••••"
                              className={`w-full bg-slate-50 text-[#0f172a] text-sm px-4 py-3 rounded-xl border focus:outline-none transition-all ${
                                fieldErrors.confirm_password ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                              }`}
                            />
                            {fieldErrors.confirm_password && <p className="text-red-500 text-[11px] font-medium mt-1">{fieldErrors.confirm_password}</p>}
                          </div>
                        </div>

                        <div className="mt-2">
                          <div className="flex items-start gap-3">
                            <input
                              id="agree_terms"
                              name="agree_terms"
                              type="checkbox"
                              checked={formData.agree_terms}
                              onChange={handleChange}
                              className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                            />
                            <label htmlFor="agree_terms" className="text-xs text-slate-500 cursor-pointer select-none leading-relaxed">
                              I agree to the Vakancy <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>, <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>, and consent to receive platform notifications.
                            </label>
                          </div>
                          {fieldErrors.agree_terms && <p className="text-red-500 text-[11px] font-medium mt-1">{fieldErrors.agree_terms}</p>}
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full mt-4 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {loading ? 'Processing...' : 'Create Account'}
                          {!loading && <ArrowRight className="w-4 h-4" />}
                        </button>
                      </form>

                      <div className="mt-8 flex items-center justify-center gap-4">
                        <div className="h-px bg-slate-200 flex-1"></div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Or</span>
                        <div className="h-px bg-slate-200 flex-1"></div>
                      </div>

                      <div className="mt-6">
                        <button 
                          onClick={() => showToast('Redirecting to Google Sign-Up...')} 
                          className="w-full py-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-sm font-bold transition-all flex items-center justify-center gap-3"
                        >
                          <GoogleIcon /> Continue with Google
                        </button>
                      </div>

                      <div className="mt-8 text-center">
                        <p className="text-sm text-slate-500">
                          Already have an account?{' '}
                          <Link to={`/login?role=${role}`} className="text-blue-600 font-bold hover:text-blue-700 underline">
                            Sign in
                          </Link>
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </RevealOnScroll>
            </div>
            
          </div>
        </div>
      </section>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes progress {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        .animate-progress {
          animation: progress 3s linear forwards;
        }
      `}} />
    </PageTransition>
  );
};

export default RegisterPage;
