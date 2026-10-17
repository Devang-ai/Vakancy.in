import Toast from '../../components/common/Toast';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import { enrichJobDetails } from '../../services/jobService';
import CandidatePortalShell from "../../components/candidate/CandidatePortalShell";

// Layout Components


const CandidateJobDetailsPage = () => {
  const { id } = useParams();
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
      const [toast, setToast] = useState(null);
    useEffect(() => {
    fetchJob();
    checkIfAlreadyApplied();
    checkIfSaved();
    return () => {
          };
  }, [id]);

  const fetchJob = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/jobs/${id}`);
      if (res.success && res.job) {
        setJob(enrichJobDetails(res.job));
      } else {
        setJob(null);
      }
    } catch {
      setJob(null);
    } finally {
      setLoading(false);
    }
  };

  const checkIfAlreadyApplied = async () => {
    try {
      const res = await API.get('/applications/my-applications');
      if (res.success && Array.isArray(res.applications)) {
        const found = res.applications.some((app) => String(app.job_id) === String(id));
        if (found) setIsApplied(true);
      }
    } catch {
      // ignore
    }
  };

  const checkIfSaved = async () => {
    try {
      const res = await API.get('/candidates/me/saved-jobs');
      if (res.success && Array.isArray(res.savedJobs)) {
        const found = res.savedJobs.some((app) => String(app.jobId) === String(id) || String(app.id) === String(id));
        if (found) setIsSaved(true);
      }
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

    const triggerToast = (msg, type='info') => {
    setToast({ type, title: msg });
  };

  const handleApply = () => {
    if (isApplied) return;
    if (!user) {
      navigate(`/login?returnUrl=${encodeURIComponent(`/candidate/jobs/${id}/apply`)}`);
      return;
    }
    navigate(`/candidate/jobs/${id}/apply`);
  };

  const handleSaveToggle = async () => {
    if (!user) {
      navigate(`/login?returnUrl=/candidate/jobs/${id}`);
      return;
    }
    try {
      if (isSaved) {
        await API.delete(`/candidates/me/saved-jobs/${id}`);
        setIsSaved(false);
        triggerToast('Removed from Saved Jobs');
      } else {
        await API.post('/candidates/me/saved-jobs', { job_id: id });
        setIsSaved(true);
        triggerToast('Requisition bookmarked in Saved Jobs');
      }
    } catch (err) {
      triggerToast(err.response?.data?.message || err.message || 'Error updating saved jobs.');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: job?.title, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      triggerToast('Job URL copied to clipboard');
    }
  };

  if (loading) {
    return (
      <CandidatePortalShell>
  <div className="bg-white p-8 rounded-xl shadow-xs border border-slate-200/80 text-center max-w-md mx-auto space-y-4 mt-20">
    <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    </div>
    <h2 className="text-lg font-bold text-[#0b1c30]">Requisition Not Found</h2>
    <p className="text-xs text-[#444653]">The position you are looking for does not exist or may have been closed by the employer.</p>
    <Link to="/candidate/jobs" className="inline-block px-4 py-2 bg-[#00288e] text-white rounded-lg font-bold text-xs">
      Browse Open Jobs
    </Link>
  </div>
  {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </CandidatePortalShell>
    );
  }

  const companyName = job.company || job.company_name || 'Vakancy Employer';
  const responsibilities = Array.isArray(job.responsibilities) ? job.responsibilities : [];
  const qualifications = Array.isArray(job.qualifications) ? job.qualifications : [];
  const perks = Array.isArray(job.perks) ? job.perks : [];
  const skills = Array.isArray(job.skills) ? job.skills : (typeof job.skills === 'string' ? job.skills.split(',').map(s=>s.trim()).filter(Boolean) : []);

  const renderStructuredItem = (item) => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    if (typeof item === 'object') {
      const title = item.title || item.category;
      let desc = item.desc || '';
      if (typeof desc === 'object' && !Array.isArray(desc)) desc = JSON.stringify(desc);
      if (Array.isArray(desc)) desc = desc.join(', ');
      
      if (title && desc) return <><strong className="text-[#0b1c30] font-bold">{String(title)}:</strong> {String(desc)}</>;
      if (title) return <strong className="text-[#0b1c30] font-bold">{String(title)}</strong>;
      if (desc) return String(desc);
      try { return JSON.stringify(item); } catch(e) { return String(item); }
    }
    return String(item);
  };

  const formatCurrency = (val, currency) => {
    if (!val) return '';
    const num = Number(val);
    if (isNaN(num)) return val;
    if (currency === 'INR') {
        if (num >= 100000) return `₹${(num / 100000).toFixed(1).replace(/\.0$/, '')}L`;
        return `₹${num.toLocaleString('en-IN')}`;
    }
    const symbol = currency === 'USD' ? '$' : (currency === 'EUR' ? '€' : currency || '');
    return `${symbol}${num.toLocaleString()}`;
  };

  const isClosed = job.status === 'closed' || job.status === 'inactive';
  let isExpired = false;
  if (job.application_deadline) {
    const deadline = new Date(job.application_deadline);
    if (!isNaN(deadline) && deadline < new Date()) {
      isExpired = true;
    }
  }

  const cannotApply = isClosed || isExpired;

  return (
    <CandidatePortalShell>

            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[#444653] text-[11px] font-semibold mb-4">
              <Link to="/candidate/dashboard" className="hover:text-[#00288e] transition-colors">Workspace</Link>
              <span className="text-[#757684]">/</span>
              <Link to="/candidate/jobs" className="hover:text-[#00288e] transition-colors">Find Jobs</Link>
              <span className="text-[#757684]">/</span>
              <span className="text-[#0b1c30] font-bold truncate max-w-sm">{companyName} - {job.title}</span>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8 flex flex-col gap-6">
                
                {/* Header Card */}
                <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden">
                  <div className="px-6 py-6 border-b border-slate-100 flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                           <h1 className="text-2xl font-bold text-[#0b1c30] tracking-tight">{job.title}</h1>
                           {isClosed && <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold uppercase rounded-full tracking-wider">Closed</span>}
                           {isExpired && !isClosed && <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold uppercase rounded-full tracking-wider">Expired</span>}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-[#444653]">
                          <div className="flex items-center gap-1.5"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>{companyName}</div>
                          <div className="flex items-center gap-1.5"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>{job.location || 'Location Unspecified'}</div>
                          {job.currency && (job.min_salary || job.max_salary) && (
                            <div className="flex items-center gap-1.5 text-[#006a61]">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              {formatCurrency(job.min_salary, job.currency)} - {formatCurrency(job.max_salary, job.currency)} {job.salary_period ? `/${job.salary_period}` : ''}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={handleSaveToggle} className={`p-2.5 rounded-lg border transition-all ${isSaved ? 'bg-[#eff4ff] border-[#00288e] text-[#00288e] shadow-sm' : 'bg-white border-slate-200 text-[#444653] hover:border-[#00288e]/30 hover:bg-[#f8f9ff] hover:text-[#0b1c30]'}`}>
                          <svg className={`w-4 h-4 ${isSaved ? 'fill-current' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                        </button>
                        <button onClick={handleShare} className="p-2.5 rounded-lg bg-white border border-slate-200 text-[#444653] hover:border-[#00288e]/30 hover:bg-[#f8f9ff] hover:text-[#0b1c30] transition-all">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {job.workplace_type && (
                         <span className="px-2.5 py-1 bg-slate-100 text-[#444653] text-[10px] font-bold uppercase rounded-md tracking-wider border border-slate-200/50">
                           {job.workplace_type}
                         </span>
                      )}
                      {job.employment_type && (
                         <span className="px-2.5 py-1 bg-slate-100 text-[#444653] text-[10px] font-bold uppercase rounded-md tracking-wider border border-slate-200/50">
                           {job.employment_type}
                         </span>
                      )}
                      {job.department && (
                         <span className="px-2.5 py-1 bg-slate-100 text-[#444653] text-[10px] font-bold uppercase rounded-md tracking-wider border border-slate-200/50">
                           {job.department}
                         </span>
                      )}
                      {job.fresher_allowed ? (
                         <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] font-bold uppercase rounded-md tracking-wider border">
                           Fresher Allowed
                         </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-6 flex flex-col gap-6">
                  {job.description && (
                    <div className="flex flex-col gap-3">
                      <h3 className="text-sm font-bold text-[#0b1c30] uppercase tracking-wide">Job Description</h3>
                      <div className="text-sm text-[#444653] leading-relaxed whitespace-pre-wrap">{job.description}</div>
                    </div>
                  )}

                  {responsibilities.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <h3 className="text-sm font-bold text-[#0b1c30] uppercase tracking-wide">Key Responsibilities</h3>
                      <ul className="flex flex-col gap-2">
                        {responsibilities.map((r, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-[#444653] leading-relaxed">
                            <svg className="w-4 h-4 text-[#00288e] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                            <span>{renderStructuredItem(r)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {qualifications.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <h3 className="text-sm font-bold text-[#0b1c30] uppercase tracking-wide">Qualifications & Requirements</h3>
                      <ul className="flex flex-col gap-2">
                        {qualifications.map((r, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-[#444653] leading-relaxed">
                            <svg className="w-4 h-4 text-[#00288e] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                            <span>{renderStructuredItem(r)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {perks.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <h3 className="text-sm font-bold text-[#0b1c30] uppercase tracking-wide">Perks & Benefits</h3>
                      <div className="flex flex-wrap gap-2">
                        {perks.map((p, i) => (
                          <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f8f9ff] border border-slate-200 rounded-lg text-xs font-semibold text-[#444653]">
                            <svg className="w-3.5 h-3.5 text-[#006a61]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            <span>{renderStructuredItem(p)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {skills.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <h3 className="text-sm font-bold text-[#0b1c30] uppercase tracking-wide">Required Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {skills.map((s, i) => (
                          <span key={i} className="px-3 py-1.5 bg-slate-100 text-[#444653] text-xs font-semibold rounded-md border border-slate-200/50">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200/80 flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-xs font-bold text-[#0b1c30] uppercase tracking-wide">Action Status</h3>
                    <p className="text-[11px] text-[#70727f] leading-relaxed">
                      {isApplied ? "You have already applied for this role. Your profile has been sent to the employer." : "Review requirements carefully before submitting your application."}
                    </p>
                  </div>
                  
                  {isApplied ? (
                    <div className="w-full flex items-center justify-center gap-2 py-3 bg-[#e5eeff] text-[#00288e] rounded-lg font-bold text-sm border border-[#00288e]/20">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                      Application Submitted
                    </div>
                  ) : cannotApply ? (
                    <div className="w-full flex items-center justify-center py-3 bg-slate-100 text-slate-500 rounded-lg font-bold text-sm cursor-not-allowed">
                      {isClosed ? 'Job Closed' : 'Deadline Expired'}
                    </div>
                  ) : (
                    <button
                      onClick={handleApply}
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-[#00288e] hover:bg-[#1e40af] text-white rounded-lg font-bold text-sm shadow-[0_2px_12px_rgba(0,40,142,0.25)] transition-all disabled:opacity-70 disabled:cursor-wait"
                    >
                      {isSubmitting ? 'Submitting...' : 'Apply Now'}
                      {!isSubmitting && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>}
                    </button>
                  )}
                  {job.application_deadline && (
                    <div className="text-center text-[10px] font-semibold text-[#70727f] uppercase tracking-wider mt-1">
                      Deadline: {new Date(job.application_deadline).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
</CandidatePortalShell>
  );
};

export default CandidateJobDetailsPage;
