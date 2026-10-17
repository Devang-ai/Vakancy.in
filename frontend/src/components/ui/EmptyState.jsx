import React from 'react';
import { Inbox } from 'lucide-react';
import Button from './Button';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'There are no items matching your criteria at this time.',
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={cn(
        'bg-white rounded-xl p-10 flex flex-col items-center justify-center text-center max-w-md mx-auto border border-dashed border-slate-300 shadow-xs',
        className
      )}
    >
      <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#00288e] mb-4 shadow-inner">
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>

      <h3 className="text-base font-bold text-slate-900 font-heading tracking-tight">
        {title}
      </h3>

      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-xs">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onAction}
          className="mt-5 bg-[#00288e] text-white hover:bg-[#1e40af] border-transparent"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
