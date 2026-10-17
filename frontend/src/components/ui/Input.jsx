import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

export const Input = React.forwardRef(({
  label,
  error,
  helperText,
  leftIcon = null,
  rightIcon = null,
  className = '',
  id,
  type = 'text',
  disabled = false,
  required = false,
  ...props
}, ref) => {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium text-slate-300 select-none tracking-wide"
        >
          {label} {required && <span className="text-rose-400" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3 text-slate-500 pointer-events-none flex items-center justify-center">
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          required={required}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={cn(
            'ep-input w-full px-3 py-2 text-sm',
            leftIcon && 'pl-9',
            rightIcon && 'pr-9',
            error && 'border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500',
            className
          )}
          {...props}
        />

        {rightIcon && (
          <span className="absolute right-3 text-slate-500 flex items-center justify-center">
            {rightIcon}
          </span>
        )}
      </div>

      {error ? (
        <p id={errorId} className="text-xs text-rose-400 mt-1" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-slate-500 mt-1">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
