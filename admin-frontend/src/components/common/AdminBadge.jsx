import React from 'react';

const STATUS_PRESETS = {
  // Application Lifecycle Statuses
  applied: { label: 'Applied', bg: 'bg-amber-50 text-amber-800 border-amber-200/80' },
  under_review: { label: 'Under Review', bg: 'bg-blue-50 text-blue-800 border-blue-200/80' },
  shortlisted: { label: 'Shortlisted', bg: 'bg-indigo-50 text-indigo-800 border-indigo-200/80' },
  interview: { label: 'Interview', bg: 'bg-purple-50 text-purple-800 border-purple-200/80' },
  selected: { label: 'Selected / Hired', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200/80' },
  rejected: { label: 'Rejected', bg: 'bg-rose-50 text-rose-800 border-rose-200/80' },

  // General Statuses
  pending: { label: 'Pending', bg: 'bg-amber-50 text-amber-800 border-amber-200/80' },
  in_progress: { label: 'In Progress', bg: 'bg-blue-50 text-blue-800 border-blue-200/80' },
  active: { label: 'Active', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200/80' },
  approved: { label: 'Approved', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200/80' },
  resolved: { label: 'Resolved', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200/80' },
  completed: { label: 'Completed', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200/80' },
  deactivated: { label: 'Deactivated', bg: 'bg-slate-100 text-slate-600 border-slate-200' },
  closed: { label: 'Closed', bg: 'bg-slate-100 text-slate-600 border-slate-200' },

  // Internal Team Roles
  main_admin: { label: 'Main Admin', bg: 'bg-rose-50 text-rose-800 border-rose-200' },
  hr_manager: { label: 'HR Manager', bg: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  recruiter: { label: 'Recruiter', bg: 'bg-blue-50 text-blue-800 border-blue-200' },
  hr_executive: { label: 'HR Executive', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  viewer: { label: 'Read-Only Viewer', bg: 'bg-slate-100 text-slate-700 border-slate-200' }
};

export const AdminBadge = ({ status, customLabel, className = '' }) => {
  const normalized = String(status || '').toLowerCase().replace(/\s+/g, '_');
  const preset = STATUS_PRESETS[normalized] || {
    label: customLabel || status || 'Unknown',
    bg: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border transition-colors ${preset.bg} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
      <span>{customLabel || preset.label}</span>
    </span>
  );
};

export default AdminBadge;

