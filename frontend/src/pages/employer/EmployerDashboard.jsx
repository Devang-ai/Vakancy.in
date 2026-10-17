import React, { useState, useEffect } from 'react';
import {  Link , useOutletContext } from 'react-router-dom';
import { Briefcase, Users, CreditCard, Sparkles, Plus, Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import StatsCard from '../../components/StatsCard';
import StatusBadge from '../../components/StatusBadge';
import API from '../../services/api';

const EmployerDashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [empProfile, setEmpProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployerData();
  }, []);

  const fetchEmployerData = async () => {
    try {
      setLoading(true);
      const [statRes, profRes, jobRes] = await Promise.all([
        API.get('/employers/dashboard-stats'),
        API.get('/employers/profile'),
        API.get('/jobs')
      ]);

      if (statRes.success) setStats(statRes.stats);
      if (profRes.success) setEmpProfile(profRes.employer);
      if (jobRes.success) setJobs(jobRes.jobs || []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="glass-card p-6 rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-slate-950/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white font-heading">
            {empProfile?.company_name || 'Company Workspace'} Dashboard
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Post jobs, review applicant submissions, unlock candidates, and generate AI Job Descriptions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/employer/jobs"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Post New Job
          </Link>
          <Link
            to="/employer/ai-jd"
            className="px-4 py-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" /> AI JD Generator
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Posted Jobs"
          value={stats?.total_jobs || 0}
          icon={Briefcase}
          color="indigo"
        />
        <StatsCard
          title="Active Open Jobs"
          value={stats?.open_jobs || 0}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatsCard
          title="Total Applicants"
          value={stats?.total_applicants || 0}
          icon={Users}
          color="cyan"
        />
        <StatsCard
          title="Candidate Unlocks Left"
          value={empProfile?.active_subscription?.unlocks_remaining || 0}
          icon={Lock}
          color={empProfile?.active_subscription ? 'amber' : 'rose'}
          subtitle={empProfile?.active_subscription ? empProfile.active_subscription.plan_name : 'No Active Plan'}
        />
      </div>

      {/* Posted Jobs Section */}
      <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-sm font-bold text-white">Recent Job Postings</h3>
          <Link to="/employer/jobs" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
            Manage All Jobs <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-2.5">
          {jobs.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No job postings found. Post a free job today!</p>
          ) : (
            jobs.slice(0, 4).map((j) => (
              <div key={j.id} className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">{j.title}</h4>
                  <p className="text-[11px] text-slate-400">{j.location} • {j.applicant_count || 0} applicants</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={j.status} />
                  <Link
                    to={`/employer/jobs/${j.id}/applicants`}
                    className="px-3 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold"
                  >
                    View Applicants
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployerDashboard;
