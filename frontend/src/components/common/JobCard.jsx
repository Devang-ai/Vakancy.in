import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Bookmark, CheckCircle2, Briefcase, Zap, Star, Banknote } from 'lucide-react';

/**
 * JobCard Component
 * Premium Indian recruitment platform visual presentation (Naukri-inspired hierarchy)
 * strictly using existing Vakancy.in job data and visual identity.
 * Does not invent fields, ratings, or fake badges.
 */
export const JobCard = ({
  job,
  variant = 'default',
  className = '',
  isSaved: propIsSaved,
  onToggleSave,
}) => {
  const [internalSaved, setInternalSaved] = useState(false);
  const isSaved = propIsSaved !== undefined ? propIsSaved : internalSaved;

  if (!job) return null;

  const {
    id,
    title,
    company,
    company_name,
    companyLogo,
    companyInitials,
    initialsColor = 'text-[#00288e]',
    industry,
    department,
    job_domain,
    location,
    workplaceType,
    workMode,
    experience = 'Not specified',
    salaryRange = 'Competitive',
    skills = [],
    postedAgo = 'Recently',
    isVerified = false,
    rating = null,
    reviewsCount = null,
    badge = null,
    badgeType = null,
    snippet = null,
    description = null,
  } = job;

  const companyDisplayName = company || company_name || 'Hiring Company';
  const effectiveWorkplace = workplaceType || workMode || 'On-site';
  const departmentDisplay = department || job_domain || industry || null;
  const formattedSalary = salaryRange ? String(salaryRange).replace(/^\?/, '₹').replace(/\s\?/, ' ₹') : 'Competitive';
  const displaySnippet = snippet || (description ? (description.length > 200 ? description.slice(0, 197) + '...' : description) : '');
  const initials = companyInitials || companyDisplayName?.slice(0, 2).toUpperCase() || 'CO';

  // Authoritative recommendation normalization
  const isJobRecommended = Boolean(
    job.is_recommended === true ||
    job.isRecommended === true ||
    job.is_rec === 1 ||
    job.is_rec === true ||
    job.recommendation_badge === 'Vakancy.in Recommended' ||
    (typeof badge === 'string' && badge.includes('Recommended'))
  );

  // Parse skill list safely
  const skillList = Array.isArray(skills)
    ? skills
    : (typeof skills === 'string'
      ? (skills.startsWith('[')
        ? (() => { try { return JSON.parse(skills); } catch { return skills.split(',').map(s => s.trim()).filter(Boolean); } })()
        : skills.split(',').map(s => s.trim()).filter(Boolean))
      : []);

  const displayedSkills = skillList.slice(0, 4);
  const remainingCount = skillList.length - displayedSkills.length;

  // SEARCH / DETAILED LIST VARIANT
  if (variant === 'search' || variant === 'detailed') {
    return (
      <article
        className={`bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:shadow-[0_12px_24px_rgba(0,40,142,0.06)] hover:border-blue-200/90 transition-all duration-200 p-5 sm:p-6 flex flex-col gap-3.5 group ${className}`}
      >
        {/* Top Header: Logo, Job Title, Company, Department, Bookmark */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            {/* Logo Container */}
            {companyLogo ? (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white p-1.5 border border-slate-200/80 shadow-2xs shrink-0 flex items-center justify-center overflow-hidden">
                <img
                  src={companyLogo}
                  alt={companyDisplayName}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/60 border border-slate-200/80 flex items-center justify-center font-extrabold ${initialsColor} text-base sm:text-lg shrink-0 shadow-2xs tracking-wider`}
              >
                {initials}
              </div>
            )}

            {/* Title & Company Info */}
            <div className="flex flex-col min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/jobs/${id}`}
                  className="font-bold text-lg sm:text-xl text-[#0f172a] group-hover:text-[#00288e] transition-colors tracking-tight leading-snug line-clamp-1"
                >
                  {title}
                </Link>
                {isJobRecommended ? (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#eff6ff] text-[#1e40af] border border-blue-200/90 shadow-2xs tracking-tight shrink-0 select-none"
                    title="Vakancy.in Verified & Recommended Position"
                  >
                    <Star className="w-3 h-3 text-[#1e40af] fill-[#1e40af]" aria-hidden="true" />
                    <span>Vakancy.in Recommended</span>
                  </span>
                ) : badge && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${
                      badgeType === 'urgent'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                    }`}
                  >
                    {badgeType === 'urgent' && <Zap className="w-3 h-3 text-rose-600 fill-rose-600" />}
                    {badge}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 pt-1 flex-wrap">
                <span className="font-semibold text-slate-900">{companyDisplayName}</span>
                {departmentDisplay && (
                  <>
                    <span className="text-slate-300 font-bold">•</span>
                    <span className="text-slate-500 font-medium">{departmentDisplay}</span>
                  </>
                )}
                {isVerified && (
                  <CheckCircle2
                    className="w-3.5 h-3.5 text-[#00288e] shrink-0 fill-[#00288e]/10"
                    title="Verified Employer"
                  />
                )}
                {rating != null && (
                  <>
                    <span className="text-slate-300 font-bold">•</span>
                    <span className="inline-flex items-center gap-0.5 text-emerald-700 font-semibold text-xs">
                      {rating} <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                    </span>
                  </>
                )}
                {reviewsCount != null && (
                  <span className="text-slate-400 text-xs">({reviewsCount} reviews)</span>
                )}
              </div>
            </div>
          </div>

          {/* Bookmark Action */}
          <button
            aria-label={isSaved ? "Saved Job" : "Save Job"}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onToggleSave) {
                onToggleSave(id, job);
              } else {
                setInternalSaved(!internalSaved);
              }
            }}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 border ${
              isSaved
                ? 'text-[#00288e] bg-blue-50/90 border-blue-200 shadow-2xs'
                : 'text-slate-400 hover:text-[#00288e] hover:bg-slate-50 border-slate-200/60 hover:border-slate-300'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#00288e]' : ''}`} />
          </button>
        </div>

        {/* Metadata Metrics Row */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-[13px] text-slate-700 pt-2 pb-0.5 border-t border-slate-100">
          <div className="flex items-center gap-1.5 font-medium text-slate-600">
            <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{experience}</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <Banknote className="w-4 h-4 text-[#00288e] shrink-0" />
            <span>{formattedSalary}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 truncate max-w-xs sm:max-w-sm">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#00288e] font-semibold text-xs border border-blue-100">
              {effectiveWorkplace}
            </span>
          </div>
        </div>

        {/* Snippet / Description */}
        {displaySnippet && (
          <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
            {displaySnippet}
          </p>
        )}

        {/* Skill Tags & Actions Bottom Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-0.5 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            {displayedSkills.map((skill, index) => (
              <span
                key={index}
                className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200/70 transition-colors"
              >
                {skill}
              </span>
            ))}
            {remainingCount > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-xs font-semibold">
                +{remainingCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3.5 ml-auto sm:ml-0">
            <span className="text-xs text-slate-400 font-medium">{postedAgo}</span>
            <Link
              to={`/jobs/${id}`}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white text-xs sm:text-sm font-bold transition-all shadow-2xs hover:shadow-xs"
            >
              View Job
            </Link>
          </div>
        </div>
      </article>
    );
  }

  // DEFAULT / COMPACT GRID VARIANT
  return (
    <div
      className={`bg-white rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:shadow-[0_12px_24px_rgba(0,40,142,0.06)] hover:border-blue-200/90 border border-slate-200/90 transition-all duration-200 flex flex-col justify-between gap-4 group overflow-hidden ${className}`}
    >
      <div className="flex flex-col gap-3.5">
        {/* Top Header: Company Info & Bookmark */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {companyLogo ? (
              <div className="w-11 h-11 rounded-xl bg-white p-1 border border-slate-200/80 shadow-2xs shrink-0 flex items-center justify-center overflow-hidden">
                <img
                  src={companyLogo}
                  alt={companyDisplayName}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/60 border border-slate-200/80 flex items-center justify-center text-[#00288e] font-extrabold text-sm shrink-0 shadow-2xs">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-slate-900 truncate">{companyDisplayName}</span>
                {isVerified && (
                  <CheckCircle2
                    className="w-3.5 h-3.5 text-[#00288e] shrink-0 fill-[#00288e]/10"
                    title="Verified Employer"
                  />
                )}
              </div>
              <span className="text-xs text-slate-500 font-medium truncate block">
                {departmentDisplay || 'Professional Services'}
              </span>
            </div>
          </div>

          {/* Bookmark Button */}
          <button
            aria-label={isSaved ? "Saved Job" : "Save Job"}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onToggleSave) {
                onToggleSave(id, job);
              } else {
                setInternalSaved(!internalSaved);
              }
            }}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 border ${
              isSaved
                ? 'text-[#00288e] bg-blue-50/90 border-blue-200 shadow-2xs'
                : 'text-slate-400 hover:text-[#00288e] hover:bg-slate-50 border-slate-200/60 hover:border-slate-300'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#00288e]' : ''}`} />
          </button>
        </div>

        {/* Job Title & Optional Recommended Badge */}
        <div className="flex flex-col gap-1.5">
          {isJobRecommended ? (
            <div>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#eff6ff] text-[#1e40af] border border-blue-200/90 shadow-2xs tracking-tight shrink-0 select-none"
                title="Vakancy.in Verified & Recommended Position"
              >
                <Star className="w-3 h-3 text-[#1e40af] fill-[#1e40af]" aria-hidden="true" />
                <span>Vakancy.in Recommended</span>
              </span>
            </div>
          ) : badge ? (
            <div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                {badge}
              </span>
            </div>
          ) : null}
          <Link to={`/jobs/${id}`} className="block">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-[#00288e] transition-colors line-clamp-1 tracking-tight">
              {title}
            </h3>
          </Link>
        </div>

        {/* Metadata row: Location, Experience, Workplace Type */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate max-w-[120px]">{location}</span>
          </span>
          <span className="text-slate-300">•</span>
          <span className="inline-flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{experience}</span>
          </span>
          <span className="text-slate-300">•</span>
          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#00288e] font-semibold text-[11px] border border-blue-100">
            {effectiveWorkplace}
          </span>
        </div>

        {/* Skills Tag Pills */}
        {skillList && skillList.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {displayedSkills.slice(0, 3).map((skill, index) => (
              <span
                key={index}
                className="px-2.5 py-0.5 rounded-md bg-slate-50 text-slate-700 text-[11px] font-medium border border-slate-200/60"
              >
                {skill}
              </span>
            ))}
            {skillList.length > 3 && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[11px] font-semibold">
                +{skillList.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Bar: CTC Bracket & Apply CTA */}
      <div className="pt-3 flex items-center justify-between bg-slate-50/80 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 px-5 sm:px-6 py-3.5 border-t border-slate-100">
        <div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Compensation</div>
          <div className="text-xs sm:text-sm font-bold text-slate-900">{formattedSalary}</div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-slate-400 font-medium">{postedAgo}</span>
          <Link
            to={`/jobs/${id}`}
            className="bg-[#00288e] hover:bg-[#1e40af] text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow-2xs hover:shadow-xs"
          >
            View Job
          </Link>
        </div>
      </div>
    </div>
  );
};

export default JobCard;
