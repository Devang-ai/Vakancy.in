import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ type = 'info', title, description, onClose, duration = 4000 }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Small delay to trigger entry animation
    const enterTimeout = setTimeout(() => setIsVisible(true), 10);
    
    // Auto dismiss
    const dismissTimeout = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        if (onClose) onClose();
      }, 300); // wait for exit animation
    }, duration);

    return () => {
      clearTimeout(enterTimeout);
      clearTimeout(dismissTimeout);
    };
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };

  const styles = {
    success: {
      bg: 'bg-white',
      border: 'border-emerald-100',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
      title: 'text-emerald-900',
      desc: 'text-emerald-700/80'
    },
    error: {
      bg: 'bg-white',
      border: 'border-red-100',
      icon: <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />,
      title: 'text-red-900',
      desc: 'text-red-700/80'
    },
    info: {
      bg: 'bg-white',
      border: 'border-blue-100',
      icon: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
      title: 'text-[#0b1c30]',
      desc: 'text-[#444653]'
    }
  };

  const currentStyle = styles[type] || styles.info;

  return (
    <div
      className={`fixed bottom-6 right-6 z-[9999] flex items-start gap-3 w-[320px] p-4 rounded-xl shadow-lg border transition-all duration-300 transform ${currentStyle.bg} ${currentStyle.border} ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      {currentStyle.icon}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <h4 className={`text-sm font-bold ${currentStyle.title} leading-tight truncate`}>{title}</h4>
        {description && (
          <p className={`text-xs ${currentStyle.desc} leading-relaxed`}>{description}</p>
        )}
      </div>
      <button 
        onClick={handleClose}
        className="p-1 rounded-md hover:bg-slate-100 transition-colors shrink-0 -mt-0.5 -mr-0.5"
      >
        <X className="w-4 h-4 text-slate-400" />
      </button>
    </div>
  );
}
