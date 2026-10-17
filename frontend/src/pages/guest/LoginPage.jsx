import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  User,
  Building2,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowUpRight,
  AlertCircle,
  Smartphone,
  ChevronLeft
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
import Toast from '../../components/ui/Toast';
import API from '../../services/api';
import { PageTransition, RevealOnScroll } from '../../components/common/Motion';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialRole = searchParams.get('role') === 'employer' ? 'employer' : 'candidate';
  const [role, setRole] = useState(initialRole);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [toastMessage, setToastMessage] = useState(null);
  const [mode, setMode] = useState('login'); // 'login' or 'forgot_password'
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const paramRole = searchParams.get('role');
    if (paramRole === 'employer') {
      setRole('employer');
    } else if (paramRole === 'candidate') {
      setRole('candidate');
    }
  }, [searchParams]);

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
  };

  const validateForm = () => {
    const errs = {};
    const trimmedId = identifier.trim();

    if (!trimmedId) {
      errs.identifier = role === 'employer' 
        ? 'Please enter your work email or company admin ID.' 
        : 'Please enter your email address or registered mobile number.';
    } else if (trimmedId.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedId)) {
        errs.identifier = 'Please enter a valid email address.';
      }
    } else if (/^[\d+\s-]+$/.test(trimmedId)) {
      const digitsOnly = trimmedId.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        errs.identifier = 'Mobile number must be at least 10 digits.';
      }
    }

    if (!password) {
      errs.password = 'Please enter your account password.';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
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
      const res = await login(identifier.trim(), password, role);
      if (res && res.success) {
        showToast('Authentication verified. Accessing secure portal...', 'success', 'Login Successful');
        const redirectUrl = searchParams.get('redirect') || searchParams.get('returnUrl');
        const userRole = res.user?.role || role;
        setTimeout(() => {
          if (redirectUrl) {
            if ((userRole === 'employer' || userRole === 'recruiter') && redirectUrl.startsWith('/candidate')) {
              navigate('/recruiter');
            } else if (userRole === 'candidate' && (redirectUrl.startsWith('/recruiter') || redirectUrl.startsWith('/employer'))) {
              navigate('/candidate/dashboard');
            } else {
              navigate(redirectUrl);
            }
          } else if (['director', 'main_admin', 'admin', 'bd_lead', 'tl_coordinator', 'recruiter'].includes(userRole)) {
            navigate('/admin/dashboard');
          } else if (userRole === 'employer') {
            if (res.profile && (!res.profile.is_onboarding_completed || res.profile.is_onboarding_completed === 0)) {
              navigate('/recruiter/onboarding');
            } else {
              navigate('/recruiter');
            }
          } else {
            navigate('/candidate/dashboard');
          }
        }, 600);
      } else {
        setError(res?.message || 'Authentication failed. Please verify your credentials.');
      }
    } catch (err) {
      setError(err?.message || 'Unable to sign in. Please verify your email/phone and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    showToast('Redirecting to Google Sign-In...');
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setMode('forgot_password');
    setError('');
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your email or phone number first.');
      return;
    }
    setLoading(true);
    try {
      const res = await API.post('/auth/forgot-password', { email: identifier.trim() });
      if (res.success) {
        showToast(res.message, 'info');
        setResetToken(res._devToken || ''); // Handle dev token for testing
        setMode('reset_password'); // skip real OTP logic for MVP if token returned directly
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError('Failed to request reset. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value !== '' && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('Please enter a valid new password (min 6 characters).');
      return;
    }
    setLoading(true);
    try {
      const res = await API.post('/auth/reset-password', { token: resetToken, newPassword });
      if (res.success) {
        showToast('Password reset successfully! You can now login.', 'success');
        setMode('login');
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError('Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  
  return (
    <PageTransition className="w-full bg-[#0f172a] min-h-screen text-slate-100 font-sans flex flex-col">
      <section className="relative w-full flex-grow flex items-center justify-center py-12 lg:py-24 overflow-hidden">
        
        {/* Background Accents */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,_rgba(37,99,235,0.1),_transparent_70%)] pointer-events-none" />
        <div className="absolute top-1/2 -right-40 w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none -translate-y-1/2" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* LEFT COLUMN: Editorial Image & Context */}
            <div className="hidden lg:flex flex-col gap-8 pr-8">
              <RevealOnScroll>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[11px] font-bold uppercase tracking-widest backdrop-blur-md">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Secure Identity Gateway
                </div>
              </RevealOnScroll>

              <RevealOnScroll delay={100}>
                <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.15]">
                  The premier portal for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-200">verified talent</span>.
                </h1>
                <p className="text-lg text-slate-400 mt-6 leading-relaxed max-w-lg">
                  Access your enterprise recruitment workspace, candidate profile, or executive dashboard with seamless security.
                </p>
              </RevealOnScroll>

              <RevealOnScroll delay={200}>
                <div className="relative w-full aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl border border-slate-700/50">
                  <img src="/images/executive_meeting.jpg" alt="Corporate Environment" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-blue-900/20 mix-blend-overlay"></div>
                </div>
              </RevealOnScroll>

              <RevealOnScroll delay={300}>
                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 flex flex-col gap-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Test Account Quick Fill</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fillPreset('john.doe@gmail.com', 'candidate')}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors border border-white/5"
                    >
                      Candidate
                    </button>
                    <button
                      type="button"
                      onClick={() => fillPreset('hr@techcorp.com', 'employer')}
                      className="px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-xs font-bold transition-colors border border-blue-500/30"
                    >
                      Employer
                    </button>
                  </div>
                </div>
              </RevealOnScroll>
            </div>

            {/* RIGHT COLUMN: Sign In Card */}
            <div className="w-full flex justify-center lg:justify-end">
              <RevealOnScroll delay={150} className="w-full max-w-md">
                <div className="bg-white rounded-[2rem] shadow-2xl p-8 sm:p-10 text-[#0f172a] relative overflow-hidden">
                  
                  {/* Vakancy brand top border line */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#1E40AF]"></div>

                  {mode === 'login' ? (
                    <>
                      <div className="mb-6">
                        <h2 className="text-3xl font-extrabold tracking-tight mb-2">Welcome back</h2>
                        <p className="text-slate-500 text-sm">Please enter your details to sign in.</p>
                      </div>

                      {/* Role Toggle: Candidate / Employer */}
                      <div className="mb-6">
                        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                          <button
                            type="button"
                            onClick={() => handleRoleChange('candidate')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                              role === 'candidate'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            <User className="w-4 h-4" />
                            Candidate
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRoleChange('employer')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                              role === 'employer'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            <Building2 className="w-4 h-4" />
                            Employer
                          </button>
                        </div>
                      </div>

                      {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-3 animate-in fade-in">
                          <AlertCircle className="w-5 h-5 shrink-0" />
                          <span className="font-medium">{error}</span>
                        </div>
                      )}

                      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                            {role === 'employer' ? 'Work Email' : 'Email Address'}
                          </label>
                          <div className="relative">
                            <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                              id="email"
                              name="email"
                              type="email"
                              value={identifier}
                              onChange={(e) => {
                                setIdentifier(e.target.value);
                                if (fieldErrors.identifier) setFieldErrors((prev) => ({ ...prev, identifier: undefined }));
                              }}
                              placeholder={role === 'employer' ? 'name@company.com' : 'you@example.com'}
                              className={`w-full bg-slate-50 text-[#0f172a] text-sm pl-12 pr-4 py-3.5 rounded-xl border focus:outline-none transition-all ${
                                fieldErrors.identifier ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                              }`}
                            />
                          </div>
                          {fieldErrors.identifier && <p className="text-red-500 text-xs font-medium mt-1.5">{fieldErrors.identifier}</p>}
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Password</label>
                            <button type="button" onClick={() => {setMode('forgot_password'); setError('')}} className="text-xs font-bold text-blue-600 hover:text-blue-700">
                              Forgot?
                            </button>
                          </div>
                          <div className="relative">
                            <KeyRound className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                              id="password"
                              name="password"
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={(e) => {
                                setPassword(e.target.value);
                                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                              }}
                              placeholder="••••••••"
                              className={`w-full bg-slate-50 text-[#0f172a] text-sm pl-12 pr-12 py-3.5 rounded-xl border focus:outline-none transition-all ${
                                fieldErrors.password ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                          {fieldErrors.password && <p className="text-red-500 text-xs font-medium mt-1.5">{fieldErrors.password}</p>}
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-4 mt-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {loading ? 'Verifying...' : 'Sign In'}
                          {!loading && <ArrowRight className="w-4 h-4" />}
                        </button>
                      </form>

                      <div className="mt-8 flex items-center justify-center gap-4">
                        <div className="h-px bg-slate-200 flex-1"></div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Or</span>
                        <div className="h-px bg-slate-200 flex-1"></div>
                      </div>

                      <div className="mt-6">
                        <button onClick={handleGoogleLogin} className="w-full py-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-sm font-bold transition-all flex items-center justify-center gap-3">
                          <GoogleIcon /> Continue with Google
                        </button>
                      </div>

                      <div className="mt-8 text-center">
                        <p className="text-sm text-slate-500">
                          Don't have an account?{' '}
                          <Link to={`/register?role=${role}`} className="text-blue-600 font-bold hover:text-blue-700 underline">
                            Register now
                          </Link>
                        </p>
                      </div>
                    </>
                  ) : mode === 'forgot_password' ? (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                      <button 
                        onClick={() => {
                          setMode('login');
                          setError('');
                        }} 
                        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 font-bold mb-6 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" /> Back to login
                      </button>

                      <div className="mb-8">
                        <h2 className="text-3xl font-extrabold tracking-tight mb-2">Reset Password</h2>
                        <p className="text-slate-500 text-sm">Enter your registered email to receive a reset link.</p>
                      </div>

                      {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-3 animate-in fade-in">
                          <AlertCircle className="w-5 h-5 shrink-0" />
                          <span className="font-medium">{error}</span>
                        </div>
                      )}

                      <form onSubmit={handleRequestOtp} className="flex flex-col gap-5">
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                            {role === 'employer' ? 'Work Email' : 'Email Address'}
                          </label>
                          <div className="relative">
                            <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                              type="text"
                              value={identifier}
                              onChange={(e) => setIdentifier(e.target.value)}
                              placeholder={role === 'employer' ? 'name@company.com' : 'you@example.com'}
                              className="w-full bg-slate-50 text-[#0f172a] text-sm pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none transition-all"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all flex items-center justify-center gap-2"
                        >
                          {loading ? 'Sending...' : 'Send Reset Link'} <ArrowRight className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                      <button 
                        onClick={() => {
                          setMode('forgot_password');
                          setError('');
                        }} 
                        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 font-bold mb-6 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" /> Change email
                      </button>

                      <div className="mb-8">
                        <h2 className="text-3xl font-extrabold tracking-tight mb-2">Set New Password</h2>
                        <p className="text-slate-500 text-sm">
                          Enter your new password below for <br />
                          <span className="font-bold text-slate-800">{identifier}</span>
                        </p>
                      </div>

                      {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-3 animate-in fade-in">
                          <AlertCircle className="w-5 h-5 shrink-0" />
                          <span className="font-medium">{error}</span>
                        </div>
                      )}

                      <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">New Password</label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            className="w-full bg-slate-50 text-[#0f172a] text-sm px-4 py-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none transition-all"
                          />
                        </div>
                        {resetToken && (
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Reset Token (Dev Mode)</label>
                            <input
                              type="text"
                              value={resetToken}
                              onChange={(e) => setResetToken(e.target.value)}
                              className="w-full bg-slate-50 text-[#0f172a] text-sm px-4 py-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none transition-all"
                            />
                          </div>
                        )}
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-4 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white font-bold text-sm shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                      </form>

                      <div className="mt-8 text-center">
                        <p className="text-sm text-slate-500">
                          Need to request again?{' '}
                          <button onClick={handleRequestOtp} className="text-blue-600 font-bold hover:text-blue-700 underline">
                            Resend Link
                          </button>
                        </p>
                      </div>
                    </div>
                  )}

                </div>
              </RevealOnScroll>
            </div>
            
          </div>
        </div>
      </section>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Toast
            type={toastMessage.type || 'info'}
            title={toastMessage.title}
            message={toastMessage.message}
            onClose={() => {
              if (toastTimer.current) clearTimeout(toastTimer.current);
              setToastMessage(null);
            }}
          />
        </div>
      )}
    </PageTransition>
  );
};

export default LoginPage;
