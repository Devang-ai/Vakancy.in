import React, { useState, useEffect } from 'react';
import { BarChart3, Users, Briefcase, HelpCircle, Activity } from 'lucide-react';
import API from '../../services/api';

const AdminReports = () => {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await API.get('/admin/reports');
      if (res.success) setReports(res.reports);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white font-heading">Basic Operational Reports & Telemetry</h1>
        <p className="text-xs text-slate-400">High-level operational metrics: user registrations, job posting volume by status, applications, and enquiry resolution rates</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Registrations</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-white">{reports?.users_total || 0}</div>
          <div className="text-[11px] text-slate-400">Active accounts across all roles</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Open Jobs Volume</span>
            <Briefcase className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white">{reports?.jobs_breakdown?.open || 0}</div>
          <div className="text-[11px] text-slate-400">Published for public discovery</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Applications</span>
            <Activity className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-black text-white">{reports?.applications_total || 0}</div>
          <div className="text-[11px] text-slate-400">Candidate job submissions</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Resolved Enquiries</span>
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-white">
            {reports?.enquiries_resolution?.resolved || 0} / {reports?.enquiries_resolution?.total || 0}
          </div>
          <div className="text-[11px] text-slate-400">Internal desk resolution rate</div>
        </div>
      </div>

      {/* Detailed Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-rose-400" /> Account Breakdown by Category
          </h3>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-white/5 text-xs">
              <span className="text-slate-300 font-medium">Job Seekers / Candidates</span>
              <span className="font-bold text-cyan-400 text-sm">{reports?.users_breakdown?.candidates || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-white/5 text-xs">
              <span className="text-slate-300 font-medium">Registered Employers</span>
              <span className="font-bold text-indigo-400 text-sm">{reports?.users_breakdown?.employers || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-white/5 text-xs">
              <span className="text-slate-300 font-medium">Internal Recruiters & HR Executives</span>
              <span className="font-bold text-amber-400 text-sm">{reports?.users_breakdown?.recruiters || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-white/5 text-xs">
              <span className="text-slate-300 font-medium">System Administrators</span>
              <span className="font-bold text-rose-400 text-sm">{reports?.users_breakdown?.admins || 0}</span>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/70 border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-emerald-400" /> Job Postings Status Distribution
          </h3>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-white/5 text-xs">
              <span className="text-slate-300 font-medium">Open & Publicly Discoverable</span>
              <span className="font-bold text-emerald-400 text-sm">{reports?.jobs_breakdown?.open || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-white/5 text-xs">
              <span className="text-slate-300 font-medium">Draft / Pending Moderation</span>
              <span className="font-bold text-amber-400 text-sm">{reports?.jobs_breakdown?.draft || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-white/5 text-xs">
              <span className="text-slate-300 font-medium">Closed / Archived</span>
              <span className="font-bold text-rose-400 text-sm">{reports?.jobs_breakdown?.closed || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
