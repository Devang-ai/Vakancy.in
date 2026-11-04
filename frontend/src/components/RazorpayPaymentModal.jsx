import React from 'react';
import { createPortal } from 'react-dom';
import { CreditCard, ShieldCheck, X } from 'lucide-react';
import useModalA11y from '../hooks/useModalA11y';

const RazorpayPaymentModal = ({ isOpen, onClose, item }) => {
  useModalA11y(isOpen, onClose);

  if (!isOpen || !item) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md max-h-[calc(100vh-1.5rem)] max-h-[calc(100dvh-1.5rem)] glass-card rounded-2xl border border-white/15 p-6 shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-slate-700 text-white">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-heading">Payments Unavailable</h3>
            <p className="text-xs text-slate-400">Checkout is not enabled in this development phase.</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 mb-5 space-y-2">
          <div className="flex justify-between text-xs gap-4">
            <span className="text-slate-400">Item:</span>
            <span className="font-semibold text-white text-right">{item.title}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Status:</span>
            <span className="font-semibold text-slate-300">Unavailable</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>No payment will be initiated and no paid entitlement can be activated.</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm transition-colors"
        >
          Close
        </button>
      </div>
    </div>,
    document.body
  );
};

export default RazorpayPaymentModal;
