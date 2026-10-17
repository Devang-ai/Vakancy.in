import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

export const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-md tracking-wide select-none transition-colors';

  const variants = {
    default: 'bg-surface-800 text-slate-300 border border-white/10',
    brand: 'bg-brand-900/40 text-brand-200 border border-brand-500/30',
    success: 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30',
    warning: 'bg-amber-950/40 text-amber-300 border border-amber-500/30',
    danger: 'bg-rose-950/40 text-rose-300 border border-rose-500/30',
    outline: 'bg-transparent text-slate-400 border border-white/15',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-0.5 gap-1.5',
    lg: 'text-xs px-3 py-1 gap-1.5',
  };

  const dotColors = {
    default: 'bg-slate-400',
    brand: 'bg-brand-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-rose-400',
    outline: 'bg-slate-500',
  };

  return (
    <span className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
