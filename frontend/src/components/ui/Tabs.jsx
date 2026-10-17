import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

export const Tabs = ({
  tabs = [],
  activeTab,
  onChange,
  variant = 'underline',
  className = '',
}) => {
  return (
    <div
      role="tablist"
      aria-label="Navigation Tabs"
      className={cn(
        variant === 'underline'
          ? 'flex border-b border-white/10 space-x-6'
          : 'inline-flex p-1 bg-surface-850 rounded-lg border border-white/5 space-x-1',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex items-center text-xs font-medium transition-colors duration-150 focus:outline-none select-none',
              variant === 'underline' && [
                'py-3 border-b-2 -mb-px gap-2',
                isActive
                  ? 'border-brand-500 text-brand-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-white/20'
              ],
              variant === 'pill' && [
                'px-3 py-1.5 rounded-md gap-1.5',
                isActive
                  ? 'bg-brand-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              ]
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-semibold',
                  isActive
                    ? 'bg-brand-500/30 text-white'
                    : 'bg-white/10 text-slate-400'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
