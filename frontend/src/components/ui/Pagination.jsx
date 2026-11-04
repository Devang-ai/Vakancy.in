import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

export const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalItems,
  pageSize = 10,
  onPageChange,
  className = '',
  hideIfSinglePage = false,
}) => {
  if (totalPages < 1 || (totalPages <= 1 && hideIfSinglePage)) return null;

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      
      if (currentPage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  const pages = getPageNumbers();

  const startItem = totalItems !== undefined ? Math.min((currentPage - 1) * pageSize + 1, totalItems) : null;
  const endItem = totalItems !== undefined ? Math.min(currentPage * pageSize, totalItems) : null;

  return (
    <nav
      role="navigation"
      aria-label="Pagination Navigation"
      className={cn('bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-700 text-xs font-medium', className)}
    >
      <div className="text-slate-500 text-xs text-center sm:text-left">
        {totalItems !== undefined && totalItems > 0 ? (
          <span>
            Showing <strong className="text-slate-900 font-bold">{startItem}–{endItem}</strong> of{' '}
            <strong className="text-slate-900 font-bold">{totalItems.toLocaleString()}</strong> jobs (Page{' '}
            <strong className="text-slate-900 font-bold">{currentPage}</strong> of{' '}
            <strong className="text-slate-900 font-bold">{totalPages.toLocaleString()}</strong>)
          </span>
        ) : (
          <span>
            Page <strong className="text-slate-900 font-bold">{currentPage}</strong> of{' '}
            <strong className="text-slate-900 font-bold">{totalPages.toLocaleString()}</strong>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <button
          type="button"
          id="btn-pagination-prev"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        {pages.map((p, idx) => (
          p === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 font-bold">...</span>
          ) : (
            <button
              key={p}
              type="button"
              id={`btn-pagination-page-${p}`}
              onClick={() => onPageChange(p)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer',
                p === currentPage
                  ? 'bg-[#00288e] text-white shadow-xs font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              )}
            >
              {p}
            </button>
          )
        ))}

        <button
          type="button"
          id="btn-pagination-next"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </nav>
  );
};

export default Pagination;
