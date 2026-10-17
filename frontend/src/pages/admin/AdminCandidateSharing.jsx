import React, { useState, useEffect } from 'react';
import {
  Share2,
  CheckCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Plus,
  Copy,
  Users,
  Briefcase,
  CreditCard,
  Lock,
  FileCheck
} from 'lucide-react';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/admin/StatusBadge';
import ModalDialog from '../../components/admin/ModalDialog';

export const AdminCandidateSharing = () => {
  const { user } = useAuth();
  const [shares, setShares] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [proposeModalOpen, setProposeModalOpen] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [selectedShareForApproval, setSelectedShareForApproval] = useState(null);
  const [paymentExceptionApproved, setPaymentExceptionApproved] = useState(false);
  const [paymentExceptionReason, setPaymentExceptionReason] = useState('');
  const [copiedToken, setCopiedToken] = useState(null);

  // Form State
  const [candidateId, setCandidateId] = useState('');
  const [jobId, setJobId] = useState('');
  const [candidateConsent, setCandidateConsent] = useState(false);
  const [consentNotes, setConsentNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const userRole = (user?.role || '').toLowerCase();
  const canApprove = userRole === 'director' || userRole === 'main_admin' || userRole === 'admin';
  const canReview = userRole === 'tl_coordinator' || canApprove;

  useEffect(() => {
    fetchShares();
    fetchDropdowns();
  }, []);

  const fetchShares = async () => {
    try {
      setLoading(true);
      const res = await API.get('/admin/candidate-shares');
      if (res.success) {
        setShares(res.shares || []);
      }
    } catch (err) {
      console.warn('Error fetching candidate shares:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [candRes, jobRes] = await Promise.all([
        API.get('/admin/candidates?limit=100').catch(() => ({ candidates: [] })),
        API.get('/admin/jobs').catch(() => ({ jobs: [] }))
      ]);
      if (candRes.success) setCandidates(candRes.candidates || []);
      if (jobRes.success) setJobs(jobRes.jobs || []);
    } catch (_) {}
  };

  const handlePropose = async (e) => {
    e.preventDefault();
    if (!candidateId) return;

    try {
      setSubmitting(true);
      const res = await API.post('/admin/candidate-shares/propose', {
        candidate_id: candidateId,
        job_id: jobId || null,
        candidate_consent: candidateConsent,
        consent_notes: consentNotes.trim()
      });
      if (res.success) {
        setProposeModalOpen(false);
        setCandidateId('');
        setJobId('');
        setCandidateConsent(false);
        setConsentNotes('');
        fetchShares();
      }
    } catch (err) {
      alert('Failed to propose candidate share: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTLReview = async (shareId) => {
    try {
      const res = await API.put(`/admin/candidate-shares/${shareId}/review`, {
        candidate_consent: true,
        consent_notes: 'Consent verified during TL coordination'
      });
      if (res.success) {
        fetchShares();
      }
    } catch (err) {
      alert('Review error: ' + err.message);
    }
  };

  const openApprovalDialog = (share) => {
    setSelectedShareForApproval(share);
    setPaymentExceptionApproved(false);
    setPaymentExceptionReason('');
    setApprovalModalOpen(true);
  };

  const handleExecuteApproval = async (e) => {
    e.preventDefault();
    if (!selectedShareForApproval) return;

    const isVerified = selectedShareForApproval.commercial_payment_status === 'VERIFIED' || selectedShareForApproval.payment_verified === 1;

    if (!isVerified && !paymentExceptionApproved) {
      alert('Cannot approve candidate sharing: Commercial payment is unverified. If Director authorizes an exception, check the exception box and provide a reason.');
      return;
    }

    if (paymentExceptionApproved && !paymentExceptionReason.trim()) {
      alert('Please provide a mandatory justification reason for the payment exception waiver.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await API.put(`/admin/candidate-shares/${selectedShareForApproval.id}/approve`, {
        payment_exception_approved: paymentExceptionApproved,
        payment_exception_reason: paymentExceptionReason.trim()
      });
      if (res.success) {
        setApprovalModalOpen(false);
        setSelectedShareForApproval(null);
        fetchShares();
      }
    } catch (err) {
      alert('Approval error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (shareId) => {
    if (!confirm('Are you sure you want to revoke this candidate share link? The client will no longer have access.')) return;
    try {
      const res = await API.put(`/admin/candidate-shares/${shareId}/revoke`, {});
      if (res.success) {
        fetchShares();
      }
    } catch (err) {
      alert('Revocation error: ' + err.message);
    }
  };

  const copyShareLink = (token) => {
    const fullUrl = `${window.location.origin}/admin/share/${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Candidate Sharing & Client Approvals</h1>
          <p className="text-xs text-slate-500 mt-1">
            Enforces the 4-step governance workflow: Recruiter Recommends → TL Reviews → Director Approves + Consent & Payment Verification → Cryptographic Share Token.
          </p>
        </div>
        <div>
          <button
            onClick={() => setProposeModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Propose Candidate Submission</span>
          </button>
        </div>
      </div>

      {/* Governance Explanation Banner */}
      <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-3 text-xs text-blue-900">
        <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-950">Candidate Consent & Paid Commercial Gating Mandate</p>
          <p className="text-blue-800/80 leading-relaxed">
            Candidate contact details and private evaluations are strictly protected. Client dossiers require documented candidate consent and verified commercial payment (or Director authorized exception) before secure token activation.
          </p>
        </div>
      </div>

      {/* Candidate Shares Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Candidate</th>
                <th className="px-5 py-3.5">Requisition / Client</th>
                <th className="px-5 py-3.5">Consent Status</th>
                <th className="px-5 py-3.5">Commercial Payment</th>
                <th className="px-5 py-3.5">Workflow Status</th>
                <th className="px-5 py-3.5">Secure Share Link</th>
                <th className="px-5 py-3.5 text-right">Governance Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">Loading sharing queue...</td>
                </tr>
              ) : shares.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <Share2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-600">No candidate sharing submissions in queue</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Click "Propose Candidate Submission" to recommend talent to a client.</p>
                  </td>
                </tr>
              ) : (
                shares.map((sh) => {
                  const isPaymentVerified = sh.commercial_payment_status === 'VERIFIED' || sh.payment_verified === 1;
                  const isException = sh.payment_exception_approved === 1;

                  return (
                    <tr key={sh.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-slate-900">
                        <div>
                          <span className="font-semibold block">{sh.candidate_name}</span>
                          <span className="text-[11px] text-slate-400 block">{sh.professional_headline || 'Candidate'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        <div>
                          <span className="font-medium text-slate-800 block">{sh.job_title || 'Executive Mandate'}</span>
                          <span className="text-[11px] text-slate-400 block">{sh.client_name || 'Direct Client'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {sh.candidate_consent ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle className="w-3 h-3" /> Consent Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            <AlertTriangle className="w-3 h-3" /> Consent Required
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {isPaymentVerified ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CreditCard className="w-3 h-3" /> Payment Verified
                          </span>
                        ) : isException ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200" title={sh.payment_exception_reason}>
                            <FileCheck className="w-3 h-3" /> Exception Approved
                          </span>
                        ) : sh.commercial_payment_status === 'PAYMENT_PENDING' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <Clock className="w-3 h-3" /> Payment Pending
                          </span>
                        ) : sh.commercial_payment_status === 'QUOTED' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            Quoted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                            Unbilled / Pending
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {sh.status === 'APPROVED' ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => copyShareLink(sh.share_token)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium inline-flex items-center gap-1 transition-colors"
                            >
                              <Copy className="w-3 h-3 text-slate-500" />
                              <span>{copiedToken === sh.share_token ? 'Copied!' : 'Copy Link'}</span>
                            </button>
                            <a
                              href={`/admin/share/${sh.share_token}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-slate-400 hover:text-blue-700"
                              title="Preview client dossier"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Pending approval</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-1.5">
                        {/* TL Review Step */}
                        {sh.status === 'PROPOSED' && canReview && (
                          <button
                            onClick={() => handleTLReview(sh.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                          >
                            TL Review & Forward
                          </button>
                        )}

                        {/* Approval Step */}
                        {sh.status === 'TL_REVIEWED' && (canApprove || userRole === 'tl_coordinator') && (
                          <button
                            onClick={() => openApprovalDialog(sh)}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
                          >
                            Approve Share
                          </button>
                        )}

                        {/* Revocation */}
                        {sh.status === 'APPROVED' && (canApprove || userRole === 'tl_coordinator') && (
                          <button
                            onClick={() => handleRevoke(sh.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded border border-rose-200 transition-colors"
                          >
                            Revoke Link
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Propose Candidate Submission Modal */}
      <ModalDialog
        isOpen={proposeModalOpen}
        onClose={() => setProposeModalOpen(false)}
        title="Propose Candidate Submission"
        subtitle="Step 1: Recruiter screens and recommends talent for client submission."
      >
        <form onSubmit={handlePropose} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Select Candidate *</label>
            <select
              required
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-blue-600"
            >
              <option value="">-- Choose Candidate --</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Select Job Requisition (Optional)</label>
            <select
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-blue-600"
            >
              <option value="">-- General Client Mandate --</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.title} ({j.company_name || 'Vakancy'})</option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 space-y-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={candidateConsent}
                onChange={(e) => setCandidateConsent(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <span className="text-xs text-amber-900 font-semibold">
                Candidate Consent Verified
              </span>
            </label>
            <p className="text-[11px] text-amber-800 leading-normal pl-5">
              I certify that candidate has provided explicit consent to share their profile with this specific client/mandate.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Consent Notes & Verification Reference</label>
            <input
              type="text"
              value={consentNotes}
              onChange={(e) => setConsentNotes(e.target.value)}
              placeholder="e.g. Call verified on 10 Oct 2026, confirmed target salary"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setProposeModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !candidateId}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Propose for TL Review'}
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Approval & Payment Verification Modal */}
      <ModalDialog
        isOpen={approvalModalOpen}
        onClose={() => {
          setApprovalModalOpen(false);
          setSelectedShareForApproval(null);
        }}
        title="Candidate Sharing Approval"
        subtitle={`Approve client submission for ${selectedShareForApproval?.candidate_name || 'Candidate'}`}
      >
        <form onSubmit={handleExecuteApproval} className="space-y-4">
          {/* Candidate & Client Overview */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Candidate:</span>
              <span className="font-semibold text-slate-800">{selectedShareForApproval?.candidate_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Target Mandate:</span>
              <span className="font-semibold text-slate-800">{selectedShareForApproval?.job_title || 'Executive Mandate'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Candidate Consent:</span>
              <span className={selectedShareForApproval?.candidate_consent ? "text-emerald-700 font-semibold" : "text-rose-700 font-semibold"}>
                {selectedShareForApproval?.candidate_consent ? "✓ Verified" : "✗ Missing"}
              </span>
            </div>
          </div>

          {/* Payment Status Check */}
          {(selectedShareForApproval?.commercial_payment_status === 'VERIFIED' || selectedShareForApproval?.payment_verified === 1) ? (
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-emerald-900">Commercial Payment Verified</p>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  The client has a confirmed, verified commercial record. Proceed to activate the secure cryptographic link.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-900">
                    Payment Not Verified (Status: {selectedShareForApproval?.commercial_payment_status || 'Unbilled'})
                  </p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    By default, candidate sharing requires verified payment. You may only activate this link if authorized to approve an explicit payment waiver.
                  </p>
                </div>
              </div>

              {canApprove && (
                <div className="p-3 bg-purple-50/60 rounded-lg border border-purple-200 space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paymentExceptionApproved}
                      onChange={(e) => setPaymentExceptionApproved(e.target.checked)}
                      className="mt-0.5 rounded border-purple-300 text-purple-700 focus:ring-purple-600"
                    />
                    <span className="text-xs text-purple-950 font-semibold">
                      Authorize Director Payment Exception Waiver
                    </span>
                  </label>

                  {paymentExceptionApproved && (
                    <div className="pt-1">
                      <label className="block text-[11px] font-medium text-purple-900 mb-1">
                        Mandatory Exception Justification *
                      </label>
                      <input
                        type="text"
                        required
                        value={paymentExceptionReason}
                        onChange={(e) => setPaymentExceptionReason(e.target.value)}
                        placeholder="e.g. Master Service Agreement Net-30 billing approved by Director"
                        className="w-full px-2.5 py-1.5 text-xs rounded border border-purple-300 bg-white focus:outline-hidden focus:border-purple-600"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setApprovalModalOpen(false);
                setSelectedShareForApproval(null);
              }}
              className="px-4 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Activating...' : 'Authorize & Activate Link'}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
};

export default AdminCandidateSharing;
