import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

export const Toast = ({
  type = 'info',
  title,
  message,
  onClose,
  onRetry,
  className = '',
}) => {
  const types = {
    success: {
      icon: CheckCircle2,
      border: 'border-emerald-200',
      iconColor: 'text-emerald-600',
      bg: 'bg-white',
      titleColor: 'text-emerald-950',
    },
    warning: {
      icon: AlertTriangle,
      border: 'border-amber-200',
      iconColor: 'text-amber-600',
      bg: 'bg-white',
      titleColor: 'text-amber-950',
    },
    error: {
      icon: AlertCircle,
      border: 'border-red-200',
      iconColor: 'text-red-600',
      bg: 'bg-white',
      titleColor: 'text-red-950',
    },
    info: {
      icon: Info,
      border: 'border-blue-200',
      iconColor: 'text-[#00288e]',
      bg: 'bg-white',
      titleColor: 'text-[#0b1c30]',
    },
  };

  const current = types[type] || types.info;
  const Icon = current.icon;

  return (
    <div
      role="alert"
      className={cn(
        'flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white border shadow-md max-w-sm sm:max-w-md w-auto text-xs font-medium text-slate-800 transition-all duration-200 ease-out',
        current.border,
        className
      )}
    >
      <Icon className={cn('w-4 h-4 shrink-0', current.iconColor)} aria-hidden="true" />
      <div className="flex-1 min-w-0 pr-1">
        {title && <h4 className={cn('font-bold text-xs mb-0.5', current.titleColor)}>{title}</h4>}
        {message && <p className="text-slate-700 leading-snug font-medium text-xs">{message}</p>}
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00288e] hover:text-[#1e40af] bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors shrink-0 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Retry</span>
        </button>
      )}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors shrink-0 cursor-pointer focus:outline-none"
          aria-label="Close notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default Toast;
