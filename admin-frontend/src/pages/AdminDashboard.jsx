import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Building2,
  Briefcase,
  FileCheck,
  HelpCircle,
  Activity,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  TrendingUp,
  Mail,
  Filter,
  ArrowUpRight,
  RefreshCw,
  ChevronRight,
  BarChart3,
  CheckCircle,
  XCircle,
  FileText
} from 'lucide-react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Global filters
  const [period, setPeriod] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const userRole = (user?.role || '').toLowerCase();
  const roleDisplayNames = {
    director: 'Director • Enterprise Governance',
    main_admin: 'Main Admin • Full Authority',
    admin: 'Administrator',
    bd_lead: 'BD Lead • Growth & Client Outreach',
    tl_coordinator: 'TL Coordinator • Team & Client Operations',
    recruiter: 'Recruiter • Talent Operations'
  };

  useEffect(() => {
    loadDashboardData();
  }, [period]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      let queryUrl = `/admin/stats?period=${period}`;
      if (period === 'custom' && startDate && endDate) {
        queryUrl += `&startDate=${startDate}&endDate=${endDate}`;
      }
      const res = await API.get(queryUrl);
      if (res.success) {
        setData(res);
      } else {
        setError(res.message || 'Failed to load dashboard metrics.');
      }
    } catch (err) {
      console.warn('Dashboard fetch error:', err.message);
      setError(err.message || 'Network error fetching dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomDateApply = (e) => {
    e.preventDefault();
    if (startDate && endDate) {
      loadDashboardData();
    }
  };

  const metrics = data?.metrics || {
    total_candidates: 0,
    total_employers: 0,
    total_jobs: 0,
    open_jobs: 0,
    draft_jobs: 0,
    total_applications: 0
  };

  const pipeline = data?.pipeline || {
    applied: 0,
    under_review: 0,
    shortlisted: 0,
    interview: 0,
    selected: 0,
    rejected: 0,
    total: 0
  };

  const pendingWork = data?.pending_work?.items || [];
  const upcomingInterviews = data?.upcoming_interviews || [];
  const myTasks = data?.my_pending_tasks || [];
  const recruiterWorkload = data?.recruiter_workload || [];
  const jobApplications = data?.job_applications || [];
  const monthlyTrend = data?.monthly_trend || [];
  const leadConversion = data?.lead_conversion;
  const emailHealth = data?.email_health;
  const overdueFollowUps = data?.overdue_follow_ups || [];
  const recentActivities = data?.recent_activity || [];

  return (
    <div className="space-y-7 pb-12">
      {/* 1. Header & Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading tracking-tight">
              Recruitment Operations Hub
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
              {roleDisplayNames[userRole] || userRole.toUpperCase()}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Live platform metrics, authorized pipeline workflows, and operational pending queues
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:border-blue-600 text-xs font-bold text-slate-700 hover:text-blue-700 flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
            title="Refresh current metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-700' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/activity"
            className="px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
          </Link>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadDashboardData}
            className="px-2.5 py-1 bg-white border border-rose-300 rounded font-semibold text-rose-700 hover:bg-rose-100"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Global Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-3 sm:p-4 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Filter className="w-4 h-4 text-blue-700 shrink-0" />
          <span className="font-bold text-slate-900">Activity Period:</span>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Filters application submissions and chronological activity. Active queues remain live.
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap w-full lg:w-auto">
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: '7d', label: 'Last 7 Days' },
            { id: '30d', label: 'Last 30 Days' },
            { id: 'this_month', label: 'This Month' },
            { id: 'custom', label: 'Custom' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPeriod(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                period === item.id
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <form onSubmit={handleCustomDateApply} className="flex items-center gap-2 pt-2 lg:pt-0 w-full lg:w-auto border-t lg:border-t-0 border-slate-100">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700 text-slate-700"
              required
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700 text-slate-700"
              required
            />
            <button
              type="submit"
              className="px-3 py-1 bg-blue-700 text-white rounded-lg text-xs font-semibold hover:bg-blue-800"
            >
              Apply
            </button>
          </form>
        )}
      </div>

      {/* 3. Overview Metrics Grid (6 Metrics) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Operational Overview Metrics
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">Click card to navigate to module view</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {[
            {
              title: 'Total Candidates',
              value: metrics.total_candidates,
              icon: Users,
              link: '/team',
              badge: userRole === 'director' ? 'Global' : 'Scoped'
            },
            {
              title: 'Total Employers',
              value: metrics.total_employers,
              icon: Building2,
              link: '/employers',
              badge: 'Partners'
            },
            {
              title: 'Total Jobs',
              value: metrics.total_jobs,
              icon: Briefcase,
              link: '/jobs',
              badge: 'Requisitions'
            },
            {
              title: 'Active Jobs',
              value: metrics.open_jobs,
              icon: Briefcase,
              link: '/jobs?status=open',
              badge: 'Open',
              color: 'text-emerald-700'
            },
            {
              title: 'Draft Jobs',
              value: metrics.draft_jobs,
              icon: FileText,
              link: '/jobs?status=draft',
              badge: 'Draft',
              color: 'text-amber-700'
            },
            {
              title: 'Total Applications',
              value: metrics.total_applications,
              icon: FileCheck,
              link: '/applications',
              badge: 'ATS Pipeline',
              color: 'text-blue-700'
            }
          ].map((card, idx) => {
            const Icon = card.icon;
            return (
              <Link
                key={idx}
                to={card.link}
                className="bg-white p-4 rounded-xl border border-slate-200/90 hover:border-blue-500 transition-all hover:shadow-xs group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-700 transition-colors">
                    {card.title}
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-slate-50 group-hover:bg-blue-50 text-slate-500 group-hover:text-blue-700 flex items-center justify-center transition-colors">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <span className={`text-2xl font-black font-heading ${card.color || 'text-slate-900'}`}>
                    {loading ? '...' : card.value}
                  </span>
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    {card.badge}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 4. Recruitment Pipeline Summary (6 Stages) */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 font-heading">Recruitment Pipeline Summary</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Candidate status distribution across verified recruitment ATS stages. Click stage to view queue.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/80 w-fit">
            Total Active Pool: <strong className="text-slate-900">{loading ? '...' : pipeline.total}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { key: 'applied', label: 'Applied', count: pipeline.applied, color: 'border-blue-200 bg-blue-50/50 text-blue-900', numColor: 'text-blue-700' },
            { key: 'under_review', label: 'Under Review', count: pipeline.under_review, color: 'border-amber-200 bg-amber-50/50 text-amber-900', numColor: 'text-amber-700' },
            { key: 'shortlisted', label: 'Shortlisted', count: pipeline.shortlisted, color: 'border-indigo-200 bg-indigo-50/50 text-indigo-900', numColor: 'text-indigo-700' },
            { key: 'interview', label: 'Interview', count: pipeline.interview, color: 'border-purple-200 bg-purple-50/50 text-purple-900', numColor: 'text-purple-700' },
            { key: 'selected', label: 'Selected / Hired', count: pipeline.selected, color: 'border-emerald-200 bg-emerald-50/50 text-emerald-900', numColor: 'text-emerald-700' },
            { key: 'rejected', label: 'Rejected', count: pipeline.rejected, color: 'border-slate-200 bg-slate-50 text-slate-700', numColor: 'text-slate-500' }
          ].map((st) => (
            <Link
              key={st.key}
              to={`/applications?status=${st.key}`}
              className={`p-3.5 rounded-lg border ${st.color} hover:border-blue-600 transition-all group flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span>{st.label}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-700 transition-colors" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className={`text-2xl font-black font-heading ${st.numColor}`}>
                  {loading ? '...' : st.count}
                </span>
                <span className="text-[10px] text-slate-500">
                  {pipeline.total > 0 ? `${Math.round((st.count / pipeline.total) * 100)}%` : '0%'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 5. Pending Approvals & Enquiries Work Queue */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-700" />
            <h2 className="text-sm font-bold text-slate-900 font-heading">
              Pending Approvals & Inbound Enquiries
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              {pendingWork.length} Pending
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Requires authorized team review</span>
        </div>

        {pendingWork.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto mb-1.5 opacity-80" />
            <p className="font-semibold text-slate-700">All pending review items are cleared</p>
            <p className="text-[11px] text-slate-400 mt-0.5">No candidate shares or partner approvals require immediate action.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingWork.map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-lg bg-slate-50/70 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                      item.type === 'CANDIDATE_SHARE_APPROVAL'
                        ? 'bg-purple-50 text-purple-800 border-purple-200'
                        : item.type === 'EMPLOYER_APPROVAL'
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}>
                      {item.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Active'}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 mt-1 line-clamp-1">{item.title || 'Review Required'}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{item.subtitle}</p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-amber-700">{item.status}</span>
                  <Link
                    to={item.link}
                    className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1"
                  >
                    <span>Inspect</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6 & 7. Split: Upcoming Interviews & My Pending Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Interviews */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-700" />
                <h2 className="text-sm font-bold text-slate-900 font-heading">Upcoming Interviews</h2>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-100">
                Next 7 Days
              </span>
            </div>

            {upcomingInterviews.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                <Calendar className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                <p className="font-semibold text-slate-700">No interviews scheduled</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Interviews scheduled in the next 7 days will automatically surface here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingInterviews.map((iv) => (
                  <div key={iv.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between gap-3">
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">{iv.candidate_name}</span>
                      <span className="text-[11px] text-slate-600 block mt-0.5">{iv.job_title} • {iv.company_name}</span>
                      <span className="text-[10px] text-blue-700 font-semibold block mt-1">
                        {iv.round_name} • Host: {iv.interviewer_name || 'Assigned Recruiter'}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-slate-800 block">
                        {new Date(iv.interview_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {new Date(iv.interview_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-right">
            <Link to="/applications?status=interview" className="text-xs font-bold text-blue-700 hover:text-blue-900">
              View All Interview Queue →
            </Link>
          </div>
        </div>

        {/* My Pending Tasks */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-900 font-heading">My Pending Tasks</h2>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                Assigned to You
              </span>
            </div>

            {myTasks.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5 opacity-80" />
                <p className="font-semibold text-slate-700">No pending personal tasks</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Assigned client follow-ups and candidate sharing requests will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {myTasks.map((t) => (
                  <div key={t.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between gap-3">
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">{t.title}</span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">{t.related_name}</span>
                      <span className="text-[10px] font-semibold text-amber-700 block mt-1">Status: {t.status}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 block mb-1">
                        {t.priority}
                      </span>
                      <Link to={t.link} className="text-[11px] font-bold text-blue-700 hover:text-blue-900">
                        Open →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-right">
            <Link to="/enquiries" className="text-xs font-bold text-blue-700 hover:text-blue-900">
              View Assigned Work →
            </Link>
          </div>
        </div>
      </div>

      {/* 8 & 9. Recruiter Workload & Job-Wise Application Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recruiter Workload Comparison */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-700" />
              <h2 className="text-sm font-bold text-slate-900 font-heading">Recruiter Workload Distribution</h2>
            </div>
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              Active Allocations
            </span>
          </div>

          {recruiterWorkload.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No active recruiter allocations within scope.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Recruiter</th>
                    <th className="py-2.5 px-3 text-center">Active Jobs</th>
                    <th className="py-2.5 px-3 text-center">Active Apps</th>
                    <th className="py-2.5 px-3 text-center">Tasks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recruiterWorkload.map((r) => (
                    <tr key={r.recruiter_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 block">{r.name}</span>
                        <span className="text-[10px] text-slate-400 block">{r.email}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-bold text-slate-900 px-2 py-0.5 rounded bg-slate-100">{r.active_jobs_count}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-bold text-blue-700 px-2 py-0.5 rounded bg-blue-50">{r.active_applications_count}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-bold text-amber-700 px-2 py-0.5 rounded bg-amber-50">{r.pending_tasks_count}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Job-Wise Application Distribution */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-700" />
              <h2 className="text-sm font-bold text-slate-900 font-heading">Job-Wise Application Volume</h2>
            </div>
            <Link to="/jobs" className="text-xs font-semibold text-blue-700 hover:text-blue-900">
              View Jobs →
            </Link>
          </div>

          {jobApplications.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No jobs available in current scope.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Position & Client</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Applications</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobApplications.map((j) => (
                    <tr key={j.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3">
                        <Link to="/applications" className="font-bold text-slate-900 hover:text-blue-700 block line-clamp-1">
                          {j.title}
                        </Link>
                        <span className="text-[10px] text-slate-400 block">{j.company_name || 'Vakancy Internal'}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          j.status === 'open' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {j.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="font-extrabold text-blue-700 px-2 py-0.5 rounded bg-blue-50">
                          {j.application_count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 10 & 11. Monthly Recruitment Trend & Lead Conversion Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend Analytics */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-700" />
              <h2 className="text-sm font-bold text-slate-900 font-heading">Monthly Recruitment Trend</h2>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold">
              <span className="flex items-center gap-1 text-blue-700">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span> Applications
              </span>
              <span className="flex items-center gap-1 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span> Selected
              </span>
            </div>
          </div>

          {monthlyTrend.length === 0 ? (
            <p className="text-xs text-slate-500 py-10 text-center">No historical application trends recorded.</p>
          ) : (
            <div className="space-y-4 pt-2">
              {monthlyTrend.map((m) => {
                const maxVol = Math.max(...monthlyTrend.map(t => t.application_volume), 1);
                const appPct = Math.round((m.application_volume / maxVol) * 100);
                const selPct = Math.round((m.selected_count / maxVol) * 100);

                return (
                  <div key={m.month} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{m.month}</span>
                      <span className="text-[11px] text-slate-500">
                        {m.application_volume} Applications • {m.selected_count} Hired
                      </span>
                    </div>
                    <div className="h-4 w-full bg-slate-100 rounded-md overflow-hidden flex">
                      <div
                        style={{ width: `${appPct}%` }}
                        className="bg-blue-600 h-full transition-all"
                        title={`Applications: ${m.application_volume}`}
                      ></div>
                      <div
                        style={{ width: `${selPct}%` }}
                        className="bg-emerald-600 h-full transition-all"
                        title={`Selected: ${m.selected_count}`}
                      ></div>
                    </div>
                  </div>
                );
              })}
              <p className="text-[10px] text-slate-400 mt-2">
                * Application volume based on applied_at timestamp. Selection outcomes reflect current candidate placement status.
              </p>
            </div>
          )}
        </div>

        {/* Lead Conversion Overview */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
                <h2 className="text-sm font-bold text-slate-900 font-heading">Lead Conversion Overview</h2>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800">
                Business Development
              </span>
            </div>

            {!leadConversion?.authorized ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                <AlertTriangle className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                <p className="font-semibold text-slate-700">Access Restricted</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{leadConversion?.message || 'Authorized BD accounts only.'}</p>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-center">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Total</span>
                    <span className="text-base font-black text-slate-900">{leadConversion.total_leads}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-center">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Qualified</span>
                    <span className="text-base font-black text-blue-700">{leadConversion.qualified_leads}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-center">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Converted</span>
                    <span className="text-base font-black text-emerald-700">{leadConversion.converted_leads}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-center">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Rate</span>
                    <span className="text-base font-black text-indigo-700">{leadConversion.conversion_rate}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 block">Lead Source Breakdown</span>
                  {(leadConversion.sources || []).map((s) => (
                    <div key={s.source} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-50">
                      <span className="text-slate-700 font-medium">{s.source}</span>
                      <span className="font-bold text-slate-900">{s.count} Leads</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-right">
            <Link to="/reports" className="text-xs font-bold text-blue-700 hover:text-blue-900">
              View Detailed Analytics →
            </Link>
          </div>
        </div>
      </div>

      {/* 12 & 13. Email Delivery Health & Overdue Follow-Ups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Provider Health */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-700" />
              <h2 className="text-sm font-bold text-slate-900 font-heading">Email Delivery Health</h2>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {emailHealth?.provider || 'Email Service'}
            </span>
          </div>

          {!emailHealth?.authorized ? (
            <p className="text-xs text-slate-500 py-6 text-center">Restricted to Management & Lead Administrators.</p>
          ) : (
            <div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200 text-center">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Dispatched</span>
                  <span className="text-xl font-black text-emerald-900">{emailHealth.total_sent}</span>
                </div>
                <div className="p-3 rounded-lg bg-rose-50/60 border border-rose-200 text-center">
                  <span className="text-[10px] font-bold text-rose-800 uppercase block">Failures</span>
                  <span className="text-xl font-black text-rose-900">{emailHealth.failed_count}</span>
                </div>
                <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200 text-center">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">Bounces</span>
                  <span className="text-xl font-black text-amber-900">{emailHealth.bounced_count}</span>
                </div>
              </div>

              {emailHealth.total_sent === 0 ? (
                <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-200 text-center">
                  No email activity recorded yet.
                </p>
              ) : emailHealth.recent_failures && emailHealth.recent_failures.length > 0 ? (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Recent Failures</span>
                  {emailHealth.recent_failures.map((f) => (
                    <div key={f.id} className="p-2 rounded bg-rose-50/50 border border-rose-200 text-[11px] text-rose-900 flex justify-between items-center">
                      <span>{f.recipient_email} • {f.subject}</span>
                      <span className="text-[10px] text-rose-600">{new Date(f.sent_at).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-emerald-700 bg-emerald-50/60 p-2 rounded border border-emerald-200 text-center">
                  ✓ {((Math.max(emailHealth.total_sent - emailHealth.failed_count, 0) / emailHealth.total_sent) * 100).toFixed(0)}% dispatch success rate. No delivery errors recorded.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Overdue Follow-Ups */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h2 className="text-sm font-bold text-slate-900 font-heading">Overdue Follow-Ups Queue</h2>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
              Needs Attention
            </span>
          </div>

          {overdueFollowUps.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-xs">
              <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto mb-1.5 opacity-80" />
              <p className="font-semibold text-slate-700">No overdue follow-ups</p>
              <p className="text-[11px] text-slate-400 mt-0.5">All assigned lead and enquiry dates are in the future.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {overdueFollowUps.map((o) => (
                <div key={`${o.entity_type || 'item'}-${o.id}`} className="p-2.5 rounded bg-rose-50/40 border border-rose-200/80 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 block">{o.title}</span>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded uppercase ${
                        o.entity_type === 'enquiry' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {o.entity_type || 'lead'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">{o.related_name} • Due: {o.due_date}</span>
                  </div>
                  <Link to={o.link} className="text-xs font-bold text-rose-700 hover:text-rose-900">
                    Resolve →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 15. Recent Recruitment Activity Feed */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-700" />
            <h2 className="text-sm font-bold text-slate-900 font-heading">Recent Platform Activity</h2>
          </div>
          <Link to="/activity" className="text-xs font-bold text-blue-700 hover:text-blue-900">
            View Complete Activity Log →
          </Link>
        </div>

        {recentActivities.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No platform activity recorded in the selected period.</p>
        ) : (
          <div className="space-y-2.5">
            {recentActivities.map((act) => (
              <div key={act.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-900">{act.actor_email}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 uppercase">
                      {act.action_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{act.description}</p>
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
                  {new Date(act.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
