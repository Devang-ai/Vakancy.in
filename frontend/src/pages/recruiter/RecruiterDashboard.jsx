import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Kanban, Users, Building2, Briefcase, Plus, ArrowRight, Clock } from 'lucide-react';
import StatsCard from '../../components/StatsCard';
import API from '../../services/api';

const RecruiterDashboard = () => {
  const [board, setBoard] = useState([]);
  const [clients, setClients] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecruiterData();
  }, []);

  const fetchRecruiterData = async () => {
    try {
      setLoading(true);
      const [boardRes, clientRes, jobRes] = await Promise.all([
        API.get('/ats/pipeline/board'),
        API.get('/clients'),
        API.get('/jobs')
      ]);

      if (boardRes.success) setBoard(boardRes.board || []);
      if (clientRes.success) setClients(clientRes.clients || []);
      if (jobRes.success) setJobs(jobRes.jobs || []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalInPipeline = board.reduce((acc, stg) => acc + (stg.candidates?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="glass-card p-6 rounded-3xl border border-blue-500/20 bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-slate-950/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white font-heading">Internal Recruitment & ATS Workspace</h1>
          <p className="text-xs text-slate-300 mt-1">
            Manage executive candidates, client assignments, ATS pipeline stage movements, and stage history audit logs.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/recruiter/ats-pipeline"
            className="px-4 py-2.5 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white font-bold text-xs shadow-md shadow-blue-900/10 flex items-center gap-1.5 transition-colors"
          >
            <Kanban className="w-4 h-4" /> Open ATS Kanban Board
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Candidates in ATS Pipeline"
          value={totalInPipeline}
          icon={Kanban}
          color="blue"
          subtitle="Across all stages"
        />
        <StatsCard
          title="Active Clients"
          value={clients.length}
          icon={Building2}
          color="indigo"
          subtitle="Executive search clients"
        />
        <StatsCard
          title="Client Open Positions"
          value={jobs.length}
          icon={Briefcase}
          color="cyan"
        />
        <StatsCard
          title="Configured ATS Stages"
          value={board.length}
          icon={Clock}
          color="emerald"
        />
      </div>

      {/* Grid: Stages Breakdown & Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stages Breakdown */}
        <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-white">ATS Stage Candidate Counts</h3>
            <Link to="/recruiter/ats-pipeline" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
              View Board <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {board.map((stg) => (
              <div key={stg.stage.id} className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                <span className="text-xs font-semibold text-white">{stg.stage.name}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold">
                  {stg.candidates?.length || 0} candidates
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Executive Search Clients Quick Directory */}
        <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-white">Executive Search Clients</h3>
            <Link to="/recruiter/clients" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
              Manage Clients <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {clients.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No clients added yet.</p>
            ) : (
              clients.map((cli) => (
                <div key={cli.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">{cli.name}</h4>
                    <p className="text-[11px] text-slate-400">{cli.industry || 'Industry N/A'}</p>
                  </div>
                  <span className="text-[11px] text-indigo-300 font-mono">{cli.contact_info}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecruiterDashboard;
