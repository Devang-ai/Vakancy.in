import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

export const StatusIndicator = ({
  status = 'active',
  label,
  pulse = false,
  className = '',
}) => {
  const statusMap = {
    active: { dot: 'bg-emerald-400', text: 'text-emerald-300' },
    open: { dot: 'bg-emerald-400', text: 'text-emerald-300' },
    success: { dot: 'bg-emerald-400', text: 'text-emerald-300' },
    pending: { dot: 'bg-amber-400', text: 'text-amber-300' },
    screening: { dot: 'bg-amber-400', text: 'text-amber-300' },
    reviewing: { dot: 'bg-brand-400', text: 'text-brand-300' },
    interview: { dot: 'bg-brand-400', text: 'text-brand-300' },
    closed: { dot: 'bg-slate-500', text: 'text-slate-400' },
    rejected: { dot: 'bg-rose-400', text: 'text-rose-300' },
    inactive: { dot: 'bg-slate-500', text: 'text-slate-400' },
  };

  const current = statusMap[status?.toLowerCase()] || statusMap.active;

  return (
    <span className={cn('inline-flex items-center gap-2 text-xs font-medium', current.text, className)}>
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', current.dot)}
          />
        )}
        <span className={cn('relative inline-flex rounded-full h-2 w-2', current.dot)} />
      </span>
      <span>{label || status}</span>
    </span>
  );
};

export default StatusIndicator;
