import React from 'react';

const StatusBadge = ({ status, type = 'general' }) => {
  if (!status) return null;

  const s = String(status).toLowerCase();

  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';

  if (['active', 'open', 'completed', 'hired', 'selected', 'primary'].includes(s)) {
    colorClasses = 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30';
  } else if (['applied', 'pending', 'reviewing', 'screening', 'starter'].includes(s)) {
    colorClasses = 'bg-cyan-950/80 text-cyan-400 border-cyan-500/30';
  } else if (['shortlisted', 'interview', 'growth'].includes(s)) {
    colorClasses = 'bg-indigo-950/80 text-indigo-400 border-indigo-500/30';
  } else if (['rejected', 'expired', 'failed', 'closed', 'cancelled'].includes(s)) {
    colorClasses = 'bg-rose-950/80 text-rose-400 border-rose-500/30';
  } else if (['executive', 'premium', 'unlimited'].includes(s)) {
    colorClasses = 'bg-amber-950/80 text-amber-400 border-amber-500/30';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wider ${colorClasses}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse"></span>
      {status}
    </span>
  );
};

export default StatusBadge;
