import CandidatePortalShell from '../../components/candidate/CandidatePortalShell';
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import { enrichJobDetails } from '../../services/jobService';

const CandidateSidebar = ({ onLogout }) => (
  <aside className="fixed left-0 top-0 h-full w-64 bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between">
    <div className="flex flex-col">
      <div className="h-16 px-6 flex items-center gap-2 bg-white border-b border-slate-100">
        <Link to="/candidate/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#00288e] flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-base">V</span>
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
            className="flex items-center justify-between px-3 py-2 rounded-lg text-[#444653] hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Dashboard</span>
            </div>
          </Link>
          <Link
            to="/candidate/jobs"
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#1e40af] text-white font-semibold shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Find Jobs</span>
            </div>
          </Link>
          <Link
            to="/candidate/applications"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-[#444653] hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Applications</span>
            </div>
          </Link>
          <Link
            to="/candidate/saved"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-[#444653] hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Saved Jobs</span>
            </div>
          </Link>
        </nav>
      </div>
    </div>
  </aside>
);

const CandidateHeader = ({ user, profile, onLogout }) => {
  const displayName = profile?.name || user?.name || user?.email?.split('@')[0] || '';
  const headline = profile?.headline || '';
  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 px-6 flex items-center justify-between">
      <div className="w-96"></div>
      <div className="flex items-center gap-4">
        <div className="h-6 w-[1px] bg-[#c4c5d5]/30" />
        <div className="flex items-center gap-2 pl-1 cursor-pointer group" onClick={onLogout} title="Click to logout">
          <div className="w-8 h-8 rounded-full bg-[#00288e] text-white flex items-center justify-center font-bold text-xs">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-semibold text-[#0b1c30] group-hover:text-[#00288e] transition-colors leading-tight">
              {displayName}
            </span>
            <span className="text-[11px] text-[#444653] leading-tight">{headline}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

const CandidateApplicationReviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await API.get(`/jobs/${id}`);
        if (res.success && res.job) setJob(enrichJobDetails(res.job));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await API.post('/applications/apply', { job_id: id });
      if (res.success) {
        navigate(`/candidate/jobs/${id}/apply/success`);
      } else {
        setErrorMsg(res.message || 'Unable to submit application.');
        setIsSubmitting(false);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Error submitting application.');
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-sm font-semibold">Loading...</div>;
  if (!job) return <div className="p-8 text-center text-sm font-semibold text-rose-600">Job not found.</div>;

  return (
    <CandidatePortalShell>
      <div className="flex items-center justify-center py-8 w-full">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-xs border border-slate-200/80 p-6 flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-[#0b1c30]">Review Application</h1>
        <h2 className="text-lg font-semibold text-[#444653]">{job.title} at {job.company || 'Company'}</h2>
        
        <div className="bg-[#eff4ff] p-4 rounded-lg border border-[#00288e]/20">
          <h3 className="text-sm font-bold text-[#0b1c30] mb-2">Step 2: Review & Submit</h3>
          <p className="text-xs text-[#444653] mb-4">Please review your information before submitting. Your primary profile will be shared with the employer.</p>
          <div className="text-sm font-semibold text-[#0b1c30]">Name: {profile?.name || user?.name || user?.email}</div>
          <div className="text-sm font-semibold text-[#0b1c30]">Email: {profile?.email || user?.email}</div>
        </div>
        
        {errorMsg && <div className="p-3 bg-rose-50 text-rose-700 text-sm font-semibold rounded-lg border border-rose-200">{errorMsg}</div>}

        <div className="flex justify-end pt-4 gap-3">
           <Link to={`/candidate/jobs/${id}/apply`} className="px-4 py-2 text-sm font-semibold text-[#444653] hover:text-[#0b1c30]">Back</Link>
           <button 
             onClick={handleSubmit}
             disabled={isSubmitting}
             className="px-6 py-2 bg-[#00288e] text-white text-sm font-bold rounded-lg shadow-sm hover:bg-[#1e40af] disabled:opacity-70"
           >
             {isSubmitting ? 'Submitting...' : 'Submit Application'}
           </button>
        </div>
      </div>
    </div>
    </CandidatePortalShell>
  );
};
export default CandidateApplicationReviewPage;
