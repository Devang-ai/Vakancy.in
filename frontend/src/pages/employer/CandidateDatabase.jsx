import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  MapPin,
  Lock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Briefcase,
  UserCheck,
  Shield,
  PhoneCall,
  RefreshCw,
  Mail,
  Phone,
  Eye,
  FileText,
  Clock,
  X
} from 'lucide-react';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PageTransition, FadeInSection } from '../../components/common/Motion';
import useModalA11y from '../../hooks/useModalA11y';

export default function CandidateDatabase() {
  const { user, profile } = useAuth();

  // Access & Employer State
  const [accessEnabled, setAccessEnabled] = useState(null);
  const [employerInfo, setEmployerInfo] = useState(null);

  // Candidate Data State
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [profileType, setProfileType] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });

  // Detail Modal State
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Callback State (Direct 1-Click Request)
  const [requestingCallback, setRequestingCallback] = useState(false);
  const [callbackPending, setCallbackPending] = useState(false);
  const [callbackStatus, setCallbackStatus] = useState('');
  const [callbackMsg, setCallbackMsg] = useState('');
  const [actionError, setActionError] = useState('');

  useModalA11y(Boolean(selectedCandidate), () => setSelectedCandidate(null));

  useEffect(() => {
    fetchCandidates(1);
  }, []);

  const fetchCandidates = async (page = 1, searchOverride, locationOverride, profileTypeOverride) => {
    try {
      setLoading(true);
      setActionError('');

      const activeSearch = searchOverride !== undefined ? searchOverride : search;
      const activeLocation = locationOverride !== undefined ? locationOverride : location;
      const activeProfileType = profileTypeOverride !== undefined ? profileTypeOverride : profileType;

      const params = {
        page,
        limit: 12
      };
      if (activeSearch && activeSearch.trim()) params.search = activeSearch.trim();
      if (activeLocation && activeLocation.trim()) params.location = activeLocation.trim();
      if (activeProfileType) params.profile_type = activeProfileType;

      console.log('[CandidateDatabase] fetchCandidates with params:', JSON.stringify(params));
      const res = await API.get('/employers/candidate-database', { params });

      if (res && res.success) {
        setAccessEnabled(Boolean(res.access_enabled));
        setEmployerInfo(res.employer || null);

        if (res.callback_pending) {
          setCallbackPending(true);
          setCallbackStatus(res.callback_status || 'NEW');
          setCallbackMsg(
            `A callback request is already active for your account (Status: ${res.callback_status || 'NEW'}). Our recruitment director and operations team will contact you shortly.`
          );
        } else {
          setCallbackPending(false);
        }

        if (res.access_enabled) {
          setCandidates(res.candidates || []);
          if (res.pagination) {
            setPagination(res.pagination);
          }
        }
      } else {
        setActionError(res?.message || 'Failed to load candidate database.');
      }
    } catch (err) {
      console.warn('Candidate database fetch error:', err);
      setActionError(err.message || 'Unable to retrieve candidate database.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const searchVal = document.getElementById('candidate-search-input')?.value ?? search;
    const locVal = document.getElementById('candidate-location-input')?.value ?? location;
    const typeVal = document.getElementById('candidate-profile-type-select')?.value ?? profileType;
    setSearch(searchVal);
    setLocation(locVal);
    setProfileType(typeVal);
    fetchCandidates(1, searchVal, locVal, typeVal);
  };

  const handleResetFilters = () => {
    setSearch('');
    setLocation('');
    setProfileType('');
    setTimeout(() => {
      fetchCandidates(1);
    }, 50);
  };

  // Direct 1-Click Request Callback using authenticated employer account
  const handleDirectCallbackRequest = async () => {
    console.log('[CandidateDatabase] handleDirectCallbackRequest triggered');
    if (requestingCallback || callbackPending) return;

    try {
      setRequestingCallback(true);
      setActionError('');

      const res = await API.post('/employers/candidate-database/callback', {});

      if (res && res.success) {
        setCallbackPending(true);
        setCallbackStatus(res.status || 'NEW');
        setCallbackMsg(
          res.message || 'Callback request registered. Our recruitment director will contact you shortly.'
        );
      } else {
        setActionError(res?.message || 'Unable to register callback request.');
      }
    } catch (err) {
      if (
        err.code === 'CALLBACK_PENDING' ||
        err.status === 400 ||
        err.statusCode === 400 ||
        err.message?.includes('already active')
      ) {
        setCallbackPending(true);
        setCallbackMsg(
          err.message || 'A callback request is already active for your account. Our team will contact you shortly.'
        );
      } else {
        setActionError(err.message || 'Error submitting callback request.');
      }
    } finally {
      setRequestingCallback(false);
    }
  };

  // Company details fallback
  const resolvedCompany = employerInfo?.company_name || profile?.company_name || user?.company_name || 'Employer Account';
  const resolvedContact = employerInfo?.contact_person_name || user?.name || 'Primary Representative';
  const resolvedEmail = employerInfo?.contact_email || user?.email || 'N/A';
  const resolvedPhone = employerInfo?.contact_phone || user?.phone || 'Not Specified';

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold uppercase tracking-wider">
                Talent Sourcing
              </span>
              {accessEnabled && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold uppercase">
                  Access Enabled
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] font-heading tracking-tight">
              Candidate Talent Database
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              {accessEnabled
                ? 'Search and evaluate qualified professionals. Direct contact details and full dossiers are protected in compliance with Vakancy privacy policies.'
                : 'Direct candidate profile search is an authorized capability. Review account verification status and request a consultation below.'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              id="btn-refresh-candidates"
              type="button"
              onClick={() => fetchCandidates(pagination.page)}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Global Error Notice */}
        {actionError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{actionError}</span>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            CASE A: ACCESS DISABLED (SIMPLIFIED LOCKED ACCESS STATE)
        ───────────────────────────────────────────────────────────── */}
        {accessEnabled === false && (
          <FadeInSection>
            <div id="candidate-database-locked-card" className="max-w-2xl mx-auto my-6 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
              {/* Header Banner */}
              <div className="p-8 sm:p-10 bg-gradient-to-b from-blue-50/70 to-white border-b border-slate-100 text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 text-[#00288e] mx-auto flex items-center justify-center shadow-xs mb-4">
                  <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#0b1c30] tracking-tight">
                  Candidate Database Access Locked
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-2.5 leading-relaxed max-w-lg mx-auto">
                  Access to our curated talent database is managed by Vakancy.in. Click below to request a callback from our recruitment director to unlock candidate talent search.
                </p>
              </div>

              {/* Employer Details Attribution Card */}
              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Your Authenticated Organization Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                    <div className="flex items-center gap-2.5">
                      <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Company</span>
                        <strong className="text-slate-900 font-semibold">{resolvedCompany}</strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Contact Person</span>
                        <strong className="text-slate-900 font-semibold">{resolvedContact}</strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Official Email</span>
                        <span className="text-slate-700 font-mono">{resolvedEmail}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Phone Number</span>
                        <span className="text-slate-700 font-mono">{resolvedPhone}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Single Primary Action: Request Callback (No Questionnaire or Forms) */}
                {callbackPending ? (
                  <div className="space-y-3">
                    <div id="callback-already-requested-banner" className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-sm text-amber-800">
                        <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                        <span>Callback Already Requested</span>
                        {callbackStatus && (
                          <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 font-bold text-[10px] uppercase">
                            {callbackStatus}
                          </span>
                        )}
                      </div>
                      <p className="text-amber-700 leading-relaxed pt-1">
                        {callbackMsg || 'Our Recruitment Director and Lead Recruiter have been notified. We will reach out to you shortly to activate candidate talent access.'}
                      </p>
                    </div>

                    <button
                      id="btn-callback-already-requested"
                      type="button"
                      disabled
                      className="w-full py-3.5 rounded-xl bg-slate-200 text-slate-500 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-not-allowed opacity-75"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Callback Already Requested</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <button
                      id="btn-request-database-callback"
                      type="button"
                      onClick={handleDirectCallbackRequest}
                      disabled={requestingCallback}
                      className="w-full py-3.5 rounded-xl bg-[#00288e] hover:bg-blue-900 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {requestingCallback ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Submitting Request...</span>
                        </>
                      ) : (
                        <>
                          <PhoneCall className="w-4 h-4" />
                          <span>Request Callback</span>
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-center text-slate-400">
                      Zero upfront cost. One click sends request directly using your verified employer account.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </FadeInSection>
        )}

        {/* ─────────────────────────────────────────────────────────────
            CASE B: ACCESS ENABLED (CANDIDATE DATABASE ACTIVE SEARCH)
        ───────────────────────────────────────────────────────────── */}
        {accessEnabled === true && (
          <FadeInSection>
            <div id="candidate-database-unlocked-view" className="space-y-6">
              {/* Search & Filter Bar */}
              <form onSubmit={handleSearchSubmit} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="candidate-search-input"
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by candidate headline, skills, title..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#00288e] focus:bg-white"
                  />
                </div>

                <div className="w-full md:w-56 relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="candidate-location-input"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Filter by location (e.g. Mumbai)"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#00288e] focus:bg-white"
                  />
                </div>

                <div className="w-full md:w-48">
                  <select
                    id="candidate-profile-type-select"
                    value={profileType}
                    onChange={(e) => setProfileType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#00288e] focus:bg-white cursor-pointer"
                  >
                    <option value="">All Categories</option>
                    <option value="fresher">Fresher</option>
                    <option value="experienced">Experienced</option>
                    <option value="executive">Executive</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="btn-search-candidates"
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#00288e] hover:bg-blue-900 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    Search Talent
                  </button>
                  {(search || location || profileType) && (
                    <button
                      id="btn-clear-candidate-filters"
                      type="button"
                      onClick={handleResetFilters}
                      className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                      title="Clear filters"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </form>

              {/* Candidates Grid */}
              {loading ? (
                <div className="py-16 text-center text-slate-400">
                  <div className="w-8 h-8 border-3 border-[#00288e] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <span className="text-xs font-semibold">Querying candidate talent database...</span>
                </div>
              ) : candidates.length === 0 ? (
                <div id="candidate-empty-state" className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                  <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-800">No candidate profiles available</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    No candidate profiles currently match your search criteria or access authorization.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {candidates.map((c) => (
                    <div
                      id={`candidate-card-${c.id}`}
                      key={c.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-900 font-heading">
                                {c.name}
                              </h3>
                              {c.is_premium && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  ★ Featured
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 font-medium mt-0.5 line-clamp-1">
                              {c.professional_headline}
                            </p>
                          </div>
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                            {c.profile_type}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{c.total_experience ? `${c.total_experience} Years Exp` : 'Fresher'}</span>
                            {c.current_organization && (
                              <>
                                <span>•</span>
                                <span className="truncate">{c.current_organization}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{c.current_location}</span>
                          </div>
                        </div>

                        {/* Skill Badges */}
                        {c.skills && c.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {c.skills.slice(0, 5).map((sk, idx) => (
                              <span
                                key={idx}
                                className="candidate-skill-pill px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-blue-800 text-[10px] font-medium"
                              >
                                {sk}
                              </span>
                            ))}
                            {c.skills.length > 5 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] text-slate-400 font-semibold">
                                +{c.skills.length - 5}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card Action Footer with View Profile */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="text-slate-400 flex items-center gap-1.5 font-mono text-[11px]">
                          <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{c.masked_email}</span>
                        </div>

                        <button
                          id={`btn-view-candidate-profile-${c.id}`}
                          type="button"
                          onClick={() => setSelectedCandidate(c)}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#00288e] border border-blue-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Profile</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs">
                  <span className="text-slate-500">
                    Showing {(pagination.page - 1) * pagination.limit + 1} -{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} Candidates
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={pagination.page <= 1}
                      onClick={() => fetchCandidates(pagination.page - 1)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 disabled:opacity-40 cursor-pointer"
                    >
                      Previous
                    </button>
                    <span className="px-2 font-semibold text-slate-800">
                      {pagination.page} / {pagination.totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => fetchCandidates(pagination.page + 1)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </FadeInSection>
        )}

        {/* ─────────────────────────────────────────────────────────────
            VIEW PROFILE MODAL (AUTHORIZED DETAILS VIEW)
        ───────────────────────────────────────────────────────────── */}
        {selectedCandidate && typeof document !== 'undefined' && createPortal(
          <div
            id="candidate-profile-modal"
            className="fixed inset-0 bg-[#0b1c30]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-[9999] animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="candidate-profile-modal-title"
            onClick={() => setSelectedCandidate(null)}
          >
            <div
              className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] max-h-[calc(100dvh-2rem)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#00288e] flex items-center justify-center font-bold text-sm">
                    {selectedCandidate.name.charAt(0)}
                  </div>
                  <div>
                    <h3 id="candidate-profile-modal-title" className="text-base font-bold text-slate-900 font-heading">
                      {selectedCandidate.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">{selectedCandidate.professional_headline}</p>
                  </div>
                </div>
                <button
                  id="btn-close-candidate-modal"
                  type="button"
                  onClick={() => setSelectedCandidate(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                  aria-label="Close Profile"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
                {/* Key Overview */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Experience</span>
                    <strong className="text-slate-800">
                      {selectedCandidate.total_experience ? `${selectedCandidate.total_experience} Years` : 'Fresher'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Location</span>
                    <strong className="text-slate-800">{selectedCandidate.current_location}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Category</span>
                    <strong className="text-slate-800 uppercase">{selectedCandidate.profile_type}</strong>
                  </div>
                  {selectedCandidate.current_organization && (
                    <div className="col-span-2 sm:col-span-3 pt-2 border-t border-slate-200/60">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Organization & Role</span>
                      <strong className="text-slate-800">
                        {selectedCandidate.current_designation || 'Specialist'} • {selectedCandidate.current_organization}
                      </strong>
                    </div>
                  )}
                </div>

                {/* Skills */}
                {selectedCandidate.skills && selectedCandidate.skills.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Verified Skills</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCandidate.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="candidate-skill-pill px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 font-medium text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Professional Summary */}
                {selectedCandidate.professional_summary && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Profile Summary</h4>
                    <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                      {selectedCandidate.professional_summary}
                    </p>
                  </div>
                )}

                {/* Contact Information Privacy Protocol */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                    <Shield className="w-4 h-4 text-blue-700" />
                    <span>Contact Privacy Protocol</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Candidate direct contact information is handled confidentially under the Vakancy.in Recruitment Model.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                    <div className="bg-white p-2 rounded-lg border border-slate-200 text-slate-600">
                      <span className="text-[10px] text-slate-400 block font-sans font-bold">Email</span>
                      {selectedCandidate.masked_email}
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200 text-slate-600">
                      <span className="text-[10px] text-slate-400 block font-sans font-bold">Phone</span>
                      {selectedCandidate.masked_phone}
                    </div>
                  </div>
                </div>

                {/* Resume Status */}
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">Resume Status</span>
                    {selectedCandidate.resume_authorized ? (
                      <span className="text-emerald-700 font-medium text-[11px]">
                        Verified Resume Available (Authorized Client Sharing)
                      </span>
                    ) : (
                      <span className="text-slate-600 text-[11px] leading-relaxed">
                        Full resume file is confidential. To schedule an interview or request full candidate credentials, submit an enquiry or contact your assigned Recruiter.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedCandidate(null)}
                  className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </PageTransition>
  );
}
