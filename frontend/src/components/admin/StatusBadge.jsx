import React from 'react';

const STATUS_CONFIGS = {
  // Candidate / Job / App stages
  open: { label: 'Open', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  active: { label: 'Active', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  draft: { label: 'Draft', style: 'bg-slate-100 text-slate-600 border-slate-200' },
  closed: { label: 'Closed', style: 'bg-rose-50 text-rose-700 border-rose-200' },
  applied: { label: 'Applied', style: 'bg-blue-50 text-blue-700 border-blue-200' },
  reviewing: { label: 'Under Review', style: 'bg-amber-50 text-amber-700 border-amber-200' },
  under_review: { label: 'Under Review', style: 'bg-amber-50 text-amber-700 border-amber-200' },
  shortlisted: { label: 'Shortlisted', style: 'bg-purple-50 text-purple-700 border-purple-200' },
  interview: { label: 'Interview', style: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  hired: { label: 'Selected', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  selected: { label: 'Selected', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rejected', style: 'bg-rose-50 text-rose-700 border-rose-200' },

  // Candidate sharing stages
  proposed: { label: 'Proposed', style: 'bg-amber-50 text-amber-700 border-amber-200' },
  tl_reviewed: { label: 'TL Reviewed', style: 'bg-blue-50 text-blue-700 border-blue-200' },
  approved: { label: 'Approved', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  revoked: { label: 'Revoked', style: 'bg-rose-50 text-rose-700 border-rose-200' },

  // Enquiry & Lead statuses
  new: { label: 'New', style: 'bg-blue-50 text-blue-700 border-blue-200' },
  assigned: { label: 'Assigned', style: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  in_progress: { label: 'In Progress', style: 'bg-amber-50 text-amber-700 border-amber-200' },
  resolved: { label: 'Resolved', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending: { label: 'Pending', style: 'bg-amber-50 text-amber-700 border-amber-200' },
  contacted: { label: 'Contacted', style: 'bg-blue-50 text-blue-700 border-blue-200' },
  qualified: { label: 'Qualified', style: 'bg-purple-50 text-purple-700 border-purple-200' },
  proposal_sent: { label: 'Proposal Sent', style: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  handed_over: { label: 'Handed Over', style: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  converted: { label: 'Converted', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  lost: { label: 'Lost', style: 'bg-slate-100 text-slate-600 border-slate-200' }
};

export const StatusBadge = ({ status, className = '' }) => {
  const normalized = (status || '').toLowerCase().replace(/[\s-]/g, '_');
  const conf = STATUS_CONFIGS[normalized] || {
    label: status ? String(status).toUpperCase() : 'UNKNOWN',
    style: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${conf.style} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
      {conf.label}
    </span>
  );
};

export default StatusBadge;
