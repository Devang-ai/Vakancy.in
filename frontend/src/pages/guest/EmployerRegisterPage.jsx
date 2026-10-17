import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Zap,
  Lock,
  Mail,
  User,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * EmployerRegisterPage Component — Minimal Account Creation
 * Step 1 of Split Flow: Registers employer account only.
 * Source of Truth: Google Stitch Screen ID 0b2e583ad90f4fd68d568b20fea8a60c
 */
export const EmployerRegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  // Minimal registration state
  const [workEmail, setWorkEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [workMobile, setWorkMobile] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);

  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginRedirect, setLoginRedirect] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const validateForm = () => {
    const errs = {};

    if (!workEmail.trim()) {
      errs.workEmail = 'Work email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workEmail.trim())) {
      errs.workEmail = 'Please enter a valid work email address.';
    }

    if (!fullName.trim()) {
      errs.fullName = 'Full Name is required.';
    }

    const cleanMobile = workMobile.replace(/\D/g, '');
    if (!cleanMobile) {
      errs.workMobile = 'Work phone number is required.';
    } else if (cleanMobile.length < 10) {
      errs.workMobile = 'Phone number must be at least 10 digits.';
    }

    if (!accountPassword) {
      errs.accountPassword = 'Password is required.';
    } else if (accountPassword.length < 6) {
      errs.accountPassword = 'Password must be at least 6 characters.';
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Please confirm your password.';
    } else if (accountPassword !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    if (!termsAgreed) {
      errs.termsAgreed = 'Please agree to the Employer Terms of Service.';
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
        email: workEmail.trim(),
        name: fullName.trim(),
        password: accountPassword,
        phone: `+91 ${workMobile.replace(/\D/g, '')}`,
        role: 'employer'
      };

      const res = await register(payload);
      if (res && res.success) {
        // Account created & auto-authenticated -> Redirect to multi-step onboarding
        navigate('/recruiter/onboarding', {
          state: { message: 'Account created successfully! Let’s set up your company profile.' }
        });
      } else {
        setError(res?.message || 'Employer account creation failed. Please try again.');
      }
    } catch (err) {
      setError(err?.message || 'Server error during account registration.');
      if (err?.login_path) {
        setLoginRedirect(err.login_path);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-[#f8f9ff] min-h-[calc(100vh-16rem)] text-[#0b1c30] font-sans" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* LEFT COLUMN: Institutional Branding & Value Proposition */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="flex flex-col gap-2.5">
              <div className="inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[#00288e] text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00288e]" />
                <span>Employer Gateway Registration</span>
              </div>

              <h1 className="text-3xl lg:text-4xl text-[#0b1c30] tracking-tight leading-tight font-bold">
                Create your employer account
              </h1>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Start recruiting pre-cleared engineers, verified specialists, and executive leaders across Tier-1 organizations with enterprise precision.
              </p>
            </div>

            {/* Feature Callouts */}
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-100 shadow-xs">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#00288e] flex items-center justify-center shrink-0 font-bold">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#0b1c30]">Fast Account Setup</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Quick account registration in seconds. Company details are collected in your guided onboarding.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-100 shadow-xs">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-[#006a61] flex items-center justify-center shrink-0 font-bold">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#0b1c30]">Tier-1 Privacy &amp; Data Security</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Strict compliance with enterprise data residency, RBI guidelines, and statutory security standards.</p>
                </div>
              </div>
            </div>

            {/* Bottom Login Redirect */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">Already have an employer account?</span>
              <Link
                to="/login"
                className="text-xs text-[#00288e] font-bold hover:underline flex items-center gap-1"
              >
                Sign In <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* RIGHT COLUMN: Minimal Account Creation Form Card */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8">
              
              <div className="mb-6 pb-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#0b1c30]">Account Registration</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Step 1 of 2: Create your credentials</p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-[#00288e] border border-blue-100">
                  Quick Signup
                </span>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-[#ba1a1a] text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-[#ba1a1a]" />
                    <span>{error}</span>
                  </div>
                  {loginRedirect && (
                    <Link
                      to={loginRedirect}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-[#00288e] hover:bg-[#1e40af] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
                    >
                      <span>Sign In Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">
                    Full Name <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#eff4ff] border ${
                        fieldErrors.fullName ? 'border-[#ba1a1a]' : 'border-slate-200'
                      } text-xs text-[#0b1c30] placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all`}
                    />
                  </div>
                  {fieldErrors.fullName && (
                    <p className="text-[11px] text-[#ba1a1a] mt-1 font-medium">{fieldErrors.fullName}</p>
                  )}
                </div>

                {/* Work Email */}
                <div>
                  <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">
                    Work Email Address <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      value={workEmail}
                      onChange={(e) => setWorkEmail(e.target.value)}
                      placeholder="priya.sharma@company.com"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#eff4ff] border ${
                        fieldErrors.workEmail ? 'border-[#ba1a1a]' : 'border-slate-200'
                      } text-xs text-[#0b1c30] placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all`}
                    />
                  </div>
                  {fieldErrors.workEmail && (
                    <p className="text-[11px] text-[#ba1a1a] mt-1 font-medium">{fieldErrors.workEmail}</p>
                  )}
                </div>

                {/* Work Mobile */}
                <div>
                  <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">
                    Work Mobile Number <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-xs text-slate-500 font-semibold">+91</span>
                    <input
                      type="text"
                      value={workMobile}
                      onChange={(e) => setWorkMobile(e.target.value)}
                      placeholder="98765 43210"
                      className={`w-full pl-12 pr-4 py-2.5 rounded-xl bg-[#eff4ff] border ${
                        fieldErrors.workMobile ? 'border-[#ba1a1a]' : 'border-slate-200'
                      } text-xs text-[#0b1c30] placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all`}
                    />
                  </div>
                  {fieldErrors.workMobile && (
                    <p className="text-[11px] text-[#ba1a1a] mt-1 font-medium">{fieldErrors.workMobile}</p>
                  )}
                </div>

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">
                      Password <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={accountPassword}
                        onChange={(e) => setAccountPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#eff4ff] border ${
                          fieldErrors.accountPassword ? 'border-[#ba1a1a]' : 'border-slate-200'
                        } text-xs text-[#0b1c30] placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {fieldErrors.accountPassword && (
                      <p className="text-[11px] text-[#ba1a1a] mt-1 font-medium">{fieldErrors.accountPassword}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">
                      Confirm Password <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#eff4ff] border ${
                          fieldErrors.confirmPassword ? 'border-[#ba1a1a]' : 'border-slate-200'
                        } text-xs text-[#0b1c30] placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-[#00288e] transition-all`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <p className="text-[11px] text-[#ba1a1a] mt-1 font-medium">{fieldErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                {/* Terms Agreement Checkbox */}
                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsAgreed}
                      onChange={(e) => setTermsAgreed(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-[#00288e] focus:ring-[#00288e]"
                    />
                    <span className="text-xs text-slate-600 leading-relaxed">
                      I agree to the <Link to="/terms-of-service" className="text-[#00288e] font-semibold hover:underline">Terms of Service</Link> and <Link to="/privacy-policy" className="text-[#00288e] font-semibold hover:underline">Privacy Policy</Link>.
                    </span>
                  </label>
                  {fieldErrors.termsAgreed && (
                    <p className="text-[11px] text-[#ba1a1a] mt-1 font-medium">{fieldErrors.termsAgreed}</p>
                  )}
                </div>

                {/* Submit CTA */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-[#00288e] text-white text-xs font-bold hover:bg-[#1e40af] transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 mt-4"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Employer Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default EmployerRegisterPage;
