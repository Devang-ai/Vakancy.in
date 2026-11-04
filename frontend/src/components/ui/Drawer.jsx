import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import useModalA11y from '../../hooks/useModalA11y';

const cn = (...inputs) => twMerge(clsx(inputs));

export const Drawer = ({
  isOpen,
  onClose,
  title,
  children,
  width = 'max-w-md',
  className = '',
}) => {
  useModalA11y(isOpen, onClose);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
        <div
          className={cn(
            'w-screen bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200',
            width,
            className
          )}
        >
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/80">
            <h3 className="text-base font-bold text-slate-900 font-heading tracking-tight">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00288e]"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-white">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Drawer;
