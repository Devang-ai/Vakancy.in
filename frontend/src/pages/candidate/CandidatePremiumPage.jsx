import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

import Toast from '../../components/common/Toast';
/**
 * CandidatePremiumPage
 * Stitch Screen ID: e2fefc3b367c4a7683ab03e4bc823af3
 * Project: Vakancy.in Recruitment Platform Design System (projects/13997293982053869540)
 * Route: /candidate/premium
 *
 * Screen: Candidate Premium Profile & Salary Benchmarks
 * Scope & Features:
 * - Candidate Shell (Sidebar with Premium Profile active highlight, Header with notifications and user profile)
 * - Breadcrumbs & Context (Workspace > Career Tools > Premium Candidate Suite + Candidate Telemetry Protocol Active shield)
 * - Mandatory Notice of Candidate Equity (Free tier clarification banner guarantee)
 * - Hero Header / Active Plan Showcase (Annual Enterprise Pro, Renewal snapshot, Manage Billing & Invoices CTA)
 * - Live Telemetry (Past 30 Days) - 4-Card Recruiter Discovery & Velocity Grid with sparkline and metrics
 * - Compensation Suite & Bell Curve Telemetry (Staff Distributed Systems Engineer, 1,420 Verified Form-16 Returns)
 * - High-fidelity responsive inline SVG Bell Curve with P25, Current (₹52L), P50 Median (₹58L), Target Ask (₹68L), P75, P90 markers
 * - Percentile breakdown cards and DPDP Act 2023 compliance notice
 * - Interactive Plan Matrix (Monthly ₹1,499 vs Annual ₹9,999 toggle, Standard Free vs Pro Candidate Tier)
 * - Accounting & Compliance Invoices Table (#VAC-INV-9921, #VAC-INV-4188, PDF download simulation, GSTIN update modal)
 * - Interactive Billing Management Drawer / GSTIN editor / Toast notifications
 * - DPDP Act 2023 compliant portal footer
 */

/* ─────────────────────────────────────────────
   ISOLATED PRESENTATION FALLBACK CONSTANTS
───────────────────────────────────────────── */
const STITCH_PREMIUM_PROFILE_FALLBACK = {
  candidateName: '',
  headline: '',
  planName: 'Free Plan',
  planTier: 'Basic Plan • Active',
  verificationBadge: 'Unverified',
  renewalDate: '',
  autoRenews: false,
  gstin: '',
  telemetryNode: '',
  velocityScore: 0,
  velocityPercentile: '',
  metrics: {
    recruiterViews: 0,
    viewLiftPct: '',
    viewsSubtitle: '',
    shortlistsCount: 0,
    shortlistCompanies: [],
    directUnlocks: 0,
    directUnlocksSubtitle: ''
  },
  invoices: []
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
          <Link
            to="/candidate/premium"
            id="nav-premium-profile"
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#1e40af] text-white font-semibold shadow-sm"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-amber-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="text-sm font-medium">Premium Profile</span>
            </div>
            <svg className="w-4 h-4 text-amber-300" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
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
  const displayName = user?.name || user?.email?.split('@')[0] || '';
  const headline = user?.headline || '';
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
export default function CandidatePremiumPage() {
  const { user } = useAuth();

  // Local interactive state
  const [billingCycle, setBillingCycle] = useState('annual'); // 'annual' | 'monthly'
  const [gstin, setGstin] = useState(STITCH_PREMIUM_PROFILE_FALLBACK.gstin);
  const [isGstinModalOpen, setIsGstinModalOpen] = useState(false);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [tempGstin, setTempGstin] = useState(STITCH_PREMIUM_PROFILE_FALLBACK.gstin);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleSaveGstin = (e) => {
    e.preventDefault();
    if (!tempGstin.trim()) return;
    setGstin(tempGstin.trim().toUpperCase());
    setIsGstinModalOpen(false);
    showToast(`GSTIN updated successfully to ${tempGstin.trim().toUpperCase()}`);
  };

  const handleDownloadInvoice = (invoiceId) => {
    showToast(`Downloading official GST tax invoice ${invoiceId}...`);
  };

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
            <div className="w-full max-w-[80rem] mx-auto px-6 py-8 flex flex-col gap-8">

              {/* ─────────────────────────────────────────────
                  1. TOP CONTEXT & BREADCRUMBS
              ───────────────────────────────────────────── */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-[#444653] text-xs font-semibold">
                  <Link to="/candidate/dashboard" className="hover:text-[#00288e] transition-colors">Workspace</Link>
                  <svg className="w-3.5 h-3.5 text-[#757684]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-[#444653]/80">Career Tools</span>
                  <svg className="w-3.5 h-3.5 text-[#757684]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-[#00288e] font-semibold">Premium Candidate Suite</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#006a61] text-xs bg-[#e5eeff] px-3 py-1 rounded-full shadow-sm font-medium">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                  </svg>
                  <span>Priority Recruiter Spotlight Active</span>
                </div>
              </div>

              {/* ─────────────────────────────────────────────
                  2. FREE TIER CLARIFICATION BANNER (MANDATORY NOTICE)
              ───────────────────────────────────────────── */}
              <div className="relative overflow-hidden rounded-xl bg-[#e5eeff] p-4 shadow-sm border border-[#d3e4fe]">
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded-lg bg-white text-[#00288e] shadow-sm shrink-0 mt-0.5">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                    </svg>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-[#0b1c30] uppercase font-bold tracking-wide">Notice of Candidate Equity</span>
                    <p className="text-xs text-[#444653] leading-relaxed">
                      Normal job search and direct applications always remain <strong className="font-semibold text-[#0b1c30]">100% free</strong> on Vakancy.in. Premium unlocks priority recruiter visibility, verified compensation benchmarks, and spotlight placement with top employers.
                    </p>
                  </div>
                </div>
              </div>

              {/* ─────────────────────────────────────────────
                  3. HERO HEADER / ACTIVE PLAN SHOWCASE
              ───────────────────────────────────────────── */}
              <div className="rounded-xl bg-gradient-to-r from-[#1e40af] via-[#00288e] to-[#3e4c60] text-white p-8 shadow-md relative overflow-hidden">
                {/* Decorative Backdrop Graphic */}
                <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-[#3755c3]/20 blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                  <div className="flex flex-col gap-2 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 text-xs font-semibold uppercase tracking-wider">
                        <svg className="w-3.5 h-3.5 fill-current text-amber-300" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        {STITCH_PREMIUM_PROFILE_FALLBACK.planTier}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#89f5e7]/20 text-[#89f5e7] text-xs font-medium">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {STITCH_PREMIUM_PROFILE_FALLBACK.verificationBadge}
                      </span>
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-white">
                      Get discovered by the right recruiters.
                    </h1>
                    <p className="text-sm text-[#a8b8ff] max-w-xl leading-relaxed">
                      Your profile is actively visible to top employers looking for distributed systems and backend engineering expertise across Bengaluru, Hyderabad, and NCR.
                    </p>
                  </div>

                  {/* Plan Snapshot Box */}
                  <div className="bg-white text-[#0b1c30] p-6 rounded-xl shadow-md flex flex-col gap-4 min-w-[280px]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#444653] uppercase tracking-wider font-semibold">Subscription Status</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-[#86f2e4] text-[#006f66] font-semibold">
                        Auto-renews
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-base font-bold text-[#0b1c30]">{STITCH_PREMIUM_PROFILE_FALLBACK.planName}</span>
                      <span className="text-xs text-[#444653]">Renewal: {STITCH_PREMIUM_PROFILE_FALLBACK.renewalDate}</span>
                    </div>
                    <div className="flex flex-col gap-2 pt-1">
                      <button
                        id="btn-manage-billing"
                        type="button"
                        onClick={() => setIsBillingModalOpen(true)}
                        className="w-full flex items-center justify-center gap-2 bg-[#1e40af] text-white text-xs font-semibold py-2 px-4 rounded-lg hover:bg-[#00288e] transition-colors shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
                        </svg>
                        <span>Manage Billing &amp; Invoices</span>
                      </button>
                      <button
                        id="btn-download-gst-invoices"
                        type="button"
                        onClick={() => showToast('All verified GST invoices bundled into export archive.')}
                        className="w-full flex items-center justify-center gap-2 bg-[#e5eeff] text-[#444653] text-xs font-semibold py-2 px-4 rounded-lg hover:text-[#0b1c30] hover:bg-[#dce9ff] transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Download GST Invoices</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─────────────────────────────────────────────
                  4. LIVE TELEMETRY / RECRUITER DISCOVERY METRICS
              ───────────────────────────────────────────── */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs text-[#00288e] uppercase font-bold tracking-wider">Activity Overview (Past 30 Days)</span>
                    <h2 className="text-xl font-bold text-[#0b1c30]">Recruiter Views &amp; Discovery Activity</h2>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-[#444653] text-xs">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#006a61] animate-pulse" />
                    <span>Updated live for Bengaluru Region</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Metric 1: Recruiter View Lift */}
                  <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col justify-between gap-4 border border-slate-100">
                    <div className="flex items-start justify-between">
                      <div className="p-2 rounded-lg bg-[#eff4ff] text-[#00288e]">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                        </svg>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[#006a61] text-xs bg-[#eff4ff] px-2 py-0.5 rounded-full font-semibold">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        {STITCH_PREMIUM_PROFILE_FALLBACK.metrics.viewLiftPct} vs standard
                      </span>
                    </div>
                    <div>
                      <span className="text-3xl font-bold text-[#0b1c30]">{STITCH_PREMIUM_PROFILE_FALLBACK.metrics.recruiterViews}</span>
                      <div className="flex items-center gap-1 text-[#444653] text-xs font-semibold mt-1">
                        <span>Recruiter Profile Views</span>
                        <span className="text-[#00288e] font-bold">(4x Lift)</span>
                      </div>
                      <p className="text-xs text-[#444653] mt-1 leading-normal">
                        {STITCH_PREMIUM_PROFILE_FALLBACK.metrics.viewsSubtitle}
                      </p>
                    </div>
                    {/* Sparkline representation */}
                    <div className="pt-1">
                      <svg className="w-full h-8 text-[#00288e] overflow-visible" fill="none" viewBox="0 0 100 24">
                        <path d="M0 20 Q 15 18, 30 14 T 60 9 T 85 4 L 100 2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
                        <path d="M0 20 Q 15 18, 30 14 T 60 9 T 85 4 L 100 2 L 100 24 L 0 24 Z" fill="currentColor" fillOpacity="0.08" />
                      </svg>
                    </div>
                  </div>

                  {/* Metric 2: Priority Search Inclusions */}
                  <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col justify-between gap-4 border border-slate-100">
                    <div className="flex items-start justify-between">
                      <div className="p-2 rounded-lg bg-[#eff4ff] text-[#00288e]">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <rect x="2" y="4" width="20" height="16" rx="2" /><line x1="8" y1="9" x2="16" y2="9" /><line x1="8" y1="13" x2="14" y2="13" /><line x1="8" y1="17" x2="11" y2="17" />
                        </svg>
                      </div>
                      <span className="inline-flex items-center text-[#444653] text-xs bg-[#e5eeff] px-2 py-0.5 rounded-full font-medium">
                        Enterprise Queue
                      </span>
                    </div>
                    <div>
                      <span className="text-3xl font-bold text-[#0b1c30]">{STITCH_PREMIUM_PROFILE_FALLBACK.metrics.shortlistsCount}</span>
                      <div className="text-xs font-semibold text-[#444653] mt-1">High-Priority Shortlists</div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {STITCH_PREMIUM_PROFILE_FALLBACK.metrics.shortlistCompanies.map((comp) => (
                          <span key={comp} className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-[#e5eeff] text-[#0b1c30]">
                            {comp}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-[11px] text-[#444653] pt-1">
                      Shortlisted for Staff / Principal openings
                    </div>
                  </div>

                  {/* Metric 3: Recruiter Direct Unlocks */}
                  <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col justify-between gap-4 border border-slate-100">
                    <div className="flex items-start justify-between">
                      <div className="p-2 rounded-lg bg-[#eff4ff] text-[#00288e]">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M9 10l2 2 4-4" />
                        </svg>
                      </div>
                      <span className="inline-flex items-center text-[#006a61] text-xs bg-[#eff4ff] px-2 py-0.5 rounded-full font-semibold">
                        Direct Outreach
                      </span>
                    </div>
                    <div>
                      <span className="text-3xl font-bold text-[#0b1c30]">{STITCH_PREMIUM_PROFILE_FALLBACK.metrics.directUnlocks}</span>
                      <div className="text-xs font-semibold text-[#444653] mt-1">Direct Outreach Unlocks</div>
                      <p className="text-xs text-[#444653] mt-1 leading-normal">
                        {STITCH_PREMIUM_PROFILE_FALLBACK.metrics.directUnlocksSubtitle}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#006a61] text-xs pt-1 font-medium">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
                      </svg>
                      <span>Zero unsolicited spam (DPDP verified)</span>
                    </div>
                  </div>

                  {/* Metric 4: Velocity Score */}
                  <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col justify-between gap-4 border border-slate-100">
                    <div className="flex items-start justify-between">
                      <div className="p-2 rounded-lg bg-[#eff4ff] text-[#00288e]">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path d="M12 14v-4" /><path d="M3.34 19a10 10 0 1 1 17.32 0" />
                        </svg>
                      </div>
                      <span className="inline-flex items-center text-[#00288e] text-xs bg-[#dce9ff] px-2 py-0.5 rounded-full font-bold">
                        {STITCH_PREMIUM_PROFILE_FALLBACK.velocityPercentile}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-[#00288e]">{STITCH_PREMIUM_PROFILE_FALLBACK.velocityScore}</span>
                        <span className="text-base font-medium text-[#444653]">/100</span>
                      </div>
                      <div className="text-xs font-semibold text-[#444653] mt-1">Profile Discovery Score</div>
                      <p className="text-xs text-[#444653] mt-1">
                        Go • Distributed Systems • Bengaluru Region
                      </p>
                    </div>
                    <div className="w-full bg-[#e5eeff] rounded-full h-1.5 overflow-hidden">
                      <div className="bg-[#00288e] h-1.5 rounded-full" style={{ width: `${STITCH_PREMIUM_PROFILE_FALLBACK.velocityScore}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* ─────────────────────────────────────────────
                  5. COMPENSATION SUITE & BELL CURVE TELEMETRY
              ───────────────────────────────────────────── */}
              <div className="bg-white rounded-xl p-8 shadow-sm flex flex-col gap-6 border border-slate-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#00288e] uppercase font-bold tracking-wider">Verified Salary Insights</span>
                      <span className="px-2 py-0.5 rounded bg-[#e5eeff] text-xs text-[#444653] font-medium">Q1 2025 Market Realization</span>
                    </div>
                    <h2 className="text-2xl font-bold text-[#0b1c30] mt-1">{STITCH_PREMIUM_PROFILE_FALLBACK.metrics.targetRole}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#444653]">Benchmarked against:</span>
                    <span className="px-2.5 py-1 rounded-md bg-[#e5eeff] text-[#0b1c30] text-xs font-bold">
                      {STITCH_PREMIUM_PROFILE_FALLBACK.metrics.benchmarkedCount}
                    </span>
                  </div>
                </div>

                {/* Main Bell Curve Visual Container */}
                <div className="bg-[#eff4ff] rounded-xl p-6 flex flex-col gap-6 relative border border-[#dce9ff]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Legend Badges */}
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#444653]" />
                        <span className="text-xs text-[#0b1c30]">Current CTC: <strong className="text-[#0b1c30] font-bold">{STITCH_PREMIUM_PROFILE_FALLBACK.compensation.currentCtc}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#006a61]" />
                        <span className="text-xs text-[#0b1c30]">Target Market Ask: <strong className="text-[#006a61] font-bold">{STITCH_PREMIUM_PROFILE_FALLBACK.compensation.targetAsk}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#00288e]" />
                        <span className="text-xs text-[#0b1c30]">Median (P50): <strong className="text-[#00288e] font-bold">{STITCH_PREMIUM_PROFILE_FALLBACK.compensation.medianP50}</strong></span>
                      </div>
                    </div>
                    <span className="text-xs text-[#006a61] font-semibold flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Confidence Level: High ({STITCH_PREMIUM_PROFILE_FALLBACK.metrics.confidenceInterval})
                    </span>
                  </div>

                  {/* Responsive Inline SVG Bell Curve */}
                  <div className="w-full relative overflow-x-auto">
                    <div className="min-w-[640px]">
                      <svg className="w-full h-56 overflow-visible text-[#00288e]" fill="none" viewBox="0 0 800 200">
                        <defs>
                          <linearGradient id="compGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                            <stop offset="0%" stopColor="#1e40af" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#1e40af" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {/* Grid reference lines */}
                        <line stroke="#cbd5e1" strokeWidth="1.5" x1="50" x2="750" y1="170" y2="170" />
                        <line stroke="#cbd5e1" strokeDasharray="3 3" strokeWidth="1" x1="190" x2="190" y1="20" y2="170" />
                        <line stroke="#cbd5e1" strokeDasharray="3 3" strokeWidth="1" x1="400" x2="400" y1="20" y2="170" />
                        <line stroke="#cbd5e1" strokeDasharray="3 3" strokeWidth="1" x1="570" x2="570" y1="20" y2="170" />
                        <line stroke="#cbd5e1" strokeDasharray="3 3" strokeWidth="1" x1="680" x2="680" y1="20" y2="170" />

                        {/* Bell Curve Path */}
                        <path d="M 50 170 C 140 170, 180 140, 260 90 C 330 45, 370 20, 400 20 C 430 20, 470 45, 540 90 C 620 140, 660 170, 750 170" fill="none" stroke="#1e40af" strokeWidth="3" />
                        <path d="M 50 170 C 140 170, 180 140, 260 90 C 330 45, 370 20, 400 20 C 430 20, 470 45, 540 90 C 620 140, 660 170, 750 170 L 750 170 L 50 170 Z" fill="url(#compGradient)" />

                        {/* P25 (₹48L) Marker */}
                        <circle cx="270" cy="85" fill="#64748b" r="4" />
                        <text fill="#64748b" fontFamily="sans-serif" fontSize="11" fontWeight="600" textAnchor="middle" x="270" y="105">P25 ₹48L</text>

                        {/* Current Candidate Baseline: ₹52L Marker */}
                        <line stroke="#0b1c30" strokeWidth="2" x1="325" x2="325" y1="40" y2="170" />
                        <rect fill="#0b1c30" height="22" rx="4" width="100" x="275" y="24" />
                        <text fill="#ffffff" fontFamily="sans-serif" fontSize="11" fontWeight="700" textAnchor="middle" x="325" y="39">Current: ₹52L</text>

                        {/* P50 Median (₹58L) Marker */}
                        <circle cx="400" cy="20" fill="#1e40af" r="5" />
                        <text fill="#1e40af" fontFamily="sans-serif" fontSize="12" fontWeight="700" textAnchor="middle" x="400" y="15">P50 Median ₹58L</text>

                        {/* Target Ask: ₹68L Marker */}
                        <line stroke="#006a61" strokeWidth="2" x1="520" x2="520" y1="40" y2="170" />
                        <rect fill="#006a61" height="22" rx="4" width="100" x="470" y="24" />
                        <text fill="#ffffff" fontFamily="sans-serif" fontSize="11" fontWeight="700" textAnchor="middle" x="520" y="39">Target Ask: ₹68L</text>

                        {/* P75 (₹72L) Marker */}
                        <circle cx="570" cy="95" fill="#64748b" r="4" />
                        <text fill="#64748b" fontFamily="sans-serif" fontSize="11" fontWeight="600" textAnchor="middle" x="570" y="115">P75 ₹72L</text>

                        {/* P90 (₹86L) Marker */}
                        <circle cx="680" cy="148" fill="#64748b" r="4" />
                        <text fill="#64748b" fontFamily="sans-serif" fontSize="11" fontWeight="600" textAnchor="middle" x="680" y="140">P90 ₹86L</text>

                        {/* X-axis scale labels */}
                        <text fill="#94a3b8" fontFamily="sans-serif" fontSize="11" fontWeight="500" x="60" y="188">₹35L</text>
                        <text fill="#94a3b8" fontFamily="sans-serif" fontSize="11" fontWeight="500" textAnchor="middle" x="270" y="188">₹48L (P25)</text>
                        <text fill="#00288e" fontFamily="sans-serif" fontSize="11" fontWeight="700" textAnchor="middle" x="400" y="188">₹58L (P50)</text>
                        <text fill="#94a3b8" fontFamily="sans-serif" fontSize="11" fontWeight="500" textAnchor="middle" x="570" y="188">₹72L (P75)</text>
                        <text fill="#94a3b8" fontFamily="sans-serif" fontSize="11" fontWeight="500" textAnchor="middle" x="680" y="188">₹86L (P90)</text>
                        <text fill="#94a3b8" fontFamily="sans-serif" fontSize="11" fontWeight="500" textAnchor="end" x="740" y="188">₹1.1Cr+</text>
                      </svg>
                    </div>
                  </div>

                  {/* Percentile Breakdown Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                    {STITCH_PREMIUM_PROFILE_FALLBACK.compensation.percentiles.map((p, idx) => (
                      <div
                        key={idx}
                        className={`bg-white p-3 rounded-lg shadow-sm ${
                          p.highlight === 'primary'
                            ? 'ring-1 ring-[#00288e]/30'
                            : p.highlight === 'secondary'
                            ? 'ring-1 ring-[#006a61]/30'
                            : ''
                        }`}
                      >
                        <span
                          className={`text-xs ${
                            p.highlight === 'primary'
                              ? 'text-[#00288e] font-bold'
                              : p.highlight === 'secondary'
                              ? 'text-[#006a61] font-bold'
                              : 'text-[#444653]'
                          }`}
                        >
                          {p.label}
                        </span>
                        <div
                          className={`text-base font-bold mt-0.5 ${
                            p.highlight === 'primary'
                              ? 'text-[#00288e]'
                              : p.highlight === 'secondary'
                              ? 'text-[#006a61]'
                              : 'text-[#0b1c30]'
                          }`}
                        >
                          {p.value}
                        </div>
                        <span className="text-xs text-[#444653] block mt-0.5">{p.subtitle}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Legal / DPDP Act Privacy Notice */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-[#e5eeff] text-[#444653] border border-[#d3e4fe]">
                  <svg className="w-5 h-5 text-[#006a61] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <p className="text-xs leading-relaxed">
                    <strong className="text-[#0b1c30]">DPDP Act 2023 Compliant:</strong> Salary benchmarks are compiled entirely via aggregated Form-16 filings and verified corporate hiring records. Your exact compensation details remain strictly confidential and are <strong className="text-[#0b1c30]">never</strong> shared with prospective employers without your explicit consent.
                  </p>
                </div>
              </div>

              {/* ─────────────────────────────────────────────
                  6. INTERACTIVE PLAN MATRIX (FREE VS. PREMIUM PRO)
              ───────────────────────────────────────────── */}
              <div className="bg-white rounded-xl p-8 shadow-sm flex flex-col gap-6 border border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-[#00288e] uppercase font-bold tracking-wider">Subscription Plans</span>
                    <h2 className="text-2xl font-bold text-[#0b1c30]">Transparent Pricing &amp; Features</h2>
                  </div>
                  {/* Billing Term Switcher */}
                  <div className="inline-flex p-1 rounded-lg bg-[#e5eeff] text-[#444653] text-xs self-start sm:self-auto" id="billingSwitcher">
                    <button
                      type="button"
                      id="btnMonthly"
                      onClick={() => setBillingCycle('monthly')}
                      className={`px-3 py-1.5 rounded-md transition-all ${
                        billingCycle === 'monthly'
                          ? 'bg-white text-[#00288e] font-bold shadow-sm'
                          : 'font-semibold text-[#0b1c30] hover:text-[#00288e]'
                      }`}
                    >
                      Monthly (₹1,499)
                    </button>
                    <button
                      type="button"
                      id="btnAnnual"
                      onClick={() => setBillingCycle('annual')}
                      className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                        billingCycle === 'annual'
                          ? 'bg-white text-[#00288e] font-bold shadow-sm'
                          : 'font-semibold text-[#0b1c30] hover:text-[#00288e]'
                      }`}
                    >
                      <span>Annual (₹9,999/yr)</span>
                      <span className="bg-[#86f2e4] text-[#006f66] px-1 rounded text-[10px] font-bold uppercase tracking-wider">Save 44%</span>
                    </button>
                  </div>
                </div>

                {/* Comparison Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Free Profile Tier */}
                  <div className="rounded-xl p-6 bg-[#e5eeff] flex flex-col justify-between gap-6 border border-[#d3e4fe]">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-[#0b1c30]">Standard Candidate</h3>
                          <p className="text-xs text-[#444653]">For deliberate and exploratory job seekers</p>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-[#0b1c30]">₹0</span>
                          <span className="text-xs text-[#444653] block">Forever Free</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 pt-2">
                        <div className="flex items-start gap-2 text-[#0b1c30] text-sm">
                          <svg className="w-5 h-5 text-[#006a61] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
                          </svg>
                          <span><strong>Unlimited direct job applications</strong> across all listed roles</span>
                        </div>
                        <div className="flex items-start gap-2 text-[#0b1c30] text-sm">
                          <svg className="w-5 h-5 text-[#006a61] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
                          </svg>
                          <span>Single active resume storage</span>
                        </div>
                        <div className="flex items-start gap-2 text-[#0b1c30] text-sm">
                          <svg className="w-5 h-5 text-[#006a61] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
                          </svg>
                          <span>Standard keyword and skill matching</span>
                        </div>
                        <div className="flex items-start gap-2 text-[#0b1c30] text-sm">
                          <svg className="w-5 h-5 text-[#006a61] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
                          </svg>
                          <span>Direct in-app status updates from employers</span>
                        </div>
                        <div className="flex items-start gap-2 text-[#444653] text-sm opacity-60">
                          <svg className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
                          </svg>
                          <span>Priority placement in recruiter job searches</span>
                        </div>
                        <div className="flex items-start gap-2 text-[#444653] text-sm opacity-60">
                          <svg className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
                          </svg>
                          <span>Verified Form-16 CTC benchmarks</span>
                        </div>
                        <div className="flex items-start gap-2 text-[#444653] text-sm opacity-60">
                          <svg className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
                          </svg>
                          <span>Instant WhatsApp recruiter unlock notifications</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-[#eff4ff] text-center border border-[#dce9ff]">
                      <span className="text-xs text-[#444653] font-medium">Default baseline for all Vakancy.in registered users</span>
                    </div>
                  </div>

                  {/* Premium Pro Tier (Active) */}
                  <div className="rounded-xl p-6 bg-[#eff4ff] shadow-md flex flex-col justify-between gap-6 relative ring-2 ring-[#00288e] border border-[#b8c4ff]">
                    <div className="absolute -top-3 right-6 bg-[#00288e] text-white px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
                      Current Active Plan
                    </div>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-xl font-bold text-[#0b1c30]">Pro Candidate Tier</h3>
                            <svg className="w-5 h-5 text-amber-500 fill-current" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </div>
                          <p className="text-xs text-[#444653]">For high-conviction senior engineers &amp; architects</p>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-[#00288e]" id="planPriceDisplay">
                            {billingCycle === 'annual' ? '₹9,999' : '₹1,499'}
                          </span>
                          <span className="text-xs text-[#444653] block" id="planIntervalDisplay">
                            {billingCycle === 'annual' ? 'per year (billed annually)' : 'per month (billed monthly)'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 pt-2">
                        <div className="flex items-start gap-2 text-[#0b1c30] text-sm">
                          <svg className="w-5 h-5 text-[#00288e] fill-current shrink-0 mt-0.5" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                          </svg>
                          <span><strong>Top 3% Recruiter Search Placement</strong> with priority boost</span>
                        </div>
                        <div className="flex items-start gap-2 text-[#0b1c30] text-sm">
                          <svg className="w-5 h-5 text-[#00288e] fill-current shrink-0 mt-0.5" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                          </svg>
                          <span><strong>Instant WhatsApp Recruiter Alerts</strong> when your profile is unlocked</span>
                        </div>
                        <div className="flex items-start gap-2 text-[#0b1c30] text-sm">
                          <svg className="w-5 h-5 text-[#00288e] fill-current shrink-0 mt-0.5" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                          </svg>
                          <span><strong>Full India Tech Benchmark Analyzer</strong> (₹50L - ₹1.5Cr percentiles)</span>
                        </div>
                        <div className="flex items-start gap-2 text-[#0b1c30] text-sm">
                          <svg className="w-5 h-5 text-[#00288e] fill-current shrink-0 mt-0.5" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                          </svg>
                          <span><strong>Recruiter Identity Logging:</strong> View exactly which firms inspect your profile</span>
                        </div>
                        <div className="flex items-start gap-2 text-[#0b1c30] text-sm">
                          <svg className="w-5 h-5 text-[#00288e] fill-current shrink-0 mt-0.5" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                          </svg>
                          <span><strong>AI Resume Copilot:</strong> Unlimited role-tailored ATS keyword alignments</span>
                        </div>
                        <div className="flex items-start gap-2 text-[#0b1c30] text-sm">
                          <svg className="w-5 h-5 text-[#00288e] fill-current shrink-0 mt-0.5" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                          </svg>
                          <span><strong>Direct Recruiter Direct Line:</strong> Priority WhatsApp contact verification</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => showToast('You are currently enrolled in the Pro Candidate Tier (renews May 2025).')}
                        className="w-full flex items-center justify-center gap-2 bg-[#00288e] text-white text-xs font-bold py-2.5 px-4 rounded-lg shadow-sm hover:bg-[#1e40af] transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Currently Enrolled (Renews May 2025)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─────────────────────────────────────────────
                  7. BILLING & TAX INVOICES HISTORY
              ───────────────────────────────────────────── */}
              <div className="bg-white rounded-xl p-8 shadow-sm flex flex-col gap-4 border border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-[#00288e] uppercase font-bold tracking-wider">Accounting &amp; Compliance</span>
                    <h2 className="text-2xl font-bold text-[#0b1c30]">Billing Records &amp; GST Invoices</h2>
                  </div>
                  <button
                    id="btn-update-gstin"
                    type="button"
                    onClick={() => {
                      setTempGstin(gstin);
                      setIsGstinModalOpen(true);
                    }}
                    className="self-start sm:self-auto flex items-center gap-1.5 text-[#00288e] text-xs font-semibold hover:underline"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    <span>Update GSTIN • {gstin}</span>
                  </button>
                </div>

                {/* Invoices Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#e5eeff] text-[#444653] text-xs uppercase tracking-wider h-10">
                        <th className="px-4 font-semibold">Invoice ID</th>
                        <th className="px-4 font-semibold">Billing Date</th>
                        <th className="px-4 font-semibold">Plan Description</th>
                        <th className="px-4 font-semibold text-right">Taxable Value</th>
                        <th className="px-4 font-semibold text-right">Total (Inc. 18% GST)</th>
                        <th className="px-4 font-semibold">Status</th>
                        <th className="px-4 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {STITCH_PREMIUM_PROFILE_FALLBACK.invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-[#eff4ff] transition-colors h-14 border-b border-slate-100 last:border-none">
                          <td className="px-4 font-semibold text-[#00288e]">{inv.id}</td>
                          <td className="px-4 text-[#444653]">{inv.date}</td>
                          <td className="px-4 text-[#0b1c30]">
                            <span className="font-semibold block">{inv.plan}</span>
                            <span className="block text-[11px] text-[#444653]">{inv.coverage}</span>
                          </td>
                          <td className="px-4 text-right text-[#0b1c30] font-mono">{inv.taxable}</td>
                          <td className="px-4 text-right font-bold text-[#0b1c30] font-mono">{inv.total}</td>
                          <td className="px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs bg-[#86f2e4] text-[#006f66] font-semibold">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#006a61]" />
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleDownloadInvoice(inv.id)}
                              className="inline-flex items-center gap-1 text-[#00288e] hover:text-[#1e40af] text-xs font-semibold py-1 px-2 rounded hover:bg-[#e5eeff] transition-colors"
                              title="Download Official Tax Invoice"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                              </svg>
                              <span>PDF Receipt</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[#444653] text-xs pt-2 border-t border-slate-100">
                  <span>SAC Code: 998313 (Information Technology &amp; Placement Services) • Input Tax Credit (ITC) compliant</span>
                  <button
                    type="button"
                    onClick={() => showToast('ITC claims: Input Tax Credit can be claimed with valid registered GSTIN on the invoice.')}
                    className="text-[#00288e] hover:underline self-start sm:self-auto font-medium"
                  >
                    Billing &amp; Tax FAQ →
                  </button>
                </div>
              </div>

            </div>
          </div>
        </main>

        {/* ─────────────────────────────────────────────
            8. PORTAL FOOTER
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
          9. GSTIN UPDATE MODAL
      ───────────────────────────────────────────── */}
      {isGstinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#00288e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <h3 className="text-base font-bold text-[#0b1c30]">Update Corporate GSTIN</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGstinModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveGstin} className="mt-4 flex flex-col gap-4">
              <p className="text-xs text-[#444653] leading-relaxed">
                Provide your valid 15-character Goods and Services Tax Identification Number (GSTIN) to enable Input Tax Credit (ITC) on all future and retroactive platform invoices.
              </p>
              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                  GST Identification Number (GSTIN)
                </label>
                <input
                  type="text"
                  value={tempGstin}
                  onChange={(e) => setTempGstin(e.target.value)}
                  placeholder="e.g. 29AAACV2459N1Z0"
                  maxLength={15}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00288e] font-mono uppercase"
                  required
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  State Code: 29 (Karnataka) • Legal Entity PAN format
                </span>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGstinModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#444653] hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#00288e] hover:bg-[#1e40af] rounded-lg transition-colors shadow-sm"
                >
                  Save &amp; Verify GSTIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          10. BILLING & SUBSCRIPTION DRAWER / MODAL
      ───────────────────────────────────────────── */}
      {isBillingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#00288e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                <h3 className="text-base font-bold text-[#0b1c30]">Manage Subscription &amp; Payment Methods</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBillingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              <div className="p-4 rounded-lg bg-[#eff4ff] border border-[#dce9ff] flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#00288e] uppercase tracking-wider">Active Subscription</span>
                  <span className="text-sm font-bold text-[#0b1c30]">{STITCH_PREMIUM_PROFILE_FALLBACK.planName}</span>
                  <span className="text-xs text-[#444653]">Auto-renews on {STITCH_PREMIUM_PROFILE_FALLBACK.renewalDate} (₹9,999 + GST)</span>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-bold bg-[#86f2e4] text-[#006f66]">Active</span>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-[#0b1c30] uppercase tracking-wider">Primary Payment Rail</span>
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-6 bg-[#00288e] text-white rounded text-[10px] font-bold flex items-center justify-center">
                      VISA
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#0b1c30]">HDFC Corporate Debit •••• 4092</span>
                      <span className="text-[11px] text-[#444653]">Expires 09/28 • e-Mandate Active</span>
                    </div>
                  </div>
                  <span className="text-xs text-[#006a61] font-semibold">Primary</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#f8f9ff] text-xs text-[#444653]">
                <span>Registered Billing Entity:</span>
                <strong className="text-[#0b1c30] font-mono">{gstin}</strong>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsBillingModalOpen(false);
                    showToast('Auto-renew settings updated. Your active entitlement remains until May 28, 2025.');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
                >
                  Cancel Auto-Renew
                </button>
                <button
                  type="button"
                  onClick={() => setIsBillingModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#00288e] hover:bg-[#1e40af] rounded-lg transition-colors shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
