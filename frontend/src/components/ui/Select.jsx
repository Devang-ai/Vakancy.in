import React from 'react';
import { ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

export const Select = React.forwardRef(({
  label,
  options = [],
  error,
  helperText,
  className = '',
  id,
  disabled = false,
  required = false,
  children,
  ...props
}, ref) => {
  const generatedId = React.useId();
  const selectId = id || generatedId;

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-medium text-slate-300 select-none tracking-wide"
        >
          {label} {required && <span className="text-rose-400" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          required={required}
          className={cn(
            'ep-input w-full px-3 py-2 text-sm pr-9 appearance-none cursor-pointer',
            error && 'border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500',
            className
          )}
          {...props}
        >
          {children ? children : options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-surface-900 text-slate-100">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {error ? (
        <p className="text-xs text-rose-400 mt-1" role="alert">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-500 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
