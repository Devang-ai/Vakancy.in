import React, { useState, useEffect } from 'react';
import {  useParams, Link , useOutletContext } from 'react-router-dom';
import { Users, FileText, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import API from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const JobApplicants = () => {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobApplicants();
  }, [jobId]);

  const fetchJobApplicants = async () => {
    try {
      setLoading(true);
      const [jobRes, appRes] = await Promise.all([
        API.get(`/jobs/${jobId}`),
        API.get(`/applications/job/${jobId}`)
      ]);

      if (jobRes.success) setJob(jobRes.job);
      if (appRes.success) setApplicants(appRes.applicants || []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (appId, newStatus) => {
    try {
      await API.put(`/applications/${appId}/status`, { status: newStatus });
      fetchJobApplicants();
    } catch (err) {
      console.warn(err.message);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin text-cyan-400" /> Loading Applicants...</div>;
  }

  return (
    <div className="space-y-6">
      <Link to="/employer/jobs" className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:underline font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to job postings
      </Link>

      <div className="glass-card p-6 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white font-heading">Applicants for: {job?.title}</h1>
          <p className="text-xs text-slate-400">{job?.location} • {applicants.length} Total Applicants</p>
        </div>
        <StatusBadge status={job?.status} />
      </div>

      <div className="space-y-3">
        {applicants.length === 0 ? (
          <div className="glass-card p-8 rounded-2xl text-center text-slate-400 text-xs">
            No candidate applications received for this job posting yet.
          </div>
        ) : (
          applicants.map((app) => (
            <div key={app.id} className="glass-card p-5 rounded-2xl border border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{app.candidate?.name}</h3>
                    {app.candidate?.is_premium ? <StatusBadge status="PREMIUM" /> : null}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{app.candidate?.current_location || 'Location Not Specified'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={app.status} />
                  <select
                    value={app.status}
                    onChange={(e) => handleUpdateStatus(app.id, e.target.value)}
                    className="p-1.5 rounded-lg glass-input text-xs bg-slate-900"
                  >
                    <option value="applied">Applied</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="rejected">Rejected</option>
                    <option value="hired">Hired</option>
                  </select>
                </div>
              </div>

              {/* Skills & Resume */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5 text-xs">
                <div className="flex flex-wrap gap-1.5">
                  {app.candidate?.skills?.map((sk, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-800 text-cyan-300 text-[11px]">
                      {sk}
                    </span>
                  ))}
                </div>
                {app.candidate?.primary_resume && (
                  <a
                    href={app.candidate.primary_resume}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-cyan-400 hover:underline font-semibold"
                  >
                    <FileText className="w-3.5 h-3.5" /> View Resume PDF
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default JobApplicants;
