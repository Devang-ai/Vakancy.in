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
  ShieldCheck
} from 'lucide-react';
import API from '../services/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, actRes] = await Promise.all([
        API.get('/admin/stats').catch(() => ({ success: false })),
        API.get('/admin/activity?limit=6').catch(() => ({ success: false })),
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (actRes.success) setActivities(actRes.activities || []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Candidates', value: stats?.totalCandidates || 0, icon: Users, link: '/team' },
    { title: 'Total Employers', value: stats?.totalEmployers || 0, icon: Building2, link: '/employers' },
    { title: 'Total Team Members', value: stats?.totalTeamMembers || 0, icon: UserCheck, link: '/team' },
    { title: 'Open Job Postings', value: stats?.openJobs || 0, icon: Briefcase, link: '/jobs' },
    { title: 'Total Applications', value: stats?.totalApplications || 0, icon: FileCheck, link: '/jobs' },
    { title: 'Pending Enquiries', value: stats?.pendingEnquiries || 0, icon: HelpCircle, link: '/enquiries' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading tracking-tight">
            Operational Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time platform metrics, recruitment activity history, and enquiry fulfillment
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/activity"
            className="px-4 py-2.5 rounded-lg bg-white border border-slate-200 hover:border-blue-600 text-xs font-bold text-slate-800 flex items-center gap-2 transition-all shadow-xs"
          >
            <Activity className="w-4 h-4 text-blue-700" />
            <span>View Full Activity Log</span>
          </Link>
        </div>
      </div>

      {/* Factual Operational Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link
              key={idx}
              to={card.link}
              className="ep-card p-5 hover:border-blue-300 transition-all hover:-translate-y-0.5 group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.title}</span>
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 font-heading">{loading ? '...' : card.value}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Operational Split: Recent Recruitment Activity & Governance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Recruitment Activity */}
        <div className="ep-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2.5">
                <Activity className="w-5 h-5 text-blue-700" />
                <h2 className="text-base font-bold text-slate-900 font-heading">Recent Recruitment Activity</h2>
              </div>
              <Link to="/activity" className="text-xs font-semibold text-blue-700 hover:text-blue-800">
                View All →
              </Link>
            </div>

            {activities.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No recruitment activities recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {activities.slice(0, 5).map((act) => (
                  <div key={act.id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-blue-800 block">{act.performer_name || act.performer_email || 'Staff Member'}</span>
                      <span className="text-xs text-slate-900 font-medium block mt-0.5">{act.action_type.replace(/_/g, ' ')}</span>
                      <p className="text-[11px] text-slate-500 mt-1">{act.description}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">{new Date(act.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Operations Guide */}
        <div className="ep-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200 mb-4">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-bold text-slate-900 font-heading">Staff & Recruitment Governance</h2>
            </div>
            <div className="space-y-4 text-xs text-slate-700">
              <div className="p-4 rounded-lg bg-slate-50/70 border border-slate-200/80">
                <span className="font-bold text-blue-800 block mb-1">Main Admin Governance</span>
                <p className="text-slate-600">Only the Main Admin account has exclusive rights to create, assign roles, and deactivate internal team member accounts.</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50/70 border border-slate-200/80">
                <span className="font-bold text-amber-800 block mb-1">Candidate Recruitment Lifecycle</span>
                <p className="text-slate-600">Employers submit job postings and view privacy-safe applications. Internal staff transition candidate statuses through review, shortlisted, interview, selected, or rejected.</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50/70 border border-slate-200/80">
                <span className="font-bold text-emerald-800 block mb-1">Employer Privacy Protection</span>
                <p className="text-slate-600">Candidate email, phone, and resume remain confidential and are never directly exposed to employers. Enquiries are handled internally.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

