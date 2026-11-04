import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

/**
 * A custom dropdown that replaces native <select> elements,
 * providing a consistent UI matching the Vakancy.in design system.
 * Supports optional instant client-side search filtering.
 */
export default function CustomDropdown({
  id,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  searchable = false,
  searchPlaceholder = 'Search...',
  disabled = false,
  className = '',
  triggerClassName = '',
  label = null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalize options array to { value, label }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { value: String(opt), label: String(opt) };
    }
    return { value: opt.value, label: opt.label ?? String(opt.value) };
  });

  // Filtered options when searchable is enabled
  const displayedOptions = searchable && searchTerm.trim()
    ? normalizedOptions.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase().trim())
      )
    : normalizedOptions;

  // Close when clicking outside and reset search
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, searchable]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (!isOpen) {
        e.preventDefault();
        setIsOpen(true);
      }
    } else if (e.key === 'ArrowDown' && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const selectedOption = normalizedOptions.find((opt) => String(opt.value) === String(value));
  const hasExplicitWidth = /\bw-(?:auto|full|screen|min|max|fit|\d+|\[[^\]]+\])\b/.test(className);

  return (
    <div ref={containerRef} className={`relative ${hasExplicitWidth ? '' : 'w-full'} ${className} ${isOpen ? 'z-[60]' : 'z-10'}`}>
      {label && (
        <label htmlFor={id} className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <button
        type="button"
        id={id}
        name={name}
        disabled={disabled}
        onClick={() => {
          setIsOpen(!isOpen);
          if (isOpen) setSearchTerm('');
        }}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={selectedOption ? selectedOption.label : placeholder}
        className={`w-full px-3.5 py-2.5 bg-white text-[#0b1c30] rounded-xl text-xs font-semibold 
          flex items-center justify-between outline-none transition-all border border-slate-200/90 shadow-2xs
          ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer hover:border-slate-300 hover:bg-slate-50/70 focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/15'}
          ${triggerClassName}`}
      >
        <span className={`truncate ${!selectedOption && placeholder ? 'text-slate-400 font-normal' : 'text-slate-800'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${isOpen ? 'rotate-180 text-[#00288e]' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div
          role="listbox"
          tabIndex={-1}
          className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200/90 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto py-1 animate-in fade-in zoom-in-95 duration-150 divide-y divide-slate-100/60"
        >
          {searchable && (
            <div className="p-2 sticky top-0 bg-white z-10 border-b border-slate-100">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00288e] focus:bg-white transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Escape') {
                      setIsOpen(false);
                      setSearchTerm('');
                    }
                  }}
                />
              </div>
            </div>
          )}

          {displayedOptions.length > 0 ? (
            displayedOptions.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`w-full text-left px-3.5 py-2 text-xs transition-colors cursor-pointer flex items-center justify-between
                    ${isSelected ? 'bg-blue-50/80 text-[#00288e] font-bold' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium'}
                  `}
                  onClick={() => {
                    onChange({ target: { name, value: opt.value } });
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#00288e] shrink-0 ml-1.5" />}
                </button>
              );
            })
          ) : (
            <div className="px-4 py-3 text-xs text-slate-400 text-center">
              {searchable && searchTerm ? 'No matching results' : 'No options available'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
