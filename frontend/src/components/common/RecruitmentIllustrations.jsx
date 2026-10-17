import React from 'react';

/**
 * Professional recruitment vector illustration for promotional modules & banners.
 * Designed with Vakancy.in brand colors (Deep Blue #00288e, Navy #0f172a, Sky #38bdf8, Soft Blue #eff6ff).
 */
export const RecruitmentSupportIllustration = ({ className = 'w-full h-auto max-w-[280px]' }) => (
  <svg
    viewBox="0 0 320 220"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Background Soft Glow */}
    <ellipse cx="160" cy="110" rx="140" ry="90" fill="#EFF6FF" />
    <circle cx="240" cy="50" r="28" fill="#DBEAFE" fillOpacity="0.5" />
    <circle cx="70" cy="160" r="20" fill="#E0E7FF" fillOpacity="0.6" />

    {/* Main Platform / Desk Shadow */}
    <ellipse cx="160" cy="180" rx="110" ry="12" fill="#E2E8F0" />

    {/* Central Tablet / Candidate Pipeline Screen */}
    <rect x="90" y="45" width="140" height="130" rx="14" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
    {/* Tablet Top Bar */}
    <path d="M90 59C90 51.268 96.268 45 104 45H216C223.732 45 230 51.268 230 59V64H90V59Z" fill="#0F172A" />
    <circle cx="105" cy="54" r="3" fill="#EF4444" />
    <circle cx="115" cy="54" r="3" fill="#F59E0B" />
    <circle cx="125" cy="54" r="3" fill="#10B981" />
    <rect x="150" y="52" width="60" height="5" rx="2.5" fill="#334155" />

    {/* Candidate Card 1 (Top Active) */}
    <g filter="drop-shadow(0 2px 4px rgba(15,23,42,0.06))">
      <rect x="104" y="74" width="112" height="38" rx="8" fill="#F8FAFC" stroke="#E2E8F0" />
      {/* Mini Avatar */}
      <circle cx="122" cy="93" r="11" fill="#DBEAFE" />
      <circle cx="122" cy="90" r="4.5" fill="#1E40AF" />
      <path d="M114 100C114 96.5 117.5 94.5 122 94.5C126.5 94.5 130 96.5 130 100H114Z" fill="#1E40AF" />
      {/* Text Lines */}
      <rect x="139" y="86" width="54" height="5" rx="2" fill="#0F172A" />
      <rect x="139" y="94" width="36" height="4" rx="2" fill="#94A3B8" />
      {/* Check Badge */}
      <circle cx="204" cy="93" r="5" fill="#00288e" />
      <path d="M202 93L203.5 94.5L206 91.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </g>

    {/* Candidate Card 2 (Bottom Pipeline) */}
    <rect x="104" y="118" width="112" height="38" rx="8" fill="#FFFFFF" stroke="#E2E8F0" />
    <circle cx="122" cy="137" r="11" fill="#FEF3C7" />
    <circle cx="122" cy="134" r="4.5" fill="#D97706" />
    <path d="M114 144C114 140.5 117.5 138.5 122 138.5C126.5 138.5 130 140.5 130 144H114Z" fill="#D97706" />
    <rect x="139" y="130" width="48" height="5" rx="2" fill="#1E293B" />
    <rect x="139" y="138" width="40" height="4" rx="2" fill="#94A3B8" />
    <circle cx="204" cy="137" r="5" fill="#10B981" />
    <path d="M202 137L203.5 138.5L206 135.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />

    {/* Left Floating Badge: "Shortlisted" */}
    <g>
      <rect x="36" y="80" width="76" height="30" rx="8" fill="#FFFFFF" stroke="#93C5FD" strokeWidth="1.5" />
      <circle cx="50" cy="95" r="6" fill="#00288e" />
      <path d="M48 95L49.5 96.5L52.5 93.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="61" y="90" width="42" height="4" rx="2" fill="#0F172A" />
      <rect x="61" y="96" width="28" height="3" rx="1.5" fill="#3B82F6" />
    </g>

    {/* Right Floating Badge: "Search Sourcing" */}
    <g>
      <rect x="212" y="115" width="80" height="32" rx="8" fill="#FFFFFF" stroke="#93C5FD" strokeWidth="1.5" />
      {/* Magnifier */}
      <circle cx="228" cy="131" r="5" stroke="#00288e" strokeWidth="1.5" />
      <line x1="232" y1="135" x2="236" y2="139" stroke="#00288e" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="242" y="126" width="40" height="4" rx="2" fill="#0F172A" />
      <rect x="242" y="133" width="26" height="3" rx="1.5" fill="#10B981" />
    </g>

    {/* Decorative Sparkles & Rings */}
    <circle cx="78" cy="65" r="2.5" fill="#3B82F6" />
    <circle cx="248" cy="85" r="2" fill="#60A5FA" />
    <path d="M255 42L257 47L262 49L257 51L255 56L253 51L248 49L253 47L255 42Z" fill="#00288e" />
  </svg>
);
