import React from 'react';
import { Loader2, FolderOpen, AlertTriangle, RefreshCw } from 'lucide-react';

export const LoadingState = ({ message = 'Loading internal records...' }) => (
  <div className="flex flex-col items-center justify-center p-12 bg-white border border-slate-200 rounded-xl text-center space-y-3 shadow-xs">
    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 animate-pulse">
      <Loader2 className="w-5 h-5 animate-spin" />
    </div>
    <p className="text-xs font-medium text-slate-600 tracking-wide">{message}</p>
  </div>
);

export const EmptyState = ({
  title = 'No records found',
  description = 'There are no items matching your current filters.',
  actionLabel,
  onAction,
  icon: Icon = FolderOpen
}) => (
  <div className="flex flex-col items-center justify-center p-12 bg-slate-50/60 border border-dashed border-slate-200 rounded-xl text-center space-y-3">
    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-400">
      <Icon className="w-6 h-6" />
    </div>
    <div className="max-w-xs space-y-1">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
      >
        <span>{actionLabel}</span>
      </button>
    )}
  </div>
);

export const ErrorState = ({ message = 'An error occurred while loading data.', onRetry }) => (
  <div className="flex flex-col items-center justify-center p-8 bg-rose-50/60 border border-rose-200 rounded-xl text-center space-y-3">
    <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 text-rose-700 flex items-center justify-center">
      <AlertTriangle className="w-5 h-5" />
    </div>
    <div className="max-w-sm">
      <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider">Error Encountered</h4>
      <p className="text-xs text-rose-700 mt-1">{message}</p>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 text-xs font-semibold shadow-xs transition-all"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Retry</span>
      </button>
    )}
  </div>
);

export default { LoadingState, EmptyState, ErrorState };

