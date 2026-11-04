import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Bookmark, CheckCircle2, Briefcase, Zap, Star, Banknote, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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
  detailUrl,
}) => {
  const [internalSaved, setInternalSaved] = useState(false);
  const isSaved = propIsSaved !== undefined ? propIsSaved : internalSaved;
  const routerLocation = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

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

  // Determine canonical detail URL: candidate portal context routes to /candidate/jobs/:id
  const getJobDetailUrl = () => {
    if (detailUrl) {
      return typeof detailUrl === 'function' ? detailUrl(id, job) : `${detailUrl}/${id}`;
    }
    const isCandidateContext =
      routerLocation.pathname.startsWith('/candidate') ||
      (user && user.role === 'candidate' && !routerLocation.pathname.startsWith('/recruiter') && !routerLocation.pathname.startsWith('/employer'));

    return isCandidateContext ? `/candidate/jobs/${id}` : `/jobs/${id}`;
  };

  const jobLink = getJobDetailUrl();
  const isConfidential = Boolean(
    job.is_confidential ||
    companyDisplayName?.toLowerCase().includes('confidential') ||
    title?.toLowerCase().includes('confidential')
  );

  const locationList = location ? String(location).split(';').map(s => s.trim()).filter(Boolean) : [];
  const primaryLocation = locationList[0] || location || 'Flexible';

  // SEARCH / DETAILED LIST VARIANT
  if (variant === 'search' || variant === 'detailed') {
    return (
      <article
        onClick={(e) => {
          if (!e.target.closest('button') && !e.target.closest('a')) {
            navigate(jobLink);
          }
        }}
        className={`bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:shadow-[0_12px_24px_rgba(0,40,142,0.06)] hover:border-blue-200/90 transition-all duration-200 p-3.5 sm:p-6 group cursor-pointer ${className}`}
      >
        {/* ONE UNIFIED RESPONSIVE CARD ARCHITECTURE (Mobile, Tablet, Desktop) */}
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Top Row: Company Logo + Title + Badges + Bookmark */}
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
              {/* Logo Container */}
              {companyLogo ? (
                <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl bg-white p-1 border border-slate-200/80 shadow-2xs shrink-0 flex items-center justify-center overflow-hidden">
                  <img
                    src={companyLogo}
                    alt={companyDisplayName}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/60 border border-slate-200/80 flex items-center justify-center font-extrabold ${initialsColor} text-sm sm:text-base lg:text-lg shrink-0 shadow-2xs tracking-wider`}
                >
                  {initials}
                </div>
              )}

              {/* Title & Company Info */}
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <Link
                    to={jobLink}
                    className="font-bold text-base sm:text-lg lg:text-xl text-[#0f172a] group-hover:text-[#00288e] transition-colors tracking-tight leading-snug line-clamp-1"
                  >
                    {title}
                  </Link>
                  {isConfidential && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-semibold bg-blue-50 text-[#00288e] border border-blue-200/80 shrink-0">
                      <Lock className="w-3 h-3 text-[#00288e]" />
                      <span>Confidential Mandate</span>
                    </span>
                  )}
                  {isJobRecommended ? (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-[#eff6ff] text-[#1e40af] border border-blue-200/90 shadow-2xs tracking-tight shrink-0 select-none"
                    >
                      <Star className="w-3 h-3 text-[#1e40af] fill-[#1e40af]" aria-hidden="true" />
                      <span>Recommended</span>
                    </span>
                  ) : badge && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold shrink-0 ${
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

                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-600 pt-0.5 sm:pt-1 flex-wrap">
                  <span className="font-semibold text-slate-900">{companyDisplayName}</span>
                  {departmentDisplay && (
                    <>
                      <span className="text-slate-300 font-bold">•</span>
                      <span className="text-slate-500 font-medium truncate max-w-none">{departmentDisplay}</span>
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
                if (onToggleSave) onToggleSave(id, job);
                else setInternalSaved(!internalSaved);
              }}
              className={`min-w-[40px] min-h-[40px] w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 border cursor-pointer ${
                isSaved
                  ? 'text-[#00288e] bg-blue-50/90 border-blue-200 shadow-2xs'
                  : 'text-slate-400 hover:text-[#00288e] hover:bg-slate-50 border-slate-200/60 hover:border-slate-300'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#00288e]' : ''}`} />
            </button>
          </div>

          {/* Metadata Metrics Row */}
          <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-2 text-xs sm:text-sm text-slate-700 pt-1.5 pb-0.5 border-t border-slate-100">
            <div className="flex items-center gap-1.5 font-medium text-slate-600">
              <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
              <span>{experience}</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-[#006a61]">
              <Banknote className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#006a61] shrink-0" />
              <span className="text-xs sm:text-sm lg:text-base">{formattedSalary}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
              <span>{primaryLocation || location}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#00288e] font-semibold text-[11px] sm:text-xs border border-blue-100">
                {effectiveWorkplace}
              </span>
            </div>
          </div>

          {/* Snippet / Description (if available) */}
          {displaySnippet && (
            <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
              {displaySnippet}
            </p>
          )}

          {/* Skill Tags & Actions Bottom Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 sm:pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5">
              {displayedSkills.map((skill, index) => (
                <span
                  key={index}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] sm:text-xs font-medium border border-slate-200/80 transition-colors"
                >
                  {skill}
                </span>
              ))}
              {remainingCount > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-[11px] sm:text-xs font-semibold">
                  +{remainingCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <span className="text-[11px] sm:text-xs text-slate-400 font-medium">{postedAgo}</span>
              <Link
                to={jobLink}
                className="min-h-[38px] sm:min-h-[42px] inline-flex items-center justify-center px-4 sm:px-6 py-2 rounded-xl bg-[#00288e] hover:bg-[#1e40af] text-white text-xs sm:text-sm font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer"
              >
                <span>View Job →</span>
              </Link>
            </div>
          </div>
        </div>
      </article>
    );
  }

  // DEFAULT / COMPACT GRID VARIANT
  return (
    <div
      onClick={(e) => {
        if (!e.target.closest('button') && !e.target.closest('a')) {
          navigate(jobLink);
        }
      }}
      className={`bg-white rounded-2xl p-3.5 sm:p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:shadow-[0_12px_24px_rgba(0,40,142,0.06)] hover:border-blue-200/90 border border-slate-200/90 transition-all duration-200 flex flex-col justify-between gap-3 sm:gap-4 group overflow-hidden h-full cursor-pointer ${className}`}
    >
      <div className="flex flex-col gap-3">
        {/* Top Header: Company Info, Posted Date & Bookmark */}
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
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-slate-900 truncate block">{companyDisplayName}</span>
                {isVerified && (
                  <CheckCircle2
                    className="w-3.5 h-3.5 text-[#00288e] shrink-0 fill-[#00288e]/10"
                    title="Verified Employer"
                  />
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span className="truncate">{departmentDisplay || 'Professional Services'}</span>
                <span className="text-slate-300">•</span>
                <span className="shrink-0 text-slate-400 text-[11px]">{postedAgo}</span>
              </div>
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
            className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0 border cursor-pointer ${
              isSaved
                ? 'text-[#00288e] bg-blue-50/90 border-blue-200 shadow-2xs'
                : 'text-slate-400 hover:text-[#00288e] hover:bg-slate-50 border-slate-200/60 hover:border-slate-300'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#00288e]' : ''}`} />
          </button>
        </div>

        {/* Job Title & Optional Recommended Badge */}
        <div className="flex flex-col gap-1 min-h-[3.25rem] justify-center">
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
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                {badge}
              </span>
            </div>
          ) : null}
          <Link to={jobLink} className="block group/title">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover/title:text-[#00288e] transition-colors line-clamp-2 tracking-tight leading-snug">
              {title}
            </h3>
          </Link>
        </div>

        {/* Metadata row: Location, Experience, Workplace Type */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs sm:text-sm text-slate-600 pt-0.5">
          <span className="inline-flex items-center gap-1 font-medium">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate max-w-[130px]">{location}</span>
          </span>
          <span className="text-slate-300">•</span>
          <span className="inline-flex items-center gap-1 font-medium">
            <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{experience}</span>
          </span>
          <span className="text-slate-300">•</span>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#00288e] font-semibold text-xs border border-blue-100">
            {effectiveWorkplace}
          </span>
        </div>

        {/* Skills Tag Pills */}
        <div className="flex flex-wrap gap-1.5 pt-1 min-h-[1.75rem]">
          {skillList && skillList.length > 0 ? (
            <>
              {displayedSkills.slice(0, 3).map((skill, index) => (
                <span
                  key={index}
                  className="px-2.5 py-1 rounded-md bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200/70"
                >
                  {skill}
                </span>
              ))}
              {skillList.length > 3 && (
                <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-500 text-xs font-semibold">
                  +{skillList.length - 3}
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-slate-400 italic">Core industry competencies</span>
          )}
        </div>
      </div>

      {/* Bottom Bar: Salary Bracket & View Job CTA */}
      <div className="pt-3.5 flex items-center justify-between bg-slate-50/90 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 px-5 sm:px-6 py-3.5 border-t border-slate-100">
        <div className="min-w-0 pr-2">
          <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Salary</div>
          <div className="text-sm sm:text-base font-extrabold text-[#00288e] truncate">{formattedSalary}</div>
        </div>
        <div className="shrink-0">
          <Link
            to={jobLink}
            className="min-h-[44px] inline-flex items-center justify-center bg-[#00288e] hover:bg-[#1e40af] text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl transition-colors shadow-2xs hover:shadow-xs cursor-pointer"
          >
            View Job
          </Link>
        </div>
      </div>
    </div>
  );
};

export default JobCard;
