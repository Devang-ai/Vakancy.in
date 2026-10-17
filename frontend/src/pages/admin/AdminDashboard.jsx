import React, { useState, useEffect } from 'react';
import {
  Users,
  Briefcase,
  Building2,
  HelpCircle,
  Clock,
  CheckCircle2,
  FileCheck,
  TrendingUp,
  Share2,
  Activity,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import StatCard from '../../components/admin/StatCard';
import StatusBadge from '../../components/admin/StatusBadge';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await API.get('/admin/stats');
      if (res.success) {
        setStats(res.stats);
        setRecentActivity(res.recent_activity || []);
      } else {
        setError(res.message || 'Unable to load dashboard data.');
      }
    } catch (err) {
      setError(err.message || 'Failed to connect to recruitment server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Operations Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time pipeline metrics, candidate submissions, requisitions, and recruitment activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Refresh Metrics</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Candidates"
          value={stats?.total_candidates || 0}
          icon={Users}
          color="blue"
          subtitle="Registered talent profiles"
        />
        <StatCard
          title="Employers & Clients"
          value={stats?.total_employers || 0}
          icon={Building2}
          color="slate"
          subtitle={`${stats?.pending_employers || 0} pending review`}
        />
        <StatCard
          title="Job Requisitions"
          value={stats?.total_jobs || 0}
          icon={Briefcase}
          color="purple"
          subtitle={`${stats?.open_jobs || 0} active • ${stats?.draft_jobs || 0} draft`}
        />
        <StatCard
          title="Total Applications"
          value={stats?.total_applications || 0}
          icon={FileCheck}
          color="emerald"
          subtitle={`${stats?.pending_applications || 0} in review`}
        />
      </div>

      {/* Recruitment Pipeline Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
          ATS Recruitment Funnel Stages
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
            <p className="text-[11px] font-medium text-slate-500">Applied / New</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{stats?.pending_applications || 0}</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100 text-center">
            <p className="text-[11px] font-medium text-blue-700">Shortlisted</p>
            <p className="text-xl font-bold text-blue-900 mt-1">{stats?.shortlisted_candidates || 0}</p>
          </div>
          <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-100 text-center">
            <p className="text-[11px] font-medium text-indigo-700">Interviews</p>
            <p className="text-xl font-bold text-indigo-900 mt-1">{stats?.interview_candidates || 0}</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100 text-center">
            <p className="text-[11px] font-medium text-emerald-700">Selected</p>
            <p className="text-xl font-bold text-emerald-900 mt-1">{stats?.selected_candidates || 0}</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-100 text-center">
            <p className="text-[11px] font-medium text-amber-700">Candidate Shares</p>
            <p className="text-xl font-bold text-amber-900 mt-1">{stats?.total_shares || 0}</p>
          </div>
          <div className="p-3 rounded-lg bg-cyan-50/60 border border-cyan-100 text-center">
            <p className="text-[11px] font-medium text-cyan-700">Enquiries / Leads</p>
            <p className="text-xl font-bold text-cyan-900 mt-1">{(stats?.total_enquiries || 0) + (stats?.total_leads || 0)}</p>
          </div>
        </div>
      </div>

      {/* Two Column Section: Quick Actions & Live Audit History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Operational Shortcuts */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Quick Actions
          </h2>
          <div className="space-y-2">
            <Link
              to="/admin/candidates"
              className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-700">Browse Candidates</p>
                  <p className="text-[11px] text-slate-400">Search profiles & check duplicates</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              to="/admin/jobs"
              className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800 group-hover:text-purple-700">Manage Job Requisitions</p>
                  <p className="text-[11px] text-slate-400">Post & assign client requirements</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-700 group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              to="/admin/sharing"
              className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800 group-hover:text-amber-700">Candidate Sharing Queue</p>
                  <p className="text-[11px] text-slate-400">Consent & Director approvals</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              to="/admin/enquiries"
              className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800 group-hover:text-emerald-700">Recruitment Enquiries</p>
                  <p className="text-[11px] text-slate-400">Contact Us & Executive Search</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
        </div>

        {/* Live Recruitment Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Recent Recruitment Activity
              </h2>
              <Link to="/admin/activity" className="text-xs font-semibold text-blue-700 hover:text-blue-800">
                View All Activity →
              </Link>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading recent actions...</div>
            ) : recentActivity.length === 0 ? (
              <div className="py-12 text-center">
                <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-600">No recruitment activity logged yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Actions performed across candidates and jobs will record an immutable audit trail here.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentActivity.map((act) => (
                  <div key={act.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{act.description}</p>
                      <p className="text-[11px] text-slate-400">
                        By <span className="font-semibold text-slate-600">{act.actor_email || 'Staff Member'}</span> • Entity: {act.entity_type || 'Platform'}
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
