import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

import Toast from '../../components/common/Toast';
/**
 * CandidateCredentialVerificationPage
 * Stitch Screen ID: 04fa948c615e4666a4c4510e8588272d
 * Project: Vakancy.in Recruitment Platform Design System (projects/13997293982053869540)
 * Route: /candidate/verification
 *
 * Screen: Candidate Credential Verification / Contact Verification
 * Features:
 * - Candidate Shell (Sidebar with standard workspace/career navigation, Header with search, notifications, profile)
 * - Centered Verification Dossier Card (max-w-xl) with ambient blur backgrounds
 * - Security Protocol Header Badge (shield_lock + SECURE CREDENTIAL VERIFICATION, DPDP Act compliant badge)
 * - Header: "Verify your contact information" with dynamic target email & phone display
 * - Target Channel Badges: Work Email (mail icon) & Phone SMS/WA (smartphone icon)
 * - OTP 6-Digit Complex:
 *   - Active countdown timer (starts at 02:45, decrements every second)
 *   - 6 discrete digit input boxes with auto-advance, backspace focus return, paste support
 *   - Pre-populated initial Stitch state: ['4', '8', '2', '9', '', ''] with slot 5 focused
 *   - Status indicator: "X of 6 digits entered" + "Auto-validates on completion"
 * - Resend Alternate Rails: "Resend via SMS" and "Resend via WhatsApp" with active feedback
 * - Institutional Cross-Check Notice: Pre-Approved ATS Verification Track (Instant Aadhaar & LinkedIn cross-check)
 * - Primary Action: "Verify & Proceed to Profile Setup" (proceeds to /candidate/profile)
 * - Secondary Action: "Change mobile number or email address" with interactive modal
 * - Trust Assurance Strip: 256-bit SSL encryption • ISO 27001 Certified • Zero spam guarantee
 * - Supplementary Enterprise Help Link: "Contact Candidate Verification Desk"
 * - Portal Footer: DPDP Act 2023 Compliant, Help Desk, "All systems normal"
 */

/* ─────────────────────────────────────────────
   ISOLATED PRESENTATION FALLBACK CONSTANTS
───────────────────────────────────────────── */
const STITCH_VERIFICATION_FALLBACK = {
  candidateName: '',
  headline: '',
  email: 'rahul.sharma@example.com',
  phone: '+91 98765 43210',
  defaultOtp: ['4', '8', '2', '9', '', ''],
  initialSeconds: 165 // 02:45
};

/* ─────────────────────────────────────────────
   CANDIDATE SIDEBAR COMPONENT
───────────────────────────────────────────── */
const CandidateSidebar = () => (
  <aside className="fixed left-0 top-0 h-full w-64 bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between">
    <div className="flex flex-col">
      <div className="h-16 px-6 flex items-center gap-2 bg-white">
        <Link to="/candidate/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#00288e] flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-[#0b1c30] tracking-tight">Vakancy.in</span>
            <span className="text-[10px] font-semibold text-[#444653] uppercase tracking-wider">Candidate Portal</span>
          </div>
        </Link>
      </div>

      <div className="px-3 pt-4">
        <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#444653]">Workspace</p>
        <nav className="flex flex-col gap-0.5">
          <Link
            to="/candidate/dashboard"
            id="nav-dashboard"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-[#444653] hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
              <span className="text-sm font-medium">Dashboard</span>
            </div>
          </Link>
          <Link
            to="/candidate/jobs"
            id="nav-find-jobs"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-[#444653] hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <span className="text-sm font-medium">Find Jobs</span>
            </div>
          </Link>
          <Link
            to="/candidate/applications"
            id="nav-applications"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-[#444653] hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              <span className="text-sm font-medium">Applications</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#e5eeff] text-[#444653] font-semibold">12</span>
          </Link>
          <Link
            to="/candidate/saved"
            id="nav-saved-jobs"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-[#444653] hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
              </svg>
              <span className="text-sm font-medium">Saved Jobs</span>
            </div>
          </Link>
          <Link
            to="/candidate/resume"
            id="nav-my-resume"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-[#444653] hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="text-sm font-medium">My Resume</span>
            </div>
          </Link>
        </nav>
      </div>

      <div className="px-3 pt-4">
        <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#444653]">Career Tools</p>
        <nav className="flex flex-col gap-0.5">
          <Link
            to="/candidate/ai-builder"
            id="nav-ai-builder"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-[#444653] hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
              </svg>
              <span className="text-sm font-medium">AI Resume Builder</span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#dce9ff] text-[#00288e]">AI</span>
          </Link>
        </nav>
      </div>
    </div>

    <div className="p-4 bg-white">
      <div className="bg-[#eff4ff] p-3 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#006a61]" />
          <span className="text-xs font-medium text-[#0b1c30]">System Live</span>
        </div>
        <span className="text-xs text-[#444653]">v2.4</span>
      </div>
    </div>
  </aside>
);

/* ─────────────────────────────────────────────
   CANDIDATE HEADER COMPONENT
───────────────────────────────────────────── */
const CandidateHeader = ({ user }) => {
  const displayName = user?.name || user?.email?.split('@')[0] || STITCH_VERIFICATION_FALLBACK.candidateName;
  const headline = user?.headline || STITCH_VERIFICATION_FALLBACK.headline;
  const avatarUrl = user?.avatar || 'https://lh3.googleusercontent.com/aida/AEtjO1Wo-uvm5-g2HKkMkVKP6YrU3UwlyEZsTA0z0qyPp5vT_K8U_MGK8YrTB1oWJlXofykMoUerAPra0g1pbXUclHHzalIdKqJeG8q8y_pSyEpT6qssVJ39rkqoa6TDQTzH2_n75PROmNnHWqCB-EGRY29UHv8PTRw73kmNsZ1ZvZY4srlzitqDNBmk-VoiS9hFehW8jMvm2v6NVw0eQ66Y0qXAI4pEyiZqeGSkTWKhQfdlb4SFnd0oyS6KYK9e';

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 px-6 flex items-center justify-between">
      <div className="w-96">
        <div className="relative flex items-center bg-[#eff4ff] rounded-lg px-3 py-1.5 focus-within:bg-white focus-within:shadow-[0_1px_4px_rgba(0,0,0,0.08)] transition-all">
          <svg className="w-4 h-4 text-[#444653] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className="w-full bg-transparent border-none outline-none text-xs text-[#0b1c30] placeholder:text-[#444653]/70"
            placeholder="Quick search jobs, companies, skills (Press '/' to jump)..."
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          title="Notifications"
          className="relative p-2 rounded-lg text-[#444653] hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 rounded-full bg-[#ba1a1a] text-white text-[10px] font-bold">
            3
          </span>
        </button>

        <Link
          to="/candidate/settings"
          title="Settings"
          className="p-2 rounded-lg text-[#444653] hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </Link>

        <div className="h-6 w-[1px] bg-[#c4c5d5]/30" />

        <Link to="/candidate/profile" className="flex items-center gap-2 pl-1 cursor-pointer group">
          <img
            alt="Profile"
            className="w-8 h-8 rounded-full object-cover"
            src={avatarUrl}
          />
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-semibold text-[#0b1c30] group-hover:text-[#00288e] transition-colors leading-tight">
              {displayName}
            </span>
            <span className="text-[11px] text-[#444653] leading-tight">
              {headline}
            </span>
          </div>
          <svg className="w-4 h-4 text-[#444653] group-hover:text-[#0b1c30]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </Link>
      </div>
    </header>
  );
};

/* ─────────────────────────────────────────────
   MAIN PAGE COMPONENT
───────────────────────────────────────────── */
export default function CandidateCredentialVerificationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Contact Info State
  const [email, setEmail] = useState(user?.email || STITCH_VERIFICATION_FALLBACK.email);
  const [phone, setPhone] = useState(user?.phone || STITCH_VERIFICATION_FALLBACK.phone);

  // OTP State - Prepopulated with 4 digits matching Stitch view
  const [otpDigits, setOtpDigits] = useState(STITCH_VERIFICATION_FALLBACK.defaultOtp);
  const inputRefs = useRef([]);

  // Timer State
  const [secondsRemaining, setSecondsRemaining] = useState(STITCH_VERIFICATION_FALLBACK.initialSeconds);
  const [isExpired, setIsExpired] = useState(false);

  // Modals & Feedback
  const [isChangeContactModalOpen, setIsChangeContactModalOpen] = useState(false);
  const [tempEmail, setTempEmail] = useState(email);
  const [tempPhone, setTempPhone] = useState(phone);
  const [toastMessage, setToastMessage] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Countdown timer effect
  useEffect(() => {
    if (secondsRemaining <= 0) {
      setIsExpired(true);
      return;
    }
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining]);

  // Focus slot 5 on initial mount matching Stitch
  useEffect(() => {
    if (inputRefs.current[4]) {
      inputRefs.current[4].focus();
    }
  }, []);

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleDigitChange = (index, value) => {
    const val = value.slice(-1); // Take only the last character typed
    const newDigits = [...otpDigits];
    newDigits[index] = val;
    setOtpDigits(newDigits);

    // Auto-advance to next slot
    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
      inputRefs.current[index + 1]?.select();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        inputRefs.current[index - 1]?.select();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setOtpDigits(newDigits);

    // Focus last filled digit or next empty
    const nextIdx = Math.min(pasted.length, 5);
    inputRefs.current[nextIdx]?.focus();
  };

  const handleResend = (channel) => {
    setSecondsRemaining(165);
    setIsExpired(false);
    showToast(`New 6-digit verification code dispatched via ${channel}.`);
  };

  const handleSaveNewContact = (e) => {
    e.preventDefault();
    if (!tempEmail.trim() || !tempPhone.trim()) return;
    setEmail(tempEmail.trim());
    setPhone(tempPhone.trim());
    setIsChangeContactModalOpen(false);
    setOtpDigits(['', '', '', '', '', '']);
    setSecondsRemaining(165);
    setIsExpired(false);
    showToast(`Updated contact information! Fresh verification code sent to ${tempEmail.trim()}.`);
    inputRefs.current[0]?.focus();
  };

  const handleVerifyAndProceed = () => {
    const fullCode = otpDigits.join('');
    if (fullCode.length < 6) {
      showToast('Please enter the complete 6-digit verification passcode.');
      return;
    }
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      showToast('Credentials successfully verified! Redirecting to Candidate Profile...');
      setTimeout(() => {
        navigate('/candidate/profile');
      }, 1000);
    }, 800);
  };

  const enteredCount = otpDigits.filter((d) => d !== '').length;

  return (
    <div className="bg-[#f8f9ff] text-[#0b1c30] min-h-screen antialiased flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <Toast 
          type="info"
          title="Notification"
          description={toastMessage} 
          onClose={() => setToastMessage(null)} 
        />
      )}

      {/* Candidate Fixed Shell */}
      <CandidateSidebar />
      <div className="pl-64 flex flex-col min-h-screen">
        <CandidateHeader user={user} />

        <main className="flex-1 pt-16 w-full bg-[#f8f9ff]">
          <div className="flex flex-col w-full">
            <div className="w-full max-w-[80rem] mx-auto px-4 md:px-6 py-8 flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] relative">
              
              {/* Background Ambient Decorative Geometry */}
              <div className="absolute w-96 h-96 rounded-full bg-[#1e40af]/5 blur-3xl -top-12 -left-12 pointer-events-none" />
              <div className="absolute w-80 h-80 rounded-full bg-[#86f2e4]/15 blur-2xl -bottom-8 -right-8 pointer-events-none" />

              {/* Verification Dossier Card */}
              <div className="w-full max-w-xl bg-white shadow-xl rounded-xl p-6 md:p-8 relative z-10 flex flex-col gap-6 border border-slate-100">
                
                {/* Security Protocol Banner / Header Badge */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#dce9ff] text-[#00288e]">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 6c1.4 0 2.5 1.1 2.5 2.5V11c.6 0 1 .4 1 1v4c0 .6-.4 1-1 1h-5c-.6 0-1-.4-1-1v-4c0-.6.4-1 1-1V9.5C9.5 8.1 10.6 7 12 7zm0 1.5c-.55 0-1 .45-1 1V11h2V9.5c0-.55-.45-1-1-1z" />
                    </svg>
                    <span className="text-[11px] font-bold tracking-wider uppercase">Secure Verification</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#444653] text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#006a61]" />
                    <span>DPDP Act compliant</span>
                  </div>
                </div>

                {/* Header Typography Hierarchy */}
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl font-bold text-[#0b1c30] tracking-tight">
                    Verify your contact information
                  </h1>
                  <p className="text-sm text-[#444653] leading-relaxed">
                    We have sent a 6-digit verification code to <span className="font-semibold text-[#0b1c30]">{email}</span> and <span className="font-semibold text-[#0b1c30]">{phone}</span>.
                  </p>
                </div>

                {/* Target Channel Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#eff4ff] border border-[#dce9ff]">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#00288e] shadow-sm shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                      </svg>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] text-[#444653] font-medium">Work Email</span>
                      <span className="text-xs text-[#0b1c30] font-semibold truncate">{email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#eff4ff] border border-[#dce9ff]">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#006a61] shadow-sm shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
                      </svg>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] text-[#444653] font-medium">Phone (SMS &amp; WA)</span>
                      <span className="text-xs text-[#0b1c30] font-semibold truncate">{phone}</span>
                    </div>
                  </div>
                </div>

                {/* OTP Digit Input Complex */}
                <div className="flex flex-col gap-3 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#444653] uppercase tracking-wider font-semibold">Enter 6-Digit Passcode</span>
                    {/* Live Countdown Timer */}
                    <div className="flex items-center gap-1.5 text-[#ba1a1a] text-xs font-semibold bg-[#ffdad6]/40 px-2.5 py-1 rounded">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span id="countdown">
                        {isExpired ? 'Code expired' : `Code expires in ${formatTime(secondsRemaining)}`}
                      </span>
                    </div>
                  </div>

                  {/* 6 Discrete Digit Inputs */}
                  <div className="grid grid-cols-6 gap-2 sm:gap-3" id="otp-container" onPaste={handlePaste}>
                    {otpDigits.map((digit, index) => (
                      <div key={index} className="flex flex-col items-center">
                        <input
                          ref={(el) => (inputRefs.current[index] = el)}
                          id={`otp-slot-${index + 1}`}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleDigitChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(index, e)}
                          className={`w-full h-14 sm:h-16 text-center text-2xl sm:text-3xl font-bold text-[#0b1c30] rounded-lg transition-all select-all caret-[#00288e] ${
                            index === 4 && digit === ''
                              ? 'bg-white shadow-md border-2 border-[#00288e] outline-none'
                              : 'bg-[#eff4ff] border border-transparent focus:outline-none focus:bg-white focus:border-[#00288e] focus:shadow-md'
                          }`}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Inline Verification Indicator Visual */}
                  <div className="flex items-center justify-between text-[#444653] text-xs px-1">
                    <span className="flex items-center gap-1 font-medium">
                      <svg className="w-4 h-4 text-[#006a61] fill-current" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {enteredCount} of 6 digits entered
                    </span>
                    <span className="text-[#444653]/70">Auto-validates on completion</span>
                  </div>
                </div>

                {/* Resend Alternate Rails */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 rounded-lg bg-[#eff4ff] border border-[#dce9ff]">
                  <span className="text-xs text-[#444653] font-medium text-center sm:text-left">
                    Didn't receive code?
                  </span>
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <button
                      type="button"
                      onClick={() => handleResend('SMS')}
                      className="px-2.5 py-1 rounded bg-white text-[#00288e] hover:bg-[#e5eeff] text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm border border-slate-200"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <span>Resend via SMS</span>
                    </button>
                    <span className="text-[#444653]/40 text-[11px]">or</span>
                    <button
                      type="button"
                      onClick={() => handleResend('WhatsApp')}
                      className="px-2.5 py-1 rounded bg-white text-[#006a61] hover:bg-[#e5eeff] text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm border border-slate-200"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                      <span>Resend via WhatsApp</span>
                    </button>
                  </div>
                </div>

                {/* Institutional Cross-check Notice Badge */}
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#e5eeff] text-[#0b1c30] border border-[#d3e4fe]">
                  <svg className="w-5 h-5 text-[#00288e] fill-current shrink-0 mt-0.5" viewBox="0 0 24 24">
                    <path d="M20 7h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 4h4v3h-4V4zm10 16H4V9h16v11z" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#00288e]">Verified Candidate Profile</span>
                    <p className="text-xs text-[#444653] leading-relaxed">
                      Instant ID &amp; LinkedIn verification available. Connects your profile directly with verified employers.
                    </p>
                  </div>
                </div>

                {/* Primary & Secondary Submission Actions */}
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    id="btn-verify-proceed"
                    type="button"
                    disabled={isVerifying}
                    onClick={handleVerifyAndProceed}
                    className="w-full h-11 bg-[#1e40af] text-white hover:bg-[#00288e] text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 group disabled:opacity-75"
                  >
                    {isVerifying ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Verify &amp; Proceed to Profile Setup</span>
                        <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center pt-1">
                    <button
                      id="btn-change-contact"
                      type="button"
                      onClick={() => {
                        setTempEmail(email);
                        setTempPhone(phone);
                        setIsChangeContactModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-[#444653] hover:text-[#00288e] transition-colors py-1 font-medium"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      <span>Change mobile number or email address</span>
                    </button>
                  </div>
                </div>

                {/* Trust Assurance Strip */}
                <div className="pt-3 mt-1 bg-[#eff4ff]/60 -mx-6 md:-mx-8 -mb-6 md:-mb-8 p-4 rounded-b-xl flex flex-col sm:flex-row items-center justify-center gap-3 text-center text-[#444653] text-[11px] border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-[#006a61]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>Protected by 256-bit SSL encryption</span>
                  </div>
                  <span className="hidden sm:inline text-[#444653]/40">•</span>
                  <div className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-[#006a61]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>ISO 27001 Certified</span>
                  </div>
                  <span className="hidden sm:inline text-[#444653]/40">•</span>
                  <div className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-[#006a61]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
                    </svg>
                    <span>Zero spam guarantee</span>
                  </div>
                </div>
              </div>

              {/* Supplementary Enterprise Candidate Help Micro-link */}
              <div className="mt-6 flex items-center gap-1.5 text-[#444653] text-xs">
                <span>Need corporate clearance assistance?</span>
                <a
                  href="#contact-desk"
                  onClick={(e) => {
                    e.preventDefault();
                    showToast('Candidate Verification Desk: support@vakancy.in • Helpline 1800-842-1000');
                  }}
                  className="font-semibold text-[#00288e] hover:underline flex items-center gap-0.5"
                >
                  <span>Contact Candidate Verification Desk</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </div>

            </div>
          </div>
        </main>

        {/* ─────────────────────────────────────────────
            PORTAL FOOTER
        ───────────────────────────────────────────── */}
        <footer className="w-full bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)] py-4 px-6 mt-auto border-t border-slate-100">
          <div className="w-full max-w-[80rem] mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-[#444653] text-xs">
            <div>© 2025 Vakancy.in Careers Network. All rights reserved.</div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1.5 text-[#006a61] font-medium">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                </svg>
                <span>DPDP Act 2023 Compliant</span>
              </div>
              <Link to="/help" className="hover:text-[#0b1c30] transition-colors">Help Desk</Link>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#006a61]" />
                <span>All systems normal</span>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* ─────────────────────────────────────────────
          CHANGE CONTACT MODAL
      ───────────────────────────────────────────── */}
      {isChangeContactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#00288e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <h3 className="text-base font-bold text-[#0b1c30]">Update Contact Channels</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsChangeContactModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveNewContact} className="mt-4 flex flex-col gap-4">
              <p className="text-xs text-[#444653] leading-relaxed">
                Update your preferred primary email and mobile number. A fresh 6-digit verification passcode will be sent immediately upon saving.
              </p>
              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                  Primary Work Email
                </label>
                <input
                  type="email"
                  value={tempEmail}
                  onChange={(e) => setTempEmail(e.target.value)}
                  placeholder="e.g. rahul.sharma@example.com"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00288e]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                  Primary Mobile Number (SMS &amp; WhatsApp)
                </label>
                <input
                  type="tel"
                  value={tempPhone}
                  onChange={(e) => setTempPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210 or +971 50 123 4567"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00288e]"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsChangeContactModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#444653] hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#00288e] hover:bg-[#1e40af] rounded-lg transition-colors shadow-sm"
                >
                  Save &amp; Request New Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
