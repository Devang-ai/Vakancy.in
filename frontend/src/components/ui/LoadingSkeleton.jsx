import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

export const LoadingSkeleton = ({
  className = '',
  count = 1,
  variant = 'rect',
}) => {
  const items = Array.from({ length: count });

  return (
    <>
      {items.map((_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={cn(
            'animate-pulse bg-slate-200/80 border border-slate-200/40',
            variant === 'circle' ? 'rounded-full' : 'rounded-md',
            variant === 'text' && 'h-4 w-full rounded',
            variant === 'card' && 'h-32 w-full rounded-xl',
            className
          )}
        />
      ))}
    </>
  );
};

export default LoadingSkeleton;
