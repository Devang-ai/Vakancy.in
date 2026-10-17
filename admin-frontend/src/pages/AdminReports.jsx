import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Users, Building2, Briefcase, FileCheck } from 'lucide-react';
import API from '../services/api';

const AdminReports = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    API.get('/admin/stats')
      .then((res) => {
        if (res.success) setStats(res.stats);
      })
      .catch((err) => console.warn(err.message));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-heading">Operational Reports & Platform Metrics</h1>
          <p className="text-xs text-slate-500 mt-1">Factual platform data summaries across candidates, employers, job listings, and application volume</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="ep-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Candidates</span>
            <Users className="w-5 h-5 text-blue-700" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-heading">{stats?.totalCandidates || 0}</div>
          <span className="text-[11px] text-slate-500 block">Registered Jobseeker Accounts</span>
        </div>

        <div className="ep-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Employers</span>
            <Building2 className="w-5 h-5 text-amber-700" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-heading">{stats?.totalEmployers || 0}</div>
          <span className="text-[11px] text-slate-500 block">Verified Company Profiles</span>
        </div>

        <div className="ep-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Open Jobs</span>
            <Briefcase className="w-5 h-5 text-emerald-700" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-heading">{stats?.openJobs || 0}</div>
          <span className="text-[11px] text-slate-500 block">Active Listings on Portal</span>
        </div>

        <div className="ep-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Applications</span>
            <FileCheck className="w-5 h-5 text-indigo-700" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-heading">{stats?.totalApplications || 0}</div>
          <span className="text-[11px] text-slate-500 block">Privacy-Safe Candidate Submissions</span>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;

