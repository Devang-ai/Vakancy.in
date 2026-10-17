import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Bookmark, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import CandidatePortalShell from '../../components/candidate/CandidatePortalShell';
/**
 * CandidateDashboard
 * Stitch Screen ID: 8537dd7469714b3daf300458fc0c1f35
 * Project: Vakancy.in Recruitment Platform Design System
 * Route: /candidate/dashboard
 *
 * Design system color tokens (from Stitch Tailwind config):
 * primary = #00288e, secondary = #006a61, surface = #f8f9ff,
 * surface-container-lowest = #ffffff, surface-container-low = #eff4ff,
 * surface-container = #e5eeff, surface-container-high = #dce9ff,
 * on-surface = #0b1c30, on-surface-variant = #444653,
 * primary-container = #1e40af, secondary-container = #86f2e4,
 * on-primary = #ffffff, on-secondary = #ffffff, error = #ba1a1a
 */

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
const CandidateDashboard = () => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  // Real API data state
  
  const [dashboardData, setDashboardData] = useState(null);
  const [savedJobs, setSavedJobs] = useState({});
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    fetchRealData();
  }, []);

  const fetchRealData = async () => {
    try {
      setApiLoading(true);
      setApiError(null);
      const res = await API.get('/candidates/me/dashboard');
      if (res.success && res.data) {
        setDashboardData(res.data);
      } else {
        setApiError('Failed to load dashboard.');
      }
    } catch (err) {
      setApiError('We couldn\'t load your dashboard right now.');
    } finally {
      setApiLoading(false);
    }
  };

  const toggleSave = async (jobId) => {
    try {
      if (savedJobs[jobId]) {
        await API.delete(`/candidates/me/saved-jobs/${jobId}`);
        setSavedJobs(prev => ({ ...prev, [jobId]: false }));
      } else {
        await API.post('/candidates/me/saved-jobs', { job_id: jobId });
        setSavedJobs(prev => ({ ...prev, [jobId]: true }));
      }
      window.dispatchEvent(new Event('vakancy:candidate-counts-update'));
      fetchRealData();
    } catch (err) {
      console.error('Error toggling saved job:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (apiLoading) {
    return (
      <CandidatePortalShell>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[#00288e] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-[#0b1c30]">Loading dashboard...</p>
          </div>
        </div>
      </CandidatePortalShell>
    );
  }

  if (apiError) {
    return (
      <CandidatePortalShell>
        <div className="flex items-center justify-center h-64 text-red-600 font-medium">
          {apiError}
        </div>
      </CandidatePortalShell>
    );
  }

  const { candidate, completion, counts, recentApplications, recommendedJobs } = dashboardData || {};
  const firstName = (candidate?.name || 'Candidate').split(' ')[0];
  const displayName = candidate?.name || 'Candidate';
  const designation = candidate?.headline || 'Job Seeker';
  const location = candidate?.location || 'India';
  const profileStrength = completion?.percentage || 0;
  const missingItems = completion?.missing || [];
  const activeApplications = counts?.applications || 0;
  const savedCount = counts?.saved || 0;
  const applications = recentApplications || [];

  return (
    <CandidatePortalShell>
        {/* ══════════════════════════════
            SECTION 1: Welcome Banner
        ══════════════════════════════ */}
        <section className="w-full rounded-2xl bg-white shadow-xs p-6 relative overflow-hidden border border-[#e5eeff]">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            <div className="flex flex-col gap-2 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-[#0b1c30]">Welcome back, {firstName}</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#dce9ff] text-[#00288e] text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#006a61]" />
                  Profile Active
                </span>
              </div>
              <p className="text-sm text-[#444653]">
                {designation} · {location}
              </p>

              {/* Profile Strength Progress Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
                <div className="flex items-center gap-2 w-64">
                  <div className="flex-1 h-2 rounded-full bg-[#e5eeff] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        profileStrength === 100 ? 'bg-emerald-500' : 'bg-[#1e40af]'
                      }`}
                      style={{ width: `${profileStrength}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-[#00288e]">{profileStrength}%</span>
                </div>
                {profileStrength === 100 ? (
                  <p className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Profile complete
                  </p>
                ) : (
                  <p className="text-xs text-[#444653] flex items-center gap-1">
                    Complete your profile ({profileStrength}% complete)
                  </p>
                )}
              </div>
            </div>

            {/* Quick action CTAs */}
            <div className="flex flex-wrap items-center gap-2">
              <Link
                id="btn-complete-profile"
                to="/candidate/profile"
                className="px-4 py-2 rounded-xl bg-[#00288e] text-white text-xs font-semibold hover:bg-[#1e40af] transition-colors shadow-xs flex items-center gap-1.5"
              >
                My Profile
              </Link>
              <Link
                id="btn-build-ai-resume"
                to="/candidate/ai-builder"
                className="px-4 py-2 rounded-xl bg-blue-50 text-[#00288e] border border-blue-200/80 text-xs font-semibold hover:bg-blue-100 transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#00288e]" />
                Build AI Resume
              </Link>
            </div>
          </div>
        </section>

            {/* ══════════════════════════════
                SECTION 2: Metric Cards Grid
            ══════════════════════════════ */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
              {/* Card 1: Active Applications */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-[#eff4ff] flex flex-col justify-between group hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase text-[#444653] tracking-wide">Active Applications</span>
                  <div className="w-8 h-8 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#00288e]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                      <rect x="9" y="3" width="6" height="4" rx="1"/>
                    </svg>
                  </div>
                </div>
                <div className="pt-2 pb-1 flex items-baseline gap-2">
                  <span className="text-2xl lg:text-3xl font-bold text-[#0b1c30]">{activeApplications}</span>
                  <span className="text-[11px] text-[#006a61] font-medium">Active</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#444653] text-[11px]">
                  <span className="px-1.5 py-0.5 rounded bg-[#eff4ff] font-medium">{counts?.underReview || 0} In Review</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#eff4ff] font-medium">{counts?.shortlisted || 0} Shortlisted</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#dce9ff] text-[#00288e] font-semibold">{counts?.interview || 0} Interview</span>
                </div>
              </div>

              {/* Card 2: Saved Roles */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-[#eff4ff] flex flex-col justify-between group hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase text-[#444653] tracking-wide">Saved Roles</span>
                  <div className="w-8 h-8 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#444653]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                    </svg>
                  </div>
                </div>
                <div className="pt-2 pb-1 flex items-baseline gap-2">
                  <span className="text-2xl lg:text-3xl font-bold text-[#0b1c30]">{savedCount}</span>
                  <span className="text-[11px] text-[#444653]">Roles bookmarked</span>
                </div>
                <div className="flex items-center justify-end text-[#444653] text-[11px]">
                  <Link
                    to="/candidate/saved"
                    className="text-[#00288e] font-semibold hover:underline flex items-center"
                  >
                    View
                    <svg className="w-3 h-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </Link>
                </div>
              </div>
            </section>

            {/* ══════════════════════════════
                SECTION 3: Dual Column Work Area
            ══════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* ─── LEFT COLUMN (8 cols) ─── */}
              <div className="lg:col-span-8 flex flex-col gap-6">

                {/* 3a: Recommended Jobs */}
                <div className="bg-white rounded-xl p-6 shadow-sm flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-[#0b1c30]">Recently Posted Jobs</h2>
                      </div>
                      <p className="text-xs text-[#444653]">
                        Open positions
                      </p>
                    </div>
                    <Link
                      to="/candidate/jobs"
                      className="text-[#00288e] text-xs font-semibold hover:underline flex items-center gap-0.5 self-start sm:self-auto"
                    >
                      Refine criteria
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/>
                        <line x1="4" y1="18" x2="12" y2="18"/>
                      </svg>
                    </Link>
                  </div>

                  {/* Job cards list */}
                  <div className="flex flex-col gap-3">
                    {recommendedJobs.length > 0 ? (
                      recommendedJobs.map((job) => {
                        const compName = job.company || job.company_name || 'Vakancy Employer';
                        const initials = compName.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'VK';
                        const skills = Array.isArray(job.skills) ? job.skills : [];

                        return (
                          <div
                            key={job.id}
                            className="bg-[#eff4ff]/60 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-[#eff4ff] transition-colors group"
                          >
                            <div className="flex items-start gap-3">
                              {/* Company logo */}
                              {job.companyLogo ? (
                                <img
                                  src={job.companyLogo}
                                  alt={compName}
                                  className="w-11 h-11 rounded-lg bg-white p-1 border border-[#e5eeff] object-contain shrink-0 shadow-xs"
                                />
                              ) : (
                                <div className="w-11 h-11 rounded-lg bg-white shadow-xs border border-[#e5eeff] flex items-center justify-center shrink-0 font-bold text-[#00288e] text-sm">
                                  {initials}
                                </div>
                              )}
                              <div className="flex flex-col gap-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Link
                                    to={`/candidate/jobs/${job.id}`}
                                    className="text-sm font-bold text-[#0b1c30] group-hover:text-[#00288e] transition-colors"
                                  >
                                    {job.title}
                                  </Link>
                                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#dce9ff] text-[#00288e]">
                                    {job.employmentType || job.employment_type || 'Full Time'}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[#444653] text-xs">
                                  <span className="font-bold text-[#0b1c30]">{compName}</span>
                                  <span className="flex items-center gap-0.5">
                                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                                    </svg>
                                    {job.location}
                                  </span>
                                  <span className="flex items-center gap-0.5 font-bold text-[#006a61]">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                                    </svg>
                                    {job.salaryRange || 'Competitive'}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                  {skills.slice(0, 4).map((s, idx) => (
                                    <span key={idx} className="px-2 py-0.5 rounded bg-white text-[#0b1c30] text-[11px] font-medium border border-slate-100">
                                      {typeof s === 'string' ? s : s.label || s.name}
                                    </span>
                                  ))}
                                  <span className="text-[#444653] text-[11px] ml-1">• {job.postedAgo || 'Recently'}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex md:flex-col items-center md:items-end gap-2 w-full md:w-auto shrink-0">
                              <Link
                                to={`/candidate/jobs/${job.id}`}
                                className="w-full md:w-auto px-4 py-2 rounded-lg bg-[#00288e] text-white text-xs font-bold hover:bg-[#1e40af] transition-colors shadow-xs flex items-center justify-center gap-1"
                              >
                                <span>Apply with Profile</span>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                                </svg>
                              </Link>
                              <button
                                type="button"
                                title="Save Job"
                                onClick={() => toggleSave(job.id)}
                                className="p-2 rounded-lg text-[#444653] hover:bg-[#e5eeff] transition-colors"
                              >
                                {savedJobs[job.id] ? (
                                  <svg className="w-5 h-5 text-[#00288e]" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                        <p className="text-xs font-bold text-slate-700">No active job recommendations currently.</p>
                        <Link to="/candidate/jobs" className="text-xs text-[#00288e] font-bold hover:underline inline-block">
                          Explore Live Requisitions →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3b: Recent Applications Tracker Table */}
                <div className="bg-white rounded-xl p-6 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-[#0b1c30]">Recent Applications</h2>
                      <p className="text-xs text-[#444653]">Real-time status updates from active hiring teams</p>
                    </div>
                    <Link
                      to="/candidate/applications"
                      className="text-[#00288e] text-xs font-semibold hover:underline flex items-center gap-0.5"
                    >
                      View All ({activeApplications})
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </Link>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-[#eff4ff] text-[#444653] uppercase text-[10px] font-semibold">
                          <th className="py-2.5 px-3 rounded-l-lg">Company &amp; Role</th>
                          <th className="py-2.5 px-3">Applied Date</th>
                          <th className="py-2.5 px-3">Stage / Status</th>
                          <th className="py-2.5 px-3 text-right rounded-r-lg">Next Step</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applications.length > 0 ? (
                          applications.slice(0, 5).map((app) => (
                            <tr key={app.id} className="hover:bg-[#eff4ff]/50 transition-colors">
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-[#eff4ff] flex items-center justify-center font-bold text-[#00288e] text-xs shrink-0">
                                    {(app.company_name || 'CO').slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[13px] font-semibold text-[#0b1c30]">{app.company_name || 'Employer'}</span>
                                    <span className="text-[#444653] text-[11px]">{app.job_title || 'Position'}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-[#444653]">
                                {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : 'Recently'}
                              </td>
                              <td className="py-3 px-3">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#eff4ff] text-[#00288e]">
                                  {app.status || 'Applied'}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right text-[11px] font-medium text-slate-600">
                                {app.status === 'interview' ? 'Interview Scheduled' : 'Application with Hiring Manager'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className="py-8 text-center text-[#444653]">
                              <p className="font-bold text-slate-800 text-xs">No applications submitted yet</p>
                              <p className="text-[11px] text-slate-500 mt-1">Explore live job postings and apply to get started.</p>
                              <Link
                                to="/candidate/jobs"
                                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00288e] text-white rounded-lg text-xs font-bold hover:bg-[#1e40af] transition-all shadow-xs"
                              >
                                Browse Live Jobs →
                              </Link>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3c: Recently Viewed / Featured Roles */}
                {recommendedJobs.length > 0 && (
                  <div className="bg-white rounded-xl p-6 shadow-sm flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-[#0b1c30]">Recent Open Positions</h2>
                      <Link to="/candidate/jobs" className="text-[11px] text-[#00288e] font-semibold hover:underline">
                        View All ({recommendedJobs.length})
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {recommendedJobs.slice(0, 3).map((r) => (
                        <div
                          key={r.id}
                          className="p-3 rounded-lg bg-[#eff4ff] flex flex-col justify-between gap-2 hover:bg-[#e5eeff] transition-colors"
                        >
                          <div>
                            <p className="text-[11px] text-[#444653] font-semibold">{r.company || r.company_name}</p>
                            <p className="text-[13px] font-bold text-[#0b1c30] truncate">{r.title}</p>
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] font-bold text-[#006a61]">{r.salaryRange || 'Competitive'}</span>
                            <Link to={`/candidate/jobs/${r.id}`} className="text-[#00288e] text-[11px] font-bold">
                              Apply →
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ─── RIGHT COLUMN (4 cols) ─── */}
              <div className="lg:col-span-4 flex flex-col gap-6">

                {/* 3d Right: AI Resume Builder Spotlight */}
                <div className="rounded-xl p-6 shadow-sm bg-gradient-to-br from-[#dce9ff] via-[#e5eeff] to-[#eff4ff] flex flex-col gap-3 relative overflow-hidden border border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#00288e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[#00288e]">AI Resume Studio</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#0b1c30]">Tailor Your Resume for Matching Roles</h4>
                  <p className="text-xs text-[#444653]">
                    Create a professional resume tailored to your target roles.
                  </p>
                  <Link
                    id="btn-explore-ai-builder"
                    to="/candidate/ai-builder"
                    className="mt-1 px-4 py-2 rounded-lg bg-[#00288e] text-white text-xs font-semibold hover:bg-[#1e40af] transition-colors shadow-sm flex items-center justify-center gap-1"
                  >
                    Build Resume with AI
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
        </CandidatePortalShell>
  );
};

export default CandidateDashboard;
