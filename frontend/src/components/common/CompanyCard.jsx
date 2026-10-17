import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, MapPin, Building2, Star, ArrowRight } from 'lucide-react';

/**
 * CompanyCard Component
 * Executive Precision styling matching Google Stitch "Vakancy.in - Company Profile".
 * Supports variants:
 * - 'compact' (Default, used on Home Page)
 * - 'directory' (Rich cards for Company Directory grid on /companies)
 * - 'sidebar' (Horizontal compact item for right-rail similar companies)
 */
export const CompanyCard = ({ company, variant = 'compact', className = '' }) => {
  if (!company) return null;

  const {
    id,
    code,
    name,
    industry,
    location,
    openingsCount,
    openJobsNum,
    openJobs,
    rating,
    reviewsCount,
    tagline,
    techStack,
    isVerified,
    tier,
  } = company;

  const displayJobs = openingsCount || openJobs || (openJobsNum ? `${openJobsNum} Open Jobs` : 'Hiring');
  const displayCode = code || name.slice(0, 3).toUpperCase();

  // --------------------------------------------------------------------------
  // Variant: Sidebar / List Item (Stitch Right Rail)
  // --------------------------------------------------------------------------
  if (variant === 'sidebar') {
    return (
      <Link
        to={`/companies/${id}`}
        className={`p-3 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-between border border-slate-200/70 transition-colors group ${className}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#1e40af] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 group-hover:bg-[#00288e] transition-colors">
            {displayCode.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-sm text-slate-900 group-hover:text-[#00288e] transition-colors truncate">
              {name}
            </h4>
            <p className="text-xs text-slate-500 truncate">{industry}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-3">
          <span className="text-xs font-semibold text-[#00288e]">{displayJobs}</span>
          {rating && <span className="block text-xs text-slate-400 mt-0.5">{rating} ★</span>}
        </div>
      </Link>
    );
  }

  // --------------------------------------------------------------------------
  // Variant: Directory Card (Stitch Company Directory Grid)
  // --------------------------------------------------------------------------
  if (variant === 'directory') {
    return (
      <div
        className={`bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group ${className}`}
      >
        <div>
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-[#1e40af] text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-xs group-hover:bg-[#00288e] transition-colors">
                {displayCode.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Link
                    to={`/companies/${id}`}
                    className="font-bold text-base text-slate-900 group-hover:text-[#00288e] transition-colors truncate"
                  >
                    {name}
                  </Link>
                  {isVerified && (
                    <CheckCircle2 className="w-4 h-4 text-[#006a61] fill-[#e6f7f5] flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 truncate">
                  <span className="truncate">{industry}</span>
                  {location && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="inline-flex items-center gap-0.5 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        {location.split(',')[0]}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {tier && (
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-[#006a61] border border-emerald-200/60 flex-shrink-0">
                {tier}
              </span>
            )}
          </div>

          {/* Tagline / Description */}
          {tagline && (
            <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">
              {tagline}
            </p>
          )}

          {/* Tech Stack / Tags */}
          {techStack && techStack.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-1">
              {techStack.slice(0, 4).map((tech, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-medium"
                >
                  {tech}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Metadata & Action Row */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            {rating && (
              <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                {rating}
                {reviewsCount && <span className="text-slate-400 font-normal">({reviewsCount})</span>}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#00288e] font-semibold text-[11px]">
              {displayJobs}
            </span>
          </div>

          <Link
            to={`/companies/${id}`}
            className="inline-flex items-center gap-1 text-[#00288e] font-semibold hover:text-[#1e40af] group-hover:translate-x-0.5 transition-transform"
          >
            Explore
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Variant: Compact (Home Page Grid Default)
  // --------------------------------------------------------------------------
  return (
    <Link
      to={`/companies/${id}`}
      className={`bg-white rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center text-center border border-slate-200/80 shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] hover:shadow-md hover:border-slate-300 transition-all group min-w-0 ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-[#00288e] font-bold text-sm mb-2 group-hover:bg-[#00288e] group-hover:text-white transition-colors">
        {displayCode}
      </div>
      <span className="font-semibold text-sm text-slate-900 group-hover:text-[#00288e] transition-colors truncate w-full">
        {name}
      </span>
      <span className="text-xs text-slate-400 font-medium mt-0.5 truncate w-full">
        {displayJobs}
      </span>
    </Link>
  );
};

export default CompanyCard;
