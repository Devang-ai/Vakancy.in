import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';

import Toast from '../../components/common/Toast';
/**
 * CandidatePrivacyPage
 * Stitch Screen ID: 11ebd6d066f34432843c2e1e703a7a81
 * Title: "Vakancy.in - Candidate Privacy, DPDP Rights & Account Status"
 * Project: Vakancy.in Recruitment Platform Design System (projects/13997293982053869540)
 * Route: /candidate/privacy
 *
 * Screen: Candidate Privacy, DPDP Rights & Account Status
 * Features:
 * - Candidate Navigation Shell (Header with search, notifications, profile, logout)
 * - Breadcrumb Bar:
 *   - Workspace > Candidate Profile > Settings > Privacy, DPDP Data & Account Status
 * - Header Title & Identity Summary:
 *   - "Your Privacy, Data & Account Status" (DPDP Act 2023 Compliant badge)
 *   - Identity pill with candidate avatar, name, and ID #CAN-IND-88412
 * - 12-Column Responsive Layout:
 *   - Left Aside (4 Columns):
 *     1. Settings Workspace Navigation Menu (Account Info, Security, Privacy [Active], Recruiter Discovery, Access History, Data Export, Deactivate/Delete)
 *     2. DPDP Privacy Shield box with digital consent reference
 *     3. Data Protection Officer (DPO) direct contact card (dpo@vakancy.in)
 *   - Right Main Content (8 Columns):
 *     - Section A: Recruiter Discovery & Contact Privacy Protocol (Master Discoverable toggle, status note, 4 granular masking controls)
 *     - Section B: Candidate Privacy Rights (DPDP Act) (4 cards: Right to Information, Right to Correction & Erasure, Right of Grievance Redressal, Right to Nominate)
 *     - Section C: Data Access History & Audit Trail (filter badges, 4-row access history table with timestamps, organizations, purposes, scopes, and verification status)
 *     - Section D: Data Portability & Complete Takeout (JSON/ZIP export package, fresh snapshot request, download data action)
 *     - Section E: Account Lifecycle (Temporary Account Deactivation & Permanent Account Deletion)
 * - Modals:
 *   - Step-by-Step Permanent Deletion Modal
 *   - Temporary Deactivation Modal
 *   - Inspect Data Summary Modal (Right to Information)
 *   - Request Correction Modal (Right to Correction)
 *   - Configure Nominee Modal (Right to Nominate)
 *   - Adjust Target Salary Bracket Modal
 * - Portal Footer:
 *   - 5-column standard Vakancy.in corporate footer
 */

/* ─────────────────────────────────────────────
   ISOLATED PRESENTATION FALLBACK DATA
   Separated from real backend data as mandated
   by the Security & Privacy Data Honesty Rule.
───────────────────────────────────────────── */
const STITCH_PRIVACY_FALLBACK = {
  candidateId: '',
  candidateName: '',
  headline: '',
  initials: 'V',
  dpoEmail: 'privacy@vakancy.in',
  lastSnapshotDate: '',
  archiveSize: '0.0 MB',
  consentReceiptId: '',
  targetSalaryBracket: '',
  exactCurrentSalary: '',
  accessLogs: []
};

export const CandidatePrivacyPage = () => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  // Active section scroll / tab focus
  const [activeSection, setActiveSection] = useState('dpdp-rights');

  // Discovery Controls
  const [isDiscoverable, setIsDiscoverable] = useState(true);
  const [piiRedactionEnabled, setPiiRedactionEnabled] = useState(true);
  const [agencyBlacklistEnabled, setAgencyBlacklistEnabled] = useState(true);
  const [salaryBracket, setSalaryBracket] = useState(STITCH_PRIVACY_FALLBACK.targetSalaryBracket);

  // Access Logs filter: 'all' | 'recruiters' | 'applications' | 'system'
  const [logFilter, setLogFilter] = useState('all');

  // Snapshot date state
  const [snapshotDate, setSnapshotDate] = useState(STITCH_PRIVACY_FALLBACK.lastSnapshotDate);

  // Modals state
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [nomineeModalOpen, setNomineeModalOpen] = useState(false);
  const [bracketModalOpen, setBracketModalOpen] = useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [deletionModalOpen, setDeletionModalOpen] = useState(false);

  // Form states for modals
  const [correctionText, setCorrectionText] = useState('');
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeRelation, setNomineeRelation] = useState('');
  const [nomineeEmail, setNomineeEmail] = useState('');
  const [minBracket, setMinBracket] = useState('68');
  const [maxBracket, setMaxBracket] = useState('75');
  const [deletionReason, setDeletionReason] = useState('Accepted an executive offer elsewhere');
  const [deletionConfirmed, setDeletionConfirmed] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Check real backend user data on mount
  useEffect(() => {
    fetchBackendContext();
  }, []);

  const fetchBackendContext = async () => {
    try {
      const res = await API.get('/auth/me');
      if (res && res.success && res.user) {
        // User context active
      }
    } catch {
      // Presentation fallback mode
    }
  };

  // Filtered access logs
  const filteredLogs = STITCH_PRIVACY_FALLBACK.accessLogs.filter((log) => {
    if (logFilter === 'all') return true;
    if (logFilter === 'recruiters') return log.category === 'recruiters';
    if (logFilter === 'applications') return log.category === 'applications';
    if (logFilter === 'system') return log.category === 'system';
    return true;
  });

  // Handle Fresh Snapshot Request
  const handleRequestSnapshot = () => {
    setSnapshotDate('Just now • Link valid for 48 hours');
    showToast('Fresh data snapshot generated for current session.');
  };

  // Handle Download JSON Archive
  const handleDownloadArchive = () => {
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        candidateId: STITCH_PRIVACY_FALLBACK.candidateId,
        candidateName: profile?.name || user?.name || STITCH_PRIVACY_FALLBACK.candidateName,
        email: user?.email || 'rahul.sharma@example.com',
        phone: user?.phone || '+91 98765 43210',
        headline: profile?.experience ? `${profile.experience} Experience` : STITCH_PRIVACY_FALLBACK.headline,
        privacyPreferences: {
          discoverable: isDiscoverable,
          piiRedaction: piiRedactionEnabled,
          agencyBlacklist: agencyBlacklistEnabled,
          targetSalaryBracket: salaryBracket,
        },
        consentReceipt: STITCH_PRIVACY_FALLBACK.consentReceiptId,
        recentAccessActivity: STITCH_PRIVACY_FALLBACK.accessLogs,
        note: 'Candidate Data Export generated from active session under DPDP Act 2023 guidelines.',
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `CANDIDATE_DATA_${STITCH_PRIVACY_FALLBACK.candidateId.replace('#', '')}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showToast('Candidate data archive downloaded successfully.');
    } catch {
      showToast('Unable to initiate data download in current session.');
    }
  };

  // Display Name and Initials
  const displayName = profile?.name || user?.name || user?.email?.split('@')[0] || STITCH_PRIVACY_FALLBACK.candidateName;
  const firstName = displayName.split(' ')[0];
  const userInitials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || STITCH_PRIVACY_FALLBACK.initials;
  const designation = profile?.experience ? `${profile.experience} Experience` : STITCH_PRIVACY_FALLBACK.headline;

  return (
    <div
      className="w-full min-h-screen bg-[#f8f9ff] font-sans text-[#0b1c30] antialiased"
      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
    >
      {/* Toast Notification */}
      {toast && (
        <Toast 
          type={toast.isError ? 'error' : (toast.type || 'info')}
          title={toast.title || (toast.isError ? 'Error' : 'Notification')}
          description={toast.msg || toast.description || (typeof toast === 'string' ? toast : '')} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* ═══════════════════════════════════════
          TOP HEADER (fixed w-full z-50)
      ═══════════════════════════════════════ */}
      <header className="fixed top-0 w-full z-50 bg-[#f8f9ff]/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-slate-200/60">
        <div className="h-16 max-w-[80rem] mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/candidate/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#00288e] flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="text-lg font-bold text-[#00288e] tracking-tight">
                Vacancy<span className="text-[#006a61]">.in</span>
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold">
              <Link to="/candidate/jobs" className="text-[#444653] hover:text-[#0b1c30] transition-colors">
                Find Jobs
              </Link>
              <Link to="/candidate/applications" className="text-[#444653] hover:text-[#0b1c30] transition-colors">
                Applications
              </Link>
              <Link to="/candidate/saved" className="text-[#444653] hover:text-[#0b1c30] transition-colors">
                Saved
              </Link>
              <Link to="/candidate/resume" className="text-[#444653] hover:text-[#0b1c30] transition-colors">
                Resume
              </Link>
              <Link to="/candidate/settings" className="text-[#00288e] border-b-2 border-[#00288e] pb-0.5">
                Settings
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="hidden sm:flex items-center bg-[#eff4ff] rounded-lg px-3 py-1.5 border border-slate-200/80">
              <svg className="w-4 h-4 text-[#444653] mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search privacy, logs, settings..."
                className="bg-transparent border-none outline-none text-xs text-[#0b1c30] placeholder:text-[#444653]/70 w-44"
              />
            </div>

            {/* Notification Bell */}
            <Link
              to="/candidate/notifications"
              id="header-notification-bell"
              title="Notifications"
              className="relative p-2 rounded-lg text-[#444653] hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </Link>

            {/* Profile Avatar / Logout */}
            <div
              onClick={() => {
                logout();
                navigate('/login');
              }}
              title="Click to Sign Out"
              className="flex items-center gap-2 cursor-pointer group pl-2"
            >
              <div className="w-8 h-8 rounded-full bg-[#00288e] flex items-center justify-center text-white font-bold text-sm shrink-0">
                {firstName[0]?.toUpperCase() || 'R'}
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-semibold text-[#0b1c30] group-hover:text-[#00288e] transition-colors leading-tight">
                  {displayName}
                </span>
                <span className="text-[11px] text-[#444653] leading-tight">{designation}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full pt-16 min-h-[calc(100vh-16rem)]">
        {/* ═══════════════════════════════════════
            TOP CONTEXT HEADER & BREADCRUMBS
        ═══════════════════════════════════════ */}
        <div className="w-full bg-white shadow-sm border-b border-slate-200/70">
          <div className="max-w-[80rem] mx-auto px-4 md:px-6 py-4">
            {/* Breadcrumb Bar */}
            <div className="flex items-center gap-2 text-xs text-[#444653] mb-3 flex-wrap">
              <Link to="/candidate/dashboard" className="hover:text-[#00288e] transition-colors flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-[#444653]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
                </svg>
                <span>Workspace</span>
              </Link>
              <svg className="w-3 h-3 text-[#c4c5d5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <Link to="/candidate/profile" className="hover:text-[#00288e] transition-colors">
                Candidate Profile
              </Link>
              <svg className="w-3 h-3 text-[#c4c5d5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <Link to="/candidate/settings" className="hover:text-[#00288e] transition-colors">
                Settings
              </Link>
              <svg className="w-3 h-3 text-[#c4c5d5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-[#00288e] font-semibold">Privacy, DPDP Data &amp; Account Status</span>
            </div>

            {/* Header Title & User Summary */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-col gap-1 max-w-4xl">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-[#0b1c30] tracking-tight">
                    Your Privacy, Data &amp; Account Status
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#eff4ff] text-[#006a61] text-xs font-semibold border border-[#006a61]/20">
                    <svg className="w-3.5 h-3.5 text-[#006a61]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
                    </svg>
                    DPDP Act 2023 Compliant
                  </span>
                </div>
                <p className="text-sm text-[#444653]">
                  Exercise your statutory rights under Digital Personal Data Protection (DPDP) guidelines, inspect recruiter profile views in real time, and manage account deactivation or right to erasure.
                </p>
              </div>

              {/* Identity Pill */}
              <div className="flex items-center gap-3 bg-[#eff4ff] px-4 py-2.5 rounded-xl border border-slate-200 self-start lg:self-center shrink-0">
                <div className="w-10 h-10 rounded-full bg-[#00288e] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  {userInitials}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[#0b1c30]">{displayName}</span>
                  <span className="text-xs text-[#444653]">{STITCH_PRIVACY_FALLBACK.headline}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════
            MAIN BODY GRID: 12 COLUMNS (4 / 8)
        ═══════════════════════════════════════ */}
        <div className="max-w-[80rem] mx-auto px-4 md:px-6 py-6 md:py-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* ── LEFT ASIDE (4 Columns) ── */}
            <aside className="lg:col-span-4 flex flex-col gap-6">
              {/* Navigation Menu Card */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
                <div className="px-4 pt-4 pb-2 bg-[#eff4ff] border-b border-slate-200/70">
                  <span className="text-xs uppercase tracking-wider text-[#444653] font-semibold">Settings Workspace</span>
                  <p className="text-xs text-[#0b1c30] font-medium">Candidate ID {STITCH_PRIVACY_FALLBACK.candidateId}</p>
                </div>

                <nav className="flex flex-col py-1.5">
                  <Link
                    to="/candidate/settings"
                    className="flex items-center justify-between px-4 py-2.5 text-sm text-[#444653] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-[#757684]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                      <span>Account Information</span>
                    </div>
                    <svg className="w-3.5 h-3.5 text-[#c4c5d5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>

                  <Link
                    to="/candidate/settings"
                    className="flex items-center justify-between px-4 py-2.5 text-sm text-[#444653] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-[#757684]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span>Security &amp; Credentials</span>
                    </div>
                    <svg className="w-3.5 h-3.5 text-[#c4c5d5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>

                  {/* Active Tab */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-[#e5eeff] text-[#00288e] font-semibold text-sm shadow-sm border-l-4 border-[#00288e]">
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-[#00288e]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.54 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Privacy &amp; DPDP Data Rights</span>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-[#00288e]" />
                  </div>

                  <a
                    href="#recruiter-discovery"
                    onClick={() => setActiveSection('recruiter-discovery')}
                    className="flex items-center justify-between px-4 py-2.5 text-sm text-[#444653] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-[#757684]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>Recruiter Discovery Controls</span>
                    </div>
                    <svg className="w-3.5 h-3.5 text-[#c4c5d5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>

                  <a
                    href="#access-ledger"
                    onClick={() => setActiveSection('access-ledger')}
                    className="flex items-center justify-between px-4 py-2.5 text-sm text-[#444653] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-[#757684]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Data Access History</span>
                    </div>
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-[#eff4ff] text-[#00288e] text-xs font-semibold border border-slate-200">
                      4 logs
                    </span>
                  </a>

                  <a
                    href="#data-takeout"
                    onClick={() => setActiveSection('data-takeout')}
                    className="flex items-center justify-between px-4 py-2.5 text-sm text-[#444653] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-[#757684]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>Data Export &amp; Takeout</span>
                    </div>
                    <svg className="w-3.5 h-3.5 text-[#c4c5d5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>

                  <div className="h-px bg-slate-200/80 my-1 mx-4" />

                  <a
                    href="#account-lifecycle"
                    onClick={() => setActiveSection('account-lifecycle')}
                    className="flex items-center justify-between px-4 py-2.5 text-sm text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-[#ba1a1a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      <span>Deactivate or Delete Account</span>
                    </div>
                    <svg className="w-3.5 h-3.5 text-[#ba1a1a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </nav>
              </div>

              {/* Statutory Compliance Shield Box */}
              <div className="bg-[#eff4ff] rounded-xl p-4 shadow-sm border border-slate-200/80">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[#dce9ff] text-[#00288e] shrink-0">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.54 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-[#0b1c30]">DPDP Privacy Shield</span>
                    <p className="text-xs text-[#444653] leading-relaxed">
                      Registered under India DPDP Act 2023 guidelines. Your personal details are securely protected with strict restrictions against unauthorized data sharing.
                    </p>
                    <div className="flex items-center gap-1.5 pt-1 text-xs text-[#006a61] font-semibold">
                      <span className="w-2 h-2 rounded-full bg-[#006a61]" />
                      Digital Consent Reference {STITCH_PRIVACY_FALLBACK.consentReceiptId}
                    </div>
                  </div>
                </div>
              </div>

              {/* Privacy Contact Card (DPO) */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80 flex flex-col gap-1.5">
                <span className="text-xs text-[#444653] uppercase tracking-wider font-semibold">
                  Data Protection Officer (DPO)
                </span>
                <p className="text-xs text-[#0b1c30] leading-relaxed">
                  Direct escalation pathway for candidate privacy questions, data requests, or consent withdrawals.
                </p>
                <div className="pt-2">
                  <a
                    className="inline-flex items-center gap-1.5 text-xs text-[#00288e] hover:underline font-semibold"
                    href={`mailto:${STITCH_PRIVACY_FALLBACK.dpoEmail}`}
                  >
                    <svg className="w-3.5 h-3.5 text-[#00288e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {STITCH_PRIVACY_FALLBACK.dpoEmail}
                  </a>
                </div>
              </div>
            </aside>

            {/* ── RIGHT MAIN COLUMN (8 Columns) ── */}
            <div className="lg:col-span-8 flex flex-col gap-6 lg:gap-8">
              {/* ═══════════════════════════════════════
                  SECTION A: Recruiter Discovery & Contact Privacy
              ═══════════════════════════════════════ */}
              <section
                id="recruiter-discovery"
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-200/80 flex flex-col gap-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 bg-[#eff4ff] -mx-6 -mt-6 p-6 rounded-t-xl border-b border-slate-200/70">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-white text-[#00288e] shadow-sm border border-slate-200/60">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /><path d="M12 3v3m0 12v3M3 12h3m12 0h3" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#0b1c30]">
                        Recruiter Discovery &amp; Contact Privacy
                      </h2>
                      <p className="text-xs text-[#444653]">
                        Control how recruiters and employers discover your profile for matching jobs.
                      </p>
                    </div>
                  </div>

                  {/* Master Toggle Switch */}
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none shrink-0">
                    <span className="text-xs text-[#0b1c30] font-semibold">
                      {isDiscoverable ? 'Discoverable' : 'Hidden'}
                    </span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={isDiscoverable}
                        onChange={() => {
                          setIsDiscoverable(!isDiscoverable);
                          showToast(
                            !isDiscoverable
                              ? 'Profile discovery enabled for verified employers.'
                              : 'Profile hidden from recruiter searches. Existing applications remain active.'
                          );
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#c4c5d5] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00288e]" />
                    </div>
                  </label>
                </div>

                <div className="bg-[#eff4ff] p-4 rounded-lg flex items-start gap-3 border border-slate-200/60">
                  <svg className="w-5 h-5 text-[#00288e] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-[#0b1c30] leading-relaxed">
                    <span className="font-semibold text-[#00288e]">Status: Open to Opportunities.</span> When active, verified employers can match your profile against high-priority openings ({salaryBracket}). Existing submitted applications are never impacted if disabled.
                  </p>
                </div>

                {/* Granular Visibility Controls */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs uppercase tracking-wide text-[#0b1c30] font-semibold">
                    Profile Privacy &amp; Visibility Controls
                  </h3>

                  {/* Control 1: Personal Contact Coordinates */}
                  <div className="p-4 rounded-lg bg-[#eff4ff] flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-200/50">
                    <div className="flex flex-col gap-0.5 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#0b1c30]">Personal Contact Information (Mobile &amp; Email)</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#86f2e4]/40 text-[#006f66] text-xs font-semibold">
                          Private
                        </span>
                      </div>
                      <p className="text-xs text-[#444653]">
                        Kept private from general searches. Shared with employers only after you confirm an interview request.
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-[#006a61] font-semibold flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Mutual Confirmation Required
                      </span>
                    </div>
                  </div>

                  {/* Control 2: Compensation & Benchmark */}
                  <div className="p-4 rounded-lg bg-[#eff4ff] flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-200/50">
                    <div className="flex flex-col gap-0.5 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#0b1c30]">Salary Details &amp; Target Expectations</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#d3e4fe] text-[#00288e] text-xs font-semibold">
                          Target Range Only
                        </span>
                      </div>
                      <p className="text-xs text-[#444653]">
                        Target bracket displayed as <span className="font-semibold text-[#0b1c30]">{salaryBracket}</span>. Exact current salary of {STITCH_PRIVACY_FALLBACK.exactCurrentSalary} is kept private from recruiter searches.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBracketModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-lg bg-white text-[#0b1c30] hover:bg-[#dce9ff] text-xs font-semibold shadow-sm border border-slate-200 transition-all shrink-0"
                    >
                      Adjust Bracket
                    </button>
                  </div>

                  {/* Control 3: Resume Personal Details Redaction */}
                  <div className="p-4 rounded-lg bg-[#eff4ff] flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-200/50">
                    <div className="flex flex-col gap-0.5 max-w-xl">
                      <span className="text-sm font-semibold text-[#0b1c30]">Resume Personal Details Redaction</span>
                      <p className="text-xs text-[#444653]">
                        Automatically masks personal home address and government ID numbers before sharing your resume with employers.
                      </p>
                    </div>
                    <label className="inline-flex items-center cursor-pointer select-none shrink-0">
                      <input
                        type="checkbox"
                        checked={piiRedactionEnabled}
                        onChange={() => {
                          setPiiRedactionEnabled(!piiRedactionEnabled);
                          showToast(
                            !piiRedactionEnabled
                              ? 'Resume personal details redaction activated.'
                              : 'Resume personal details redaction turned off.'
                          );
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#c4c5d5] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00288e]" />
                    </label>
                  </div>

                  {/* Control 4: Third-Party Agency Blacklist */}
                  <div className="p-4 rounded-lg bg-[#eff4ff] flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-200/50">
                    <div className="flex flex-col gap-0.5 max-w-xl">
                      <span className="text-sm font-semibold text-[#0b1c30]">Third-Party Agency Blocking</span>
                      <p className="text-xs text-[#444653]">
                        Prevent unverified third-party recruiting agencies and automated scrapers from viewing your profile.
                      </p>
                    </div>
                    <label className="inline-flex items-center cursor-pointer select-none shrink-0">
                      <input
                        type="checkbox"
                        checked={agencyBlacklistEnabled}
                        onChange={() => {
                          setAgencyBlacklistEnabled(!agencyBlacklistEnabled);
                          showToast(
                            !agencyBlacklistEnabled
                              ? 'Third-party recruiting agencies blocked from accessing your profile.'
                              : 'Third-party recruiting agency block disabled.'
                          );
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#c4c5d5] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00288e]" />
                    </label>
                  </div>
                </div>
              </section>

              {/* ═══════════════════════════════════════
                  SECTION B: Statutory DPDP Rights Dashboard
              ═══════════════════════════════════════ */}
              <section
                id="dpdp-rights"
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-200/80 flex flex-col gap-6"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#00288e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                    </svg>
                    <h2 className="text-base font-bold text-[#0b1c30]">
                      Your Privacy Rights (DPDP Act 2023)
                    </h2>
                  </div>
                  <p className="text-xs text-[#444653]">
                    Under the Digital Personal Data Protection Act, candidates have clear rights to inspect, correct, redress, and delegate their personal data processing.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card 1: Right to Information */}
                  <div className="p-4 rounded-xl bg-[#eff4ff] flex flex-col justify-between gap-4 hover:bg-[#e5eeff] transition-colors border border-slate-200/60">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-[#d3e4fe] text-[#00288e] flex items-center justify-center font-bold text-xs">
                          01
                        </div>
                        <span className="text-xs text-[#006a61] font-semibold">Section 11(1)</span>
                      </div>
                      <h3 className="text-sm font-bold text-[#0b1c30]">
                        Right to Information &amp; Summary
                      </h3>
                      <p className="text-xs text-[#444653] leading-relaxed">
                        Inspect a clear summary of all personal data stored, identities of verified employers who accessed your profile, and data usage purposes.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInfoModalOpen(true)}
                      className="w-full py-2 px-3 bg-white text-[#00288e] text-xs font-semibold rounded-lg shadow-sm hover:bg-[#dce9ff] transition-all flex items-center justify-center gap-1.5 border border-slate-200"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Inspect Data Summary
                    </button>
                  </div>

                  {/* Card 2: Right to Correction & Erasure */}
                  <div className="p-4 rounded-xl bg-[#eff4ff] flex flex-col justify-between gap-4 hover:bg-[#e5eeff] transition-colors border border-slate-200/60">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-[#d3e4fe] text-[#00288e] flex items-center justify-center font-bold text-xs">
                          02
                        </div>
                        <span className="text-xs text-[#006a61] font-semibold">Section 12(1)</span>
                      </div>
                      <h3 className="text-sm font-bold text-[#0b1c30]">
                        Right to Correction &amp; Updates
                      </h3>
                      <p className="text-xs text-[#444653] leading-relaxed">
                        Request immediate correction of inaccurate profile details, outdated experience entries, or update historical resume versions.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCorrectionModalOpen(true)}
                      className="w-full py-2 px-3 bg-white text-[#00288e] text-xs font-semibold rounded-lg shadow-sm hover:bg-[#dce9ff] transition-all flex items-center justify-center gap-1.5 border border-slate-200"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Request Correction
                    </button>
                  </div>

                  {/* Card 3: Grievance Redressal */}
                  <div className="p-4 rounded-xl bg-[#eff4ff] flex flex-col justify-between gap-4 hover:bg-[#e5eeff] transition-colors border border-slate-200/60">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-[#d3e4fe] text-[#00288e] flex items-center justify-center font-bold text-xs">
                          03
                        </div>
                        <span className="text-xs text-[#006a61] font-semibold">Section 13</span>
                      </div>
                      <h3 className="text-sm font-bold text-[#0b1c30]">
                        Right of Grievance Redressal
                      </h3>
                      <p className="text-xs text-[#444653] leading-relaxed">
                        Privacy inquiries and concerns are reviewed directly by our designated Resident Data Protection Officer within 7 calendar days.
                      </p>
                    </div>
                    <a
                      href={`mailto:${STITCH_PRIVACY_FALLBACK.dpoEmail}`}
                      className="w-full py-2 px-3 bg-white text-[#00288e] text-xs font-semibold rounded-lg shadow-sm hover:bg-[#dce9ff] transition-all flex items-center justify-center gap-1.5 border border-slate-200"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Contact DPO ({STITCH_PRIVACY_FALLBACK.dpoEmail})
                    </a>
                  </div>

                  {/* Card 4: Right to Nominate */}
                  <div className="p-4 rounded-xl bg-[#eff4ff] flex flex-col justify-between gap-4 hover:bg-[#e5eeff] transition-colors border border-slate-200/60">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-[#d3e4fe] text-[#00288e] flex items-center justify-center font-bold text-xs">
                          04
                        </div>
                        <span className="text-xs text-[#006a61] font-semibold">Section 14</span>
                      </div>
                      <h3 className="text-sm font-bold text-[#0b1c30]">
                        Right to Nominate
                      </h3>
                      <p className="text-xs text-[#444653] leading-relaxed">
                        Designate a trusted legal representative authorized to manage or request deletion of candidate records on your behalf if necessary.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNomineeModalOpen(true)}
                      className="w-full py-2 px-3 bg-white text-[#00288e] text-xs font-semibold rounded-lg shadow-sm hover:bg-[#dce9ff] transition-all flex items-center justify-center gap-1.5 border border-slate-200"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Configure Nominee
                    </button>
                  </div>
                </div>
              </section>

              {/* ═══════════════════════════════════════
                  SECTION C: Recruiter Data Access History (Ledger)
              ═══════════════════════════════════════ */}
              <section
                id="access-ledger"
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-200/80 flex flex-col gap-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <h2 className="text-base font-bold text-[#0b1c30] flex items-center gap-2">
                      <svg className="w-5 h-5 text-[#006a61]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Data Access History &amp; Activity Log
                    </h2>
                    <p className="text-xs text-[#444653]">
                      Recent activity tracking verified recruiter views and background validation checks.
                    </p>
                  </div>

                  {/* Filter Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setLogFilter('all')}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        logFilter === 'all'
                          ? 'bg-[#00288e] text-white shadow-sm'
                          : 'bg-[#eff4ff] text-[#444653] hover:bg-[#dce9ff]'
                      }`}
                    >
                      All Access ({STITCH_PRIVACY_FALLBACK.accessLogs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogFilter('recruiters')}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        logFilter === 'recruiters'
                          ? 'bg-[#00288e] text-white shadow-sm'
                          : 'bg-[#eff4ff] text-[#444653] hover:bg-[#dce9ff]'
                      }`}
                    >
                      Recruiter Views
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogFilter('applications')}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        logFilter === 'applications'
                          ? 'bg-[#00288e] text-white shadow-sm'
                          : 'bg-[#eff4ff] text-[#444653] hover:bg-[#dce9ff]'
                      }`}
                    >
                      Application Views
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogFilter('system')}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        logFilter === 'system'
                          ? 'bg-[#00288e] text-white shadow-sm'
                          : 'bg-[#eff4ff] text-[#444653] hover:bg-[#dce9ff]'
                      }`}
                    >
                      System Verification
                    </button>
                  </div>
                </div>

                {/* Ledger Table */}
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#eff4ff] text-[#444653] uppercase text-[11px] font-semibold tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">Timestamp &amp; Actor</th>
                        <th className="px-4 py-2.5">Organization</th>
                        <th className="px-4 py-2.5">Purpose</th>
                        <th className="px-4 py-2.5">Scope of Data</th>
                        <th className="px-4 py-2.5 text-right">Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70">
                      {filteredLogs.map((item) => (
                        <tr key={item.id} className="hover:bg-[#eff4ff]/60 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-semibold text-[#0b1c30]">{item.date}</div>
                            <div className="text-[#444653] text-[11px]">
                              {item.time} • {item.actor}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${item.orgBg}`}
                              >
                                {item.orgInitial}
                              </div>
                              <span className="font-semibold text-[#0b1c30]">{item.organization}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#eff4ff] text-[#00288e] text-[11px] font-medium border border-slate-200">
                              {item.purpose}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#444653]">{item.scope}</td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center gap-1 text-[#006a61] text-xs font-semibold">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              {item.verification}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* ═══════════════════════════════════════
                  SECTION D: Data Portability & Complete Takeout
              ═══════════════════════════════════════ */}
              <section
                id="data-takeout"
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-200/80 flex flex-col gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-[#eff4ff] text-[#00288e] border border-slate-200/70">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#0b1c30]">
                      Download My Complete Data (Takeout)
                    </h2>
                    <p className="text-xs text-[#444653]">
                      Download a machine-readable JSON archive alongside human-readable details of your stored profile data.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#eff4ff] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-200/70">
                  <div className="flex flex-col gap-1 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[#0b1c30]">
                        Package: CANDIDATE_DATA_{STITCH_PRIVACY_FALLBACK.candidateId.replace('#', '')}.json
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white text-[#444653] text-[11px] font-semibold border border-slate-200">
                        {STITCH_PRIVACY_FALLBACK.archiveSize}
                      </span>
                    </div>
                    <p className="text-xs text-[#444653] leading-relaxed">
                      Includes candidate profile, verified education details, application history, salary preferences, and privacy access logs.
                    </p>
                    <span className="text-xs text-[#006a61] font-medium">
                      Snapshot state: {snapshotDate}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <button
                      type="button"
                      onClick={handleRequestSnapshot}
                      className="px-3.5 py-2 rounded-lg bg-white text-[#0b1c30] text-xs font-semibold shadow-sm hover:bg-[#dce9ff] border border-slate-200 transition-all"
                    >
                      Request Fresh Snapshot
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadArchive}
                      className="px-4 py-2 rounded-lg bg-[#00288e] text-white text-xs font-semibold hover:bg-[#1e40af] shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Archive
                    </button>
                  </div>
                </div>
              </section>

              {/* ═══════════════════════════════════════
                  SECTION E: Account Lifecycle (Deactivation & Permanent Erasure)
              ═══════════════════════════════════════ */}
              <section
                id="account-lifecycle"
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-200/80 flex flex-col gap-6"
              >
                <div className="flex items-center gap-3 pb-2 border-b border-slate-200/60">
                  <div className="p-2.5 rounded-lg bg-[#ffdad6] text-[#ba1a1a]">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#0b1c30]">
                      Account Status &amp; Deletion
                    </h2>
                    <p className="text-xs text-[#444653]">
                      Temporarily pause recruiter matching or execute your right to permanent account deletion.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Option 1: Temporary Deactivation */}
                  <div className="p-5 rounded-xl bg-[#eff4ff] flex flex-col justify-between gap-4 border border-slate-200/70">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-[#0b1c30]">
                        <svg className="w-5 h-5 text-[#444653]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-sm font-bold text-[#0b1c30]">
                          Temporarily Deactivate Account
                        </h3>
                      </div>
                      <p className="text-xs text-[#444653] leading-relaxed">
                        Hide your profile from recruiter searches and pause notifications. Your application history remains preserved. You can reactivate anytime by logging back in.
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setDeactivateModalOpen(true)}
                        className="w-full py-2 px-3 rounded-lg bg-white text-[#0b1c30] text-xs font-semibold hover:bg-[#dce9ff] shadow-sm transition-all flex items-center justify-center gap-1.5 border border-slate-200"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6" />
                        </svg>
                        Deactivate Account
                      </button>
                    </div>
                  </div>

                  {/* Option 2: Permanent Account Deletion */}
                  <div className="p-5 rounded-xl bg-[#ffdad6]/30 flex flex-col justify-between gap-4 border border-[#ffdad6]">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-[#ba1a1a]">
                        <svg className="w-5 h-5 text-[#ba1a1a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <h3 className="text-sm font-bold text-[#ba1a1a]">
                          Permanent Account Deletion (Right to Erasure)
                        </h3>
                      </div>
                      <p className="text-xs text-[#444653] leading-relaxed">
                        Irreversible Action: Deleting your account will permanently remove your profile, applications, resume files, and activity logs in accordance with retention guidelines.
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setDeletionModalOpen(true)}
                        className="w-full py-2 px-3 rounded-lg bg-[#ba1a1a] text-white text-xs font-semibold hover:bg-[#93000a] shadow-sm transition-all flex items-center justify-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Initiate Account Deletion
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* ═══════════════════════════════════════
          MODALS & DIALOGS
      ═══════════════════════════════════════ */}

      {/* 1. Deletion Step-by-Step Flow Modal */}
      {deletionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-2xl flex flex-col gap-4 relative border border-slate-200 animate-scale-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2 text-[#ba1a1a] font-semibold text-sm">
                <svg className="w-5 h-5 text-[#ba1a1a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Right to Erasure: Permanent Account Termination</span>
              </div>
              <button
                type="button"
                onClick={() => setDeletionModalOpen(false)}
                className="p-1 text-[#444653] hover:text-[#0b1c30] rounded"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between bg-[#eff4ff] px-4 py-2 rounded-lg text-xs font-semibold">
              <span className="text-[#00288e] font-bold">Step 1: Reason</span>
              <span className="text-[#c4c5d5]">→</span>
              <span className="text-[#444653]">Step 2: Legal Impact</span>
              <span className="text-[#c4c5d5]">→</span>
              <span className="text-[#444653]">Step 3: OTP Check</span>
              <span className="text-[#c4c5d5]">→</span>
              <span className="text-[#444653]">Step 4: Purge</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#0b1c30]">
                Why are you closing your Vakancy.in candidate account?
              </label>
              <select
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                className="w-full bg-[#eff4ff] text-[#0b1c30] px-3 py-2 rounded-lg text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00288e]/20"
              >
                <option value="Accepted an executive offer elsewhere">Accepted an offer elsewhere</option>
                <option value="Transitioning into independent consulting / startup venture">Transitioning into consulting or startup</option>
                <option value="Privacy concerns regarding recruiter data indexation">Privacy preferences</option>
                <option value="Temporary retirement or career hiatus">Temporary career break</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="bg-[#ffdad6]/30 p-3.5 rounded-lg flex items-start gap-2 border border-[#ffdad6]">
              <input
                id="confirm-check"
                type="checkbox"
                checked={deletionConfirmed}
                onChange={(e) => setDeletionConfirmed(e.target.checked)}
                className="mt-0.5 rounded text-[#ba1a1a] focus:ring-[#ba1a1a]"
              />
              <label htmlFor="confirm-check" className="text-xs text-[#0b1c30] leading-relaxed cursor-pointer">
                I understand that this action is permanent and irreversible under Section 12 of the DPDP Act. My applications, resume variants, and account records will be permanently removed.
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletionModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs font-semibold hover:bg-[#dce9ff]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!deletionConfirmed}
                onClick={() => {
                  setDeletionModalOpen(false);
                  setDeletionConfirmed(false);
                  showToast('Deletion request submitted for this session. Verification OTP sent to primary mobile.');
                }}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  deletionConfirmed
                    ? 'bg-[#ba1a1a] text-white hover:bg-[#93000a] shadow-sm cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Continue to Verification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Temporary Deactivation Modal */}
      {deactivateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 border border-slate-200">
            <div className="flex items-center gap-3 text-[#00288e]">
              <div className="w-10 h-10 rounded-full bg-[#eff4ff] flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-[#00288e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0b1c30]">Deactivate Account?</h3>
                <span className="text-xs text-[#444653]">Temporary sabbatical status</span>
              </div>
            </div>
            <p className="text-xs text-[#444653] leading-relaxed">
              Your profile will be hidden from recruiter searches and alerts will be paused. Existing applications will remain safely saved in our database. You can reactivate anytime by simply logging back in.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeactivateModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs font-semibold hover:bg-[#dce9ff]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeactivateModalOpen(false);
                  setIsDiscoverable(false);
                  showToast('Account set to dormant status. Profile hidden from recruiter searches.');
                }}
                className="px-4 py-2 rounded-lg bg-[#00288e] text-white text-xs font-semibold hover:bg-[#1e40af]"
              >
                Confirm Deactivation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Inspect Data Summary Modal (Right to Information) */}
      {infoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2 text-[#00288e] font-bold text-sm">
                <svg className="w-5 h-5 text-[#00288e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Right to Information: Stored Data Summary</span>
              </div>
              <button
                type="button"
                onClick={() => setInfoModalOpen(false)}
                className="p-1 text-[#444653] hover:text-[#0b1c30] rounded"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#444653]">
              Summary of personal data categories processed under Section 11(1) of the DPDP Act 2023 for Candidate #{STITCH_PRIVACY_FALLBACK.candidateId}:
            </p>

            <div className="flex flex-col gap-2.5 text-xs text-[#0b1c30]">
              <div className="p-3 bg-[#eff4ff] rounded-lg border border-slate-200">
                <span className="font-semibold text-[#00288e] block mb-1">1. Identity &amp; Contact Records</span>
                <p className="text-[#444653]">Full name, verified email, phone number, and location coordinates.</p>
              </div>
              <div className="p-3 bg-[#eff4ff] rounded-lg border border-slate-200">
                <span className="font-semibold text-[#00288e] block mb-1">2. Professional Experience &amp; Resumes</span>
                <p className="text-[#444653]">Uploaded resumes, previous employers, job titles, and verified credentials.</p>
              </div>
              <div className="p-3 bg-[#eff4ff] rounded-lg border border-slate-200">
                <span className="font-semibold text-[#00288e] block mb-1">3. Job Application Activity</span>
                <p className="text-[#444653]">Applied positions, recruiter review timestamps, screening responses, and interview status.</p>
              </div>
              <div className="p-3 bg-[#eff4ff] rounded-lg border border-slate-200">
                <span className="font-semibold text-[#00288e] block mb-1">4. Privacy Preferences &amp; Access Log</span>
                <p className="text-[#444653]">Active consent records, discovery toggles, salary brackets, and recruiter view records.</p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setInfoModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#00288e] text-white text-xs font-semibold hover:bg-[#1e40af]"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Request Correction Modal */}
      {correctionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2 text-[#00288e] font-bold text-sm">
                <svg className="w-5 h-5 text-[#00288e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Request Data Correction</span>
              </div>
              <button
                type="button"
                onClick={() => setCorrectionModalOpen(false)}
                className="p-1 text-[#444653] hover:text-[#0b1c30] rounded"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#444653]">
              Specify the inaccurate or outdated information in your profile that you wish to correct or update:
            </p>

            <textarea
              rows={4}
              value={correctionText}
              onChange={(e) => setCorrectionText(e.target.value)}
              placeholder="e.g., Update past employer title or correct degree graduation year..."
              className="w-full bg-[#eff4ff] text-[#0b1c30] p-3 rounded-lg text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00288e]/20"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCorrectionModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs font-semibold hover:bg-[#dce9ff]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!correctionText.trim()) {
                    showToast('Please describe the information to be corrected.');
                    return;
                  }
                  setCorrectionModalOpen(false);
                  setCorrectionText('');
                  showToast('Correction request submitted to our Data Protection team for review.');
                }}
                className="px-4 py-2 rounded-lg bg-[#00288e] text-white text-xs font-semibold hover:bg-[#1e40af]"
              >
                Submit Correction Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Configure Nominee Modal */}
      {nomineeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2 text-[#00288e] font-bold text-sm">
                <svg className="w-5 h-5 text-[#00288e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>Designate Authorized Nominee</span>
              </div>
              <button
                type="button"
                onClick={() => setNomineeModalOpen(false)}
                className="p-1 text-[#444653] hover:text-[#0b1c30] rounded"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#444653]">
              Under Section 14 of the DPDP Act 2023, designate a trusted nominee authorized to exercise your data rights if you are unable to:
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-[#0b1c30] block mb-1">Nominee Full Name</label>
                <input
                  type="text"
                  value={nomineeName}
                  onChange={(e) => setNomineeName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full bg-[#eff4ff] text-[#0b1c30] px-3 py-2 rounded-lg text-xs border border-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#0b1c30] block mb-1">Relationship</label>
                <input
                  type="text"
                  value={nomineeRelation}
                  onChange={(e) => setNomineeRelation(e.target.value)}
                  placeholder="e.g. Spouse / Family Member / Legal Counsel"
                  className="w-full bg-[#eff4ff] text-[#0b1c30] px-3 py-2 rounded-lg text-xs border border-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#0b1c30] block mb-1">Nominee Email</label>
                <input
                  type="email"
                  value={nomineeEmail}
                  onChange={(e) => setNomineeEmail(e.target.value)}
                  placeholder="priya.sharma@example.com"
                  className="w-full bg-[#eff4ff] text-[#0b1c30] px-3 py-2 rounded-lg text-xs border border-slate-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNomineeModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs font-semibold hover:bg-[#dce9ff]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!nomineeName || !nomineeEmail) {
                    showToast('Please provide nominee name and email address.');
                    return;
                  }
                  setNomineeModalOpen(false);
                  showToast(`Nominee ${nomineeName} recorded for current candidate profile.`);
                }}
                className="px-4 py-2 rounded-lg bg-[#00288e] text-white text-xs font-semibold hover:bg-[#1e40af]"
              >
                Save Nominee Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Adjust Target Salary Bracket Modal */}
      {bracketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2 text-[#00288e] font-bold text-sm">
                <svg className="w-5 h-5 text-[#00288e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Adjust Target Salary Range</span>
              </div>
              <button
                type="button"
                onClick={() => setBracketModalOpen(false)}
                className="p-1 text-[#444653] hover:text-[#0b1c30] rounded"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#444653]">
              Set the target compensation bracket visible to verified recruiters searching for candidates:
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#0b1c30] block mb-1">Minimum Bracket</label>
                <div className="flex items-center bg-[#eff4ff] rounded-lg px-3 py-2 border border-slate-200">
                  <span className="text-xs text-[#444653] mr-1">₹</span>
                  <input
                    type="number"
                    value={minBracket}
                    onChange={(e) => setMinBracket(e.target.value)}
                    className="w-full bg-transparent text-xs text-[#0b1c30] outline-none"
                  />
                  <span className="text-xs text-[#444653]">L</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#0b1c30] block mb-1">Maximum Bracket</label>
                <div className="flex items-center bg-[#eff4ff] rounded-lg px-3 py-2 border border-slate-200">
                  <span className="text-xs text-[#444653] mr-1">₹</span>
                  <input
                    type="number"
                    value={maxBracket}
                    onChange={(e) => setMaxBracket(e.target.value)}
                    className="w-full bg-transparent text-xs text-[#0b1c30] outline-none"
                  />
                  <span className="text-xs text-[#444653]">L</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBracketModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs font-semibold hover:bg-[#dce9ff]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setSalaryBracket(`₹${minBracket}L–₹${maxBracket}L`);
                  setBracketModalOpen(false);
                  showToast(`Target compensation range updated to ₹${minBracket}L–₹${maxBracket}L.`);
                }}
                className="px-4 py-2 rounded-lg bg-[#00288e] text-white text-xs font-semibold hover:bg-[#1e40af]"
              >
                Save Range
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          PORTAL CORPORATE FOOTER
      ═══════════════════════════════════════ */}
      <footer className="w-full bg-white border-t border-slate-200/80 shadow-[0_-1px_4px_rgba(0,0,0,0.02)] pt-12 pb-8 mt-12">
        <div className="max-w-[80rem] mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-slate-200/70">
            {/* Col 1 */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#00288e] flex items-center justify-center">
                  <span className="text-white font-bold text-xs">V</span>
                </div>
                <span className="text-base font-bold text-[#00288e] tracking-tight">
                  Vacancy<span className="text-[#006a61]">.in</span>
                </span>
              </div>
              <p className="text-xs text-[#444653]">Find the right job. Find the right talent.</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#eff4ff] text-[#006a61] text-[11px] font-semibold">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  ISO 9001:2015
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#eff4ff] text-[#006a61] text-[11px] font-semibold">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  DPDP Compliant
                </span>
              </div>
              <p className="text-[11px] text-[#444653] pt-2">© 2025 Vakancy.in. All rights reserved.</p>
            </div>

            {/* Col 2 */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xs uppercase tracking-wider text-[#0b1c30] font-bold">For Candidates</h3>
              <ul className="flex flex-col gap-1.5 text-xs text-[#444653]">
                <li><Link to="/candidate/jobs" className="hover:text-[#00288e] transition-colors">Browse Jobs</Link></li>
                <li><Link to="/candidate/applications" className="hover:text-[#00288e] transition-colors">My Applications</Link></li>
                <li><Link to="/candidate/saved" className="hover:text-[#00288e] transition-colors">Saved Jobs</Link></li>
                <li><Link to="/candidate/resume" className="hover:text-[#00288e] transition-colors">Resume Management</Link></li>
                <li><Link to="/candidate/privacy" className="text-[#00288e] font-semibold">Privacy &amp; DPDP Rights</Link></li>
              </ul>
            </div>

            {/* Col 3 */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xs uppercase tracking-wider text-[#0b1c30] font-bold">For Employers</h3>
              <ul className="flex flex-col gap-1.5 text-xs text-[#444653]">
                <li><Link to="/pricing" className="hover:text-[#00288e] transition-colors">Post a Job</Link></li>
                <li><Link to="/companies" className="hover:text-[#00288e] transition-colors">Employer Solutions</Link></li>
                <li><Link to="/about" className="hover:text-[#00288e] transition-colors">Enterprise Talent</Link></li>
                <li><Link to="/about-us" className="hover:text-[#00288e] transition-colors">Recruitment API</Link></li>
              </ul>
            </div>

            {/* Col 4 */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xs uppercase tracking-wider text-[#0b1c30] font-bold">Security &amp; Legal</h3>
              <ul className="flex flex-col gap-1.5 text-xs text-[#444653]">
                <li><Link to="/candidate/settings" className="hover:text-[#00288e] transition-colors">Account Settings</Link></li>
                <li><Link to="/candidate/privacy" className="hover:text-[#00288e] transition-colors">Privacy Policy</Link></li>
                <li><a href={`mailto:${STITCH_PRIVACY_FALLBACK.dpoEmail}`} className="hover:text-[#00288e] transition-colors">Data Protection Officer</a></li>
                <li><span className="text-[#444653]">DPDP Compliance Hub</span></li>
              </ul>
            </div>

            {/* Col 5 */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xs uppercase tracking-wider text-[#0b1c30] font-bold">Platform Status</h3>
              <p className="text-xs text-[#444653]">Global recruitment infrastructure operating with 99.9% uptime.</p>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1 text-xs text-[#006a61] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#006a61]" />
                  All Systems Operational
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#444653]">
            <p>Vakancy.in recruitment platform powering careers across India and global markets.</p>
            <div className="flex items-center gap-3">
              <Link to="/candidate/settings" className="hover:text-[#00288e]">Security Settings</Link>
              <span>•</span>
              <Link to="/candidate/privacy" className="hover:text-[#00288e]">Privacy Portal</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CandidatePrivacyPage;
