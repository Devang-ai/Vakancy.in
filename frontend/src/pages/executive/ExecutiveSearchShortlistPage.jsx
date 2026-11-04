import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Briefcase,
  GraduationCap,
  FileText,
  MapPin,
  Clock,
  AlertCircle,
  Download,
  Building2,
  Lock,
  Sparkles,
  CheckCircle2,
  Layers,
  ChevronDown,
  ChevronUp,
  UserCheck,
  ExternalLink,
  Archive,
  KeyRound,
  Mail,
  ArrowRight
} from 'lucide-react';
import API from '../../services/api';
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '../../config/constants';

export const ExecutiveSearchShortlistPage = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorCode, setErrorCode] = useState(null);

  // Verification state for protected employer shortlists
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyOtp, setVerifyOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [verificationSuccess, setVerificationSuccess] = useState('');
  const [recipientHint, setRecipientHint] = useState('');

  // Expanded state for candidate detail cards
  const [expandedCandidates, setExpandedCandidates] = useState({});

  // Downloading resume state
  const [downloadingResumeId, setDownloadingResumeId] = useState(null);
  const [downloadingBulk, setDownloadingBulk] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const getStoredVerifyToken = () => {
    try {
      return sessionStorage.getItem(`vakancy_shortlist_verify_${token}`) || '';
    } catch (e) {
      return '';
    }
  };

  useEffect(() => {
    fetchShortlist();
  }, [token]);

  const fetchShortlist = async (overrideToken) => {
    try {
      setLoading(true);
      setError(null);
      setErrorCode(null);

      const verifyToken = overrideToken || getStoredVerifyToken();
      const headers = {};
      if (verifyToken) {
        headers['X-Shortlist-Verify-Token'] = verifyToken;
      }

      // Dedicated endpoint for executive search shortlist
      const res = await API.get(`/executive-search/shortlist/${token}`, { headers });
      
      if (res.success) {
        if (res.requires_verification) {
          setRequiresVerification(true);
          setData(res.shortlist);
          if (res.shortlist?.recipient_hint) {
            setRecipientHint(res.shortlist.recipient_hint);
          }
        } else if (res.shortlist) {
          setRequiresVerification(false);
          setData(res.shortlist);
          // By default expand the first candidate
          if (res.shortlist.candidates?.length > 0) {
            setExpandedCandidates({ [res.shortlist.candidates[0].id]: true });
          }
        }
      } else {
        setError(res.message || 'Shortlist unavailable.');
        setErrorCode(res.code || 'UNAVAILABLE');
      }
    } catch (err) {
      setError(err.message || 'Failed to load executive search candidate shortlist.');
      setErrorCode(err.code || 'ERROR');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!verifyEmail || !verifyEmail.includes('@')) {
      setVerificationError('Please enter a valid authorized employer email address.');
      return;
    }

    try {
      setSendingOtp(true);
      setVerificationError('');
      setVerificationSuccess('');

      const res = await API.post(`/executive-search/shortlist/${token}/send-otp`, {
        email: verifyEmail.trim()
      });

      if (res.success) {
        setOtpSent(true);
        setVerificationSuccess(res.message || 'Verification code sent to your email.');
      } else {
        setVerificationError(res.message || 'Failed to send verification code.');
      }
    } catch (err) {
      setVerificationError(err.message || 'Unable to request verification code. Please verify your email.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (!verifyOtp || verifyOtp.trim().length !== 6) {
      setVerificationError('Please enter the 6-digit verification code.');
      return;
    }

    try {
      setVerifyingOtp(true);
      setVerificationError('');

      const res = await API.post(`/executive-search/shortlist/${token}/verify-otp`, {
        email: verifyEmail.trim(),
        otp: verifyOtp.trim()
      });

      if (res.success && res.verification_token) {
        try {
          sessionStorage.setItem(`vakancy_shortlist_verify_${token}`, res.verification_token);
        } catch (e) {
          // ignore
        }
        setVerificationSuccess('Access verified! Loading candidate dossier...');
        await fetchShortlist(res.verification_token);
      } else {
        setVerificationError(res.message || 'Invalid or expired verification code.');
      }
    } catch (err) {
      setVerificationError(err.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const toggleCandidateExpand = (candId) => {
    setExpandedCandidates((prev) => ({
      ...prev,
      [candId]: !prev[candId]
    }));
  };

  const handleDownloadResume = async (candId, candName) => {
    try {
      setDownloadingResumeId(candId);
      setDownloadError('');

      const verifyToken = getStoredVerifyToken();
      const headers = {};
      if (verifyToken) {
        headers['X-Shortlist-Verify-Token'] = verifyToken;
      }

      const res = await API.get(`/executive-search/shortlist/${token}/resumes/${candId}`, { headers });
      if (res.success && res.download_url) {
        // Open signed download link
        const link = document.createElement('a');
        link.href = res.download_url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.download = res.file_name || `${candName.replace(/\s+/g, '_')}_Resume.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        setDownloadError(res.message || 'Unable to download candidate resume.');
      }
    } catch (err) {
      setDownloadError(err.message || 'Failed to retrieve resume document.');
    } finally {
      setDownloadingResumeId(null);
    }
  };

  const handleBulkDownload = async () => {
    try {
      setDownloadingBulk(true);
      setDownloadError('');

      const verifyToken = getStoredVerifyToken();
      let bulkUrl = `/api/executive-search/shortlist/${token}/resumes-bulk`;
      if (verifyToken) {
        bulkUrl += `?verify_token=${encodeURIComponent(verifyToken)}`;
      }

      // Directly trigger browser download of the stream
      const link = document.createElement('a');
      link.href = bulkUrl;
      link.setAttribute('download', `${data?.title || 'Executive_Shortlist'}_Resumes.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setDownloadError(err.message || 'Failed to initiate bulk download.');
    } finally {
      setTimeout(() => setDownloadingBulk(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-slate-300">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold tracking-wide text-white">Loading Confidential Shortlist Dossier...</p>
          <p className="text-xs text-slate-400">Vakancy Executive Search Platform</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    const isRevoked = errorCode === 'SHORTLIST_REVOKED';
    const isExpired = errorCode === 'SHORTLIST_EXPIRED';

    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 text-slate-700">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-2xl text-center space-y-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${
            isExpired ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
          }`}>
            <AlertCircle className="w-7 h-7" />
          </div>

          <h2 className="text-lg font-bold text-slate-900">
            {isRevoked ? 'Shortlist Link Revoked' : isExpired ? 'Shortlist Link Expired' : 'Link Unavailable or Invalid'}
          </h2>

          <p className="text-xs text-slate-600 leading-relaxed">
            {error || 'This candidate shortlist is no longer active. Please contact your assigned Vakancy executive recruitment consultant.'}
          </p>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800">Need an updated shortlist or assistance?</div>
            <div>Email: <a href={SUPPORT_MAILTO} className="text-blue-700 font-medium hover:underline">{SUPPORT_EMAIL}</a></div>
            <div className="text-slate-500 text-[11px]">Vakancy Executive Search Client Support Desk</div>
          </div>

          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center text-xs font-bold text-blue-700 hover:text-blue-800"
            >
              Return to Vakancy.in Home →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Render Employer OTP Verification Gate if access is restricted
  if (requiresVerification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center p-4 sm:p-6 text-slate-100">
        <div className="max-w-md w-full bg-white text-slate-800 rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 to-blue-950 p-6 text-white text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400/40 text-blue-300 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-6 h-6" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 text-[10px] font-bold tracking-wider uppercase">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> Authorized Access Required
            </div>
            <h1 className="text-lg font-extrabold tracking-tight">Executive Shortlist Verification</h1>
            <p className="text-xs text-slate-300">
              Candidate resumes and evaluation data are confidential and protected.
            </p>
          </div>

          {/* Job summary pill */}
          <div className="p-5 border-b border-slate-100 bg-slate-50/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">{data?.job?.title || 'Executive Mandate'}</span>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold text-[10px]">
                {data?.candidate_count || 0} Candidates
              </span>
            </div>
            <div className="text-slate-500 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{data?.job?.company_name || 'Client Organization'}</span>
            </div>
            {recipientHint && (
              <div className="text-[11px] text-slate-500 pt-1">
                Authorized recipient: <strong className="text-slate-700">{recipientHint}</strong>
              </div>
            )}
          </div>

          {/* Form */}
          <div className="p-6 space-y-4">
            {verificationError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{verificationError}</span>
              </div>
            )}

            {verificationSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{verificationSuccess}</span>
              </div>
            )}

            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Employer Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={verifyEmail}
                      onChange={(e) => setVerifyEmail(e.target.value)}
                      placeholder="e.g. hiring.lead@company.com"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Enter the authorized email address that received this shortlist.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={sendingOtp}
                  className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {sendingOtp ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Send 6-Digit Verification Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Enter 6-Digit Code
                    </label>
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-[11px] text-blue-700 font-semibold hover:underline"
                    >
                      Change Email
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={verifyOtp}
                      onChange={(e) => setVerifyOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-center tracking-[0.4em] font-mono text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                    <span>Code sent to {verifyEmail}</span>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sendingOtp}
                      className="text-blue-700 font-semibold hover:underline disabled:opacity-50"
                    >
                      Resend Code
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={verifyingOtp || verifyOtp.length !== 6}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {verifyingOtp ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify & Access Shortlist</span>
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="pt-3 border-t border-slate-100 text-center text-[11px] text-slate-500 space-y-1">
              <p>Having trouble verifying your access?</p>
              <a href={SUPPORT_MAILTO} className="text-blue-700 font-medium hover:underline">
                Contact {SUPPORT_EMAIL}
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { job, candidates = [] } = data;
  const hasDownloadableResumes = candidates.some(c => c.has_resume) && data.allow_resume_download;

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 lg:px-8 font-sans antialiased text-slate-800">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Top Executive Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl border border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Vakancy Executive Search
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Vakancy Executive Search — Candidate Shortlist
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <span className="font-bold text-white text-sm">{job?.title || 'Executive Mandate'}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  {job?.company_name || 'Client Organization'}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  {job?.location || 'India'}
                </span>
                <span>•</span>
                <span className="bg-blue-600/30 px-2 py-0.5 rounded text-blue-200 font-semibold">
                  {candidates.length} Candidate{candidates.length === 1 ? '' : 's'} Shortlisted
                </span>
              </div>
            </div>

            {/* Quick Actions (Bulk Download) */}
            {hasDownloadableResumes && (
              <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={handleBulkDownload}
                  disabled={downloadingBulk}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                  title="Download all candidate resumes as a single ZIP archive"
                >
                  {downloadingBulk ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Archive className="w-4 h-4" />
                  )}
                  Download All Resumes (ZIP)
                </button>
              </div>
            )}
          </div>

          {/* Privacy & Expiration Alert Bar */}
          <div className="mt-6 pt-4 border-t border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-300 gap-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Confidential Dossier:</strong> Contact details are privacy-protected. Shared strictly for hiring evaluation.
              </span>
            </div>
            {data.expires_at && (
              <div className="flex items-center gap-1.5 text-amber-300 bg-amber-950/40 px-3 py-1 rounded-lg border border-amber-800/50 shrink-0">
                <Clock className="w-3.5 h-3.5" />
                <span>Expires on {new Date(data.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            )}
          </div>
        </div>

        {/* Global Error Banner */}
        {downloadError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{downloadError}</span>
            </div>
            <button onClick={() => setDownloadError('')} className="font-bold hover:underline">Dismiss</button>
          </div>
        )}

        {/* Candidate Cards Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-700" />
              Curated Candidate Shortlist ({candidates.length})
            </h2>
            <div className="text-xs text-slate-500 font-medium">
              Click candidate card to expand profile details
            </div>
          </div>

          {candidates.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-2">
              <Briefcase className="w-8 h-8 mx-auto text-slate-400" />
              <p className="font-semibold text-slate-700">No candidates currently on this shortlist.</p>
              <p className="text-xs">Your recruitment consultant is sourcing and evaluating top candidates.</p>
            </div>
          ) : (
            candidates.map((cand, idx) => {
              const isExpanded = Boolean(expandedCandidates[cand.id]);

              return (
                <div
                  key={cand.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition-all hover:border-slate-300"
                >
                  {/* Card Header (Clickable Accordion) */}
                  <div
                    onClick={() => toggleCandidateExpand(cand.id)}
                    className="p-5 sm:p-6 cursor-pointer select-none bg-white hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar initials with ranking badge */}
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white font-extrabold text-base flex items-center justify-center shadow-sm">
                          {cand.name ? cand.name.slice(0, 2).toUpperCase() : `C${idx + 1}`}
                        </div>
                        <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                          {idx + 1}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900 tracking-tight">
                            {cand.name}
                          </h3>
                          {cand.is_contact_masked && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" /> Privacy Protected
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-semibold text-blue-700">
                          {cand.current_designation || cand.professional_headline || 'Senior Executive'}
                          {cand.current_organization ? ` at ${cand.current_organization}` : ''}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
                          <span>⏱️ <strong>{cand.total_experience || 0} Years</strong> Exp</span>
                          <span>•</span>
                          <span>📍 {cand.current_location || 'India'}</span>
                          {cand.email && (
                            <>
                              <span>•</span>
                              <span>✉️ {cand.email}</span>
                            </>
                          )}
                          {cand.phone && (
                            <>
                              <span>•</span>
                              <span>📞 {cand.phone}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      {cand.has_resume && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadResume(cand.id, cand.name);
                          }}
                          disabled={downloadingResumeId === cand.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold text-xs transition-colors disabled:opacity-50"
                          title="Download Resume"
                        >
                          {downloadingResumeId === cand.id ? (
                            <span className="w-3.5 h-3.5 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          Resume
                        </button>
                      )}

                      <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Recruiter Notes Banner (if provided by admin) */}
                  {cand.recruiter_notes && (
                    <div className="bg-amber-50/70 border-t border-b border-amber-200/80 px-6 py-2.5 text-xs text-amber-900 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Consultant Evaluation Note:</strong> {cand.recruiter_notes}
                      </div>
                    </div>
                  )}

                  {/* Expanded Body Details */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 p-6 space-y-6 bg-slate-50/40 text-xs">
                      {/* Professional Summary */}
                      {cand.professional_summary && (
                        <div className="space-y-1.5">
                          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                            Executive Summary
                          </h4>
                          <p className="text-slate-600 leading-relaxed bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                            {cand.professional_summary}
                          </p>
                        </div>
                      )}

                      {/* Key Skills */}
                      {cand.skills && cand.skills.length > 0 && (
                        <div className="space-y-1.5">
                          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                            Verified Core Competencies
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {cand.skills.map((skill, sIdx) => (
                              <span
                                key={sIdx}
                                className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-800 font-semibold text-xs shadow-2xs"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Work Experience */}
                      {cand.experience && cand.experience.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-blue-700" /> Professional Career History
                          </h4>
                          <div className="space-y-2.5">
                            {cand.experience.map((exp, eIdx) => (
                              <div
                                key={eIdx}
                                className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between font-bold text-slate-900">
                                  <span>{exp.designation || 'Role'}</span>
                                  <span className="text-[11px] text-slate-500 font-normal">
                                    {exp.from_date || ''} - {exp.is_currently_working ? 'Present' : exp.to_date || ''}
                                  </span>
                                </div>
                                <div className="text-slate-600 font-semibold">{exp.organization}</div>
                                {exp.key_achievements && (
                                  <p className="text-slate-500 text-[11px] leading-relaxed pt-1">
                                    {exp.key_achievements}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Education */}
                      {cand.education && cand.education.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <GraduationCap className="w-3.5 h-3.5 text-blue-700" /> Education & Credentials
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {cand.education.map((edu, edIdx) => (
                              <div
                                key={edIdx}
                                className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-0.5"
                              >
                                <div className="font-bold text-slate-900">{edu.degree || 'Degree'}</div>
                                <div className="text-slate-600">{edu.institution}</div>
                                {edu.specialization && <div className="text-slate-500 text-[11px]">{edu.specialization}</div>}
                                {edu.year && <div className="text-slate-400 text-[10px]">Year of Graduation: {edu.year}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Footer for Candidate */}
                      <div className="pt-2 flex items-center justify-between border-t border-slate-200/80">
                        <span className="text-[11px] text-slate-500">
                          To schedule an interview with {cand.name}, notify your Vakancy executive search account manager.
                        </span>
                        {cand.has_resume && (
                          <button
                            type="button"
                            onClick={() => handleDownloadResume(cand.id, cand.name)}
                            disabled={downloadingResumeId === cand.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download Resume
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Download & Contact Callout */}
        {hasDownloadableResumes && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="font-bold text-slate-900 text-sm">Download All Shortlisted Candidate Resumes</h3>
              <p className="text-xs text-slate-500">
                Get all approved candidate resumes bundled in a clean, organized ZIP archive.
              </p>
            </div>
            <button
              type="button"
              onClick={handleBulkDownload}
              disabled={downloadingBulk}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all shrink-0 disabled:opacity-50"
            >
              <Archive className="w-4 h-4 text-blue-400" />
              Download All Resumes (ZIP)
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 py-4 space-y-1">
          <p>© {new Date().getFullYear()} Vakancy.in — Executive Search Division. All rights reserved.</p>
          <p>Confidential Client Portal • Generated securely for authorized hiring decision makers.</p>
        </div>

      </div>
    </div>
  );
};

export default ExecutiveSearchShortlistPage;
