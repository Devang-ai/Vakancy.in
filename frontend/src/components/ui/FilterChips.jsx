import React from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

export const FilterChips = ({
  filters = [],
  onRemove,
  onClearAll,
  className = '',
}) => {
  if (!filters || filters.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2 text-xs', className)}>
      <span className="text-slate-500 font-semibold text-xs">Active filters:</span>
      {filters.map((f) => (
        <span
          key={f.id || f.label}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#eff4ff] border border-blue-200/80 text-slate-800 text-xs font-medium"
        >
          <span>{f.label}</span>
          <button
            type="button"
            onClick={() => onRemove(f)}
            className="text-slate-400 hover:text-rose-600 transition-colors"
            aria-label={`Remove filter ${f.label}`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      {onClearAll && filters.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-[#00288e] hover:text-[#1e40af] font-semibold hover:underline transition-colors ml-1"
        >
          Clear all
        </button>
      )}
    </div>
  );
};

export default FilterChips;
