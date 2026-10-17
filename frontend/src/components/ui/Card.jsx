import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

export const Card = React.forwardRef(({
  children,
  interactive = false,
  className = '',
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        interactive ? 'ep-card-interactive cursor-pointer' : 'ep-card',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export const CardHeader = ({ children, className = '', ...props }) => (
  <div className={cn('p-5 border-b border-white/5 flex flex-col space-y-1', className)} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '', ...props }) => (
  <h3 className={cn('text-base font-semibold text-slate-100 font-heading tracking-tight', className)} {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className = '', ...props }) => (
  <p className={cn('text-xs text-slate-400 leading-relaxed', className)} {...props}>
    {children}
  </p>
);

export const CardContent = ({ children, className = '', ...props }) => (
  <div className={cn('p-5', className)} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '', ...props }) => (
  <div className={cn('p-4 px-5 border-t border-white/5 flex items-center justify-between', className)} {...props}>
    {children}
  </div>
);

export default Card;
