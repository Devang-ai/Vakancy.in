import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

/**
 * BrandLogo — Centralized Branding Component for Admin Portal
 *
 * Prepares the platform for future SVG/PNG logo asset drops without breaking
 * current layouts. When official brand assets arrive, toggle `useImageAsset = true`.
 */
export const BrandLogo = ({
  variant = 'default',
  size = 'md',
  to = '/dashboard',
  showPortalTag = true,
  className = ''
}) => {
  const sizeMap = {
    sm: { icon: 'w-7 h-7 text-xs rounded-lg', text: 'text-sm', sub: 'text-[9px]' },
    md: { icon: 'w-9 h-9 text-sm rounded-xl', text: 'text-base', sub: 'text-[10px]' },
    lg: { icon: 'w-11 h-11 text-base rounded-2xl', text: 'text-xl', sub: 'text-xs' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  const logoContent = (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Icon Mark Badge (Future SVG target: /public/brand/admin-logo-mark.svg) */}
      <div
        className={`${currentSize.icon} bg-blue-800 text-white font-extrabold flex items-center justify-center shadow-xs tracking-tight shrink-0`}
      >
        <Shield className="w-5 h-5" />
      </div>

      {variant !== 'mark-only' && (
        <div className="flex flex-col leading-tight">
          <span className={`font-extrabold tracking-tight font-heading text-slate-900 ${currentSize.text}`}>
            Vakancy<span className="text-blue-700">.in</span> Admin
          </span>
          {showPortalTag && (
            <span className={`text-slate-500 font-semibold uppercase tracking-wider ${currentSize.sub}`}>
              Internal Recruitment Portal
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (!to) {
    return logoContent;
  }

  return (
    <Link to={to} className="inline-flex items-center hover:opacity-95 transition-opacity">
      {logoContent}
    </Link>
  );
};

export default BrandLogo;
