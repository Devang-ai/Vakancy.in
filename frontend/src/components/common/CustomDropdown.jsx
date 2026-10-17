import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * A custom dropdown that replaces native <select> elements,
 * providing a consistent UI matching the JobCategoryAutocomplete.
 */
export default function CustomDropdown({ id, name, value, onChange, options = [], disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={containerRef} className={`relative w-full ${isOpen ? 'z-[60]' : 'z-10'}`}>
      <button
        type="button"
        id={id}
        name={name}
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2.5 bg-[#eff4ff] text-[#0b1c30] rounded-xl text-xs font-medium 
          flex items-center justify-between outline-none transition-colors border border-transparent
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-[#e5eeff] focus:bg-white focus:ring-2 focus:ring-[#00288e]'}`}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : 'Select...'}</span>
        <ChevronDown className={`w-4 h-4 text-[#444653] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto py-1 animate-fade-in">
          {options.length > 0 ? (
            options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`w-full text-left px-4 py-2.5 text-xs transition-colors cursor-pointer
                  ${opt.value === value ? 'bg-[#00288e] text-white font-bold' : 'text-[#0b1c30] hover:bg-slate-50 font-medium'}
                `}
                onClick={() => {
                  onChange({ target: { name, value: opt.value } });
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-xs text-[#757684]">No options available</div>
          )}
        </div>
      )}
    </div>
  );
}
