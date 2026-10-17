import React, { useState, useEffect } from 'react';
import { Activity, Filter, Search, Calendar, User, FileText, CheckCircle2 } from 'lucide-react';
import API from '../services/api';

const AdminRecruitmentActivity = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    fetchActivities();
  }, [actionFilter]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const url = actionFilter ? `/admin/activity?action_type=${actionFilter}` : '/admin/activity';
      const res = await API.get(url);
      if (res.success) setActivities(res.activities || []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  const actionTypes = [
    { value: '', label: 'All Action Types' },
    { value: 'application_reviewed', label: 'Application Reviewed' },
    { value: 'application_status_changed', label: 'Application Status Changed' },
    { value: 'candidate_shortlisted', label: 'Candidate Shortlisted' },
    { value: 'candidate_moved_to_interview', label: 'Moved to Interview' },
    { value: 'candidate_selected', label: 'Candidate Selected' },
    { value: 'candidate_rejected', label: 'Candidate Rejected' },
    { value: 'employer_enquiry_opened', label: 'Enquiry Opened' },
    { value: 'employer_enquiry_attended', label: 'Enquiry Attended' },
    { value: 'employer_enquiry_status_changed', label: 'Enquiry Status Changed' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-heading">Recruitment Activity History</h1>
          <p className="text-xs text-slate-500 mt-1">
            Factual audit trail of internal team member recruitment operations, candidate status movements, and enquiry handling
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs shadow-xs">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold outline-none text-xs cursor-pointer"
            >
              {actionTypes.map((a) => (
                <option key={a.value} value={a.value} className="bg-white text-slate-900">
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="ep-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">Team Member</th>
                <th className="p-4">Action</th>
                <th className="p-4">Related Reference</th>
                <th className="p-4">Description</th>
                <th className="p-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No recruitment activity records found for the selected filter.
                  </td>
                </tr>
              ) : (
                activities.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-800 border border-blue-200 flex items-center justify-center font-bold text-xs">
                          {(act.performer_name || act.performer_email || 'S')[0].toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{act.performer_name || act.performer_email || 'Staff Member'}</span>
                          <span className="text-[10px] text-slate-500 uppercase">{act.performer_role || 'Staff'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        {act.action_type.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="space-y-0.5">
                        {act.related_job_id && (
                          <span className="text-[11px] text-slate-700 block">Job #{act.related_job_id}</span>
                        )}
                        {act.related_application_id && (
                          <span className="text-[11px] text-blue-700 font-semibold block">App #{act.related_application_id}</span>
                        )}
                        {act.related_enquiry_id && (
                          <span className="text-[11px] text-emerald-700 font-semibold block">Enquiry #{act.related_enquiry_id}</span>
                        )}
                        {!act.related_job_id && !act.related_application_id && !act.related_enquiry_id && (
                          <span className="text-[11px] text-slate-500">General Operational Action</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-slate-800 font-medium">{act.description}</td>
                    <td className="p-4 text-slate-500 whitespace-nowrap">
                      {new Date(act.created_at).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminRecruitmentActivity;

