import React from 'react';

/**
 * Professional recruitment profile avatars
 * Modern, polished SVG illustrations crafted for recruitment and talent platforms (Naukri-inspired).
 */

export const RecruitmentAvatar = ({ type, className = '' }) => {
  // Individual Avatar SVGs
  const MaleRecruiterSVG = ({ size = 48, className: svgClass = '' }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`rounded-full shrink-0 ${svgClass}`}
    >
      <circle cx="24" cy="24" r="24" fill="#EBF2FE" />
      <circle cx="24" cy="24" r="23" stroke="#93C5FD" strokeWidth="2" />
      {/* Hair back */}
      <path d="M14 21C14 14.5 18 10 24 10C30 10 34 14.5 34 21V24H14V21Z" fill="#1E293B" />
      {/* Neck */}
      <rect x="21" y="27" width="6" height="7" rx="1" fill="#C68B59" />
      {/* Face */}
      <ellipse cx="24" cy="20.5" rx="7.5" ry="8.5" fill="#D99B74" />
      {/* Hair front/style */}
      <path d="M16.5 17C18 13.5 22 11.5 27 12C31 12.5 32 15 32 17C30 15 27 14.5 24 15C20.5 15.5 17.5 17 16.5 17Z" fill="#0F172A" />
      {/* Eyes */}
      <circle cx="21.5" cy="20" r="1" fill="#1E293B" />
      <circle cx="26.5" cy="20" r="1" fill="#1E293B" />
      {/* Smile */}
      <path d="M22 23.5C23 24.3 25 24.3 26 23.5" stroke="#9A3412" strokeWidth="1" strokeLinecap="round" />
      {/* Blazer & Shirt */}
      <path d="M11 44C11 36 15 32 20 32L24 37L28 32C33 32 37 36 37 44H11Z" fill="#1E40AF" />
      <path d="M21 32L24 37L27 32L25 44H23L21 32Z" fill="#FFFFFF" />
      <path d="M23.5 34L24 37L24.5 34" stroke="#DC2626" strokeWidth="1" />
    </svg>
  );

  const FemaleExecutiveSVG = ({ size = 48, className: svgClass = '' }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`rounded-full shrink-0 ${svgClass}`}
    >
      <circle cx="24" cy="24" r="24" fill="#F0FDFA" />
      <circle cx="24" cy="24" r="23" stroke="#99F6E4" strokeWidth="2" />
      {/* Long hair back */}
      <path d="M13 22C13 14 17.5 9 24 9C30.5 9 35 14 35 22C35 27 33 33 31 36H17C15 33 13 27 13 22Z" fill="#1E293B" />
      {/* Neck */}
      <rect x="21" y="27" width="6" height="7" rx="1" fill="#C68B59" />
      {/* Face */}
      <ellipse cx="24" cy="20" rx="7" ry="8" fill="#E0A97E" />
      {/* Hair front waves */}
      <path d="M17 17C19 13 23 11 27 12C32 13 32 16 33 19C30 16 26 15 23 16C19 17 17 19 17 17Z" fill="#0F172A" />
      {/* Eyes & brows */}
      <circle cx="21" cy="19.5" r="1" fill="#1E293B" />
      <circle cx="27" cy="19.5" r="1" fill="#1E293B" />
      <path d="M20 18C20.8 17.5 22 17.6 22.5 18" stroke="#1E293B" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M25.5 18C26 17.6 27.2 17.5 28 18" stroke="#1E293B" strokeWidth="0.8" strokeLinecap="round" />
      {/* Soft smile */}
      <path d="M22 23C23 23.8 25 23.8 26 23" stroke="#C2410C" strokeWidth="1.2" strokeLinecap="round" />
      {/* Professional blazer */}
      <path d="M12 44C12 36 16 32 21 32L24 36L27 32C32 32 36 36 36 44H12Z" fill="#0F766E" />
      <path d="M21 32L24 37L27 32C26 34 25.5 37 24 37C22.5 37 22 34 21 32Z" fill="#F8FAFC" />
    </svg>
  );

  const HiringLeadSVG = ({ size = 48, className: svgClass = '' }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`rounded-full shrink-0 ${svgClass}`}
    >
      <circle cx="24" cy="24" r="24" fill="#F8FAFC" />
      <circle cx="24" cy="24" r="23" stroke="#CBD5E1" strokeWidth="2" />
      {/* Hair */}
      <path d="M15 19C15 13.5 18.5 10 24 10C29.5 10 33 13.5 33 19V22H15V19Z" fill="#334155" />
      {/* Neck */}
      <rect x="21" y="27" width="6" height="7" rx="1" fill="#C68B59" />
      {/* Face */}
      <ellipse cx="24" cy="20.5" rx="7.5" ry="8.5" fill="#D49B6A" />
      {/* Glasses */}
      <rect x="18" y="18" width="5" height="4" rx="1.5" stroke="#1E40AF" strokeWidth="1.2" fill="none" />
      <rect x="25" y="18" width="5" height="4" rx="1.5" stroke="#1E40AF" strokeWidth="1.2" fill="none" />
      <line x1="23" y1="20" x2="25" y2="20" stroke="#1E40AF" strokeWidth="1.2" />
      {/* Smile */}
      <path d="M22 24C23 24.7 25 24.7 26 24" stroke="#7C2D12" strokeWidth="1" strokeLinecap="round" />
      {/* Executive Suit */}
      <path d="M11 44C11 36 15 32 20 32L24 36L28 32C33 32 37 36 37 44H11Z" fill="#334155" />
      <path d="M21 32L24 37L27 32L25 44H23L21 32Z" fill="#60A5FA" />
    </svg>
  );

  const CandidateSVG = ({ size = 48, className: svgClass = '' }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`rounded-full shrink-0 ${svgClass}`}
    >
      <circle cx="24" cy="24" r="24" fill="#EFF6FF" />
      <circle cx="24" cy="24" r="23" stroke="#60A5FA" strokeWidth="2" strokeDasharray="3 3" />
      {/* Hair */}
      <path d="M14 20C14 13 18.5 9 24 9C29.5 9 34 13 34 20C34 24 33 27 32 30H16C15 27 14 24 14 20Z" fill="#0F172A" />
      {/* Neck */}
      <rect x="21" y="27" width="6" height="7" rx="1" fill="#C68B59" />
      {/* Face */}
      <ellipse cx="24" cy="20.5" rx="7.2" ry="8.2" fill="#E2A676" />
      {/* Eyes */}
      <circle cx="21" cy="20" r="1.1" fill="#0F172A" />
      <circle cx="27" cy="20" r="1.1" fill="#0F172A" />
      {/* Smile */}
      <path d="M21.5 24C23 25 25 25 26.5 24" stroke="#9A3412" strokeWidth="1.2" strokeLinecap="round" />
      {/* Attire */}
      <path d="M12 44C12 36 16 32.5 21 32.5L24 35.5L27 32.5C32 32.5 36 36 36 44H12Z" fill="#2563EB" />
      <path d="M22 33L24 36L26 33L24.8 44H23.2L22 33Z" fill="#FFFFFF" />
    </svg>
  );

  const MiniAvatar1 = ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className="rounded-full shadow-xs">
      <circle cx="16" cy="16" r="16" fill="#DBEAFE" />
      <circle cx="16" cy="14" r="6" fill="#C68B59" />
      <path d="M10 12C10 8 12.5 6 16 6C19.5 6 22 8 22 12V14H10V12Z" fill="#1E293B" />
      <path d="M7 30C7 24 10 21 16 21C22 21 25 24 25 30H7Z" fill="#1E40AF" />
    </svg>
  );

  const MiniAvatar2 = ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className="rounded-full shadow-xs">
      <circle cx="16" cy="16" r="16" fill="#CCFBF1" />
      <circle cx="16" cy="14" r="5.8" fill="#E0A97E" />
      <path d="M9 13C9 8 12 6 16 6C20 6 23 8 23 13C23 16 22 19 21 21H11C10 19 9 16 9 13Z" fill="#0F172A" />
      <path d="M8 30C8 24 11 21 16 21C21 21 24 24 24 30H8Z" fill="#0D9488" />
    </svg>
  );

  const MiniAvatar3 = ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className="rounded-full shadow-xs">
      <circle cx="16" cy="16" r="16" fill="#F1F5F9" />
      <circle cx="16" cy="14" r="5.8" fill="#D49B6A" />
      <path d="M10.5 12C10.5 8 13 6 16 6C19 6 21.5 8 21.5 12V14H10.5V12Z" fill="#475569" />
      <path d="M8 30C8 24 11 21 16 21C21 21 24 24 24 30H8Z" fill="#3B82F6" />
    </svg>
  );

  // Card 1: Single Recruiter Avatar
  if (type === 'recruiter-male') {
    return (
      <div className={`relative inline-flex items-center ${className}`}>
        <div className="relative rounded-full ring-3 ring-blue-100 shadow-xs">
          <MaleRecruiterSVG size={48} />
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" title="Active Specialist" />
        </div>
      </div>
    );
  }

  // Card 2: Professional Employer / Corporate Rep Avatar
  if (type === 'employer-female') {
    return (
      <div className={`relative inline-flex items-center ${className}`}>
        <div className="relative rounded-full ring-3 ring-teal-100 shadow-xs">
          <FemaleExecutiveSVG size={48} />
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full" title="Verified Representative" />
        </div>
      </div>
    );
  }

  // Card 3: Hiring Lead / Operations Avatar
  if (type === 'hiring-manager') {
    return (
      <div className={`relative inline-flex items-center ${className}`}>
        <div className="relative rounded-full ring-3 ring-slate-100 shadow-xs">
          <HiringLeadSVG size={48} />
          <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-[#00288e] text-white font-bold text-[9px] rounded-full border border-white shadow-2xs">
            HR
          </span>
        </div>
      </div>
    );
  }

  // Card 4: Recruiter Duo (Overlapping Collaborators)
  if (type === 'recruiter-duo') {
    return (
      <div className={`relative inline-flex items-center -space-x-4 ${className}`}>
        <div className="relative z-10 rounded-full border-2 border-white shadow-xs">
          <FemaleExecutiveSVG size={44} />
        </div>
        <div className="relative z-20 rounded-full border-2 border-white shadow-xs">
          <MaleRecruiterSVG size={44} />
        </div>
        <div className="relative z-30 -ml-2 self-end">
          <span className="px-1.5 py-0.5 bg-blue-600 text-white font-bold text-[9px] rounded-full border border-white shadow-2xs">
            Team
          </span>
        </div>
      </div>
    );
  }

  // Card 5: Candidate Profile Avatar (Talent Discovery)
  if (type === 'candidate-profile') {
    return (
      <div className={`relative inline-flex items-center ${className}`}>
        <div className="relative rounded-full ring-3 ring-sky-100 shadow-xs">
          <CandidateSVG size={48} />
          <span className="absolute bottom-0 right-0 w-4 h-4 bg-[#00288e] text-white border-2 border-white rounded-full flex items-center justify-center text-[9px] font-bold" title="Verified Talent">
            ✓
          </span>
        </div>
      </div>
    );
  }

  // Card 6: Centralized Activity Team Cluster
  if (type === 'team-cluster') {
    return (
      <div className={`relative inline-flex items-center -space-x-3.5 ${className}`}>
        <div className="relative z-10 rounded-full border-2 border-white shadow-xs">
          <MiniAvatar1 size={38} />
        </div>
        <div className="relative z-20 rounded-full border-2 border-white shadow-xs">
          <MiniAvatar2 size={38} />
        </div>
        <div className="relative z-30 rounded-full border-2 border-white shadow-xs">
          <MiniAvatar3 size={38} />
        </div>
      </div>
    );
  }

  // Fallback
  return <MaleRecruiterSVG size={48} className={className} />;
};

export default RecruitmentAvatar;
