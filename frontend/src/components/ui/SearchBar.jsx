import React from 'react';
import { Search, MapPin, X } from 'lucide-react';
import Button from './Button';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

export const SearchBar = ({
  value = '',
  onChange,
  onSearch,
  locationValue = '',
  onLocationChange,
  showLocation = false,
  placeholder = 'Search by title, skill, or keyword...',
  locationPlaceholder = 'City, state, or remote...',
  className = '',
  loading = false,
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'ep-card p-1.5 sm:p-2 flex flex-col md:flex-row items-stretch gap-2 bg-surface-900 border border-white/10 shadow-lg',
        className
      )}
    >
      {/* Query Search */}
      <div className="relative flex-1 flex items-center min-w-0">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 pl-10 pr-8 py-2.5 focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2.5 p-1 text-slate-500 hover:text-slate-300"
            aria-label="Clear search query"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Location Input */}
      {showLocation && (
        <div className="relative flex-1 flex items-center min-w-0 border-t md:border-t-0 md:border-l border-white/10 pt-2 md:pt-0">
          <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={locationValue}
            onChange={(e) => onLocationChange && onLocationChange(e.target.value)}
            placeholder={locationPlaceholder}
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 pl-10 pr-8 py-2.5 focus:outline-none"
          />
          {locationValue && (
            <button
              type="button"
              onClick={() => onLocationChange && onLocationChange('')}
              className="absolute right-2.5 p-1 text-slate-500 hover:text-slate-300"
              aria-label="Clear location query"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Action Button */}
      <Button
        type="submit"
        variant="primary"
        size="md"
        isLoading={loading}
        className="shrink-0 px-5"
      >
        Search Jobs
      </Button>
    </form>
  );
};

export default SearchBar;
