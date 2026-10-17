import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Building, MapPin, CheckCircle2, ArrowLeft, Send, Loader2 } from 'lucide-react';
import API from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchJobDetails();
  }, [id]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/jobs/${id}`);
      if (res.success) setJob(res.job);
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    setMsg({ type: '', text: '' });
    try {
      const res = await API.post('/applications/apply', { job_id: id });
      if (res.success) {
        setMsg({ type: 'success', text: 'Job application submitted successfully!' });
        fetchJobDetails();
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to submit application.' });
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin text-cyan-400" /> Loading Job Details...</div>;
  }

  if (!job) {
    return <div className="py-20 text-center text-slate-400 text-sm">Job position not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Link to="/candidate/jobs" className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:underline font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to job list
      </Link>

      {msg.text && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-2 ${msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'}`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{msg.text}</span>
        </div>
      )}

      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-white font-heading">{job.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mt-2">
              <span className="flex items-center gap-1 text-cyan-300 font-semibold">
                <Building className="w-4 h-4 text-cyan-400" /> {job.company_name}
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <MapPin className="w-4 h-4 text-slate-400" /> {job.location}
              </span>
              <StatusBadge status={job.status} />
            </div>
          </div>

          <div>
            {job.has_applied ? (
              <span className="px-5 py-2.5 rounded-xl bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Application Submitted
              </span>
            ) : (
              <button
                onClick={handleApply}
                disabled={applying}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Apply Now
              </button>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Job Description & Requirements</h3>
          <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-900/60 p-5 rounded-2xl border border-white/5 font-sans">
            {job.description}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetails;
