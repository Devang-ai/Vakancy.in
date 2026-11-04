import React from 'react';
import { Link } from 'react-router-dom';

/**
 * BrandLogo — Centralized Approved Logo Component for Vakancy.in
 *
 * Implements the approved brand assets inventory:
 * - 'global-full'  : Approved full Globe + Vakancy.in stacked composition (4:3, 1448x1086, /assets/brand/vakancy-global-logo.png)
 * - 'v-wordmark'   : Full horizontal Vakancy.in wordmark with V-arrow symbol (3:1, 2172x724, /assets/brand/vakancy-logo-horizontal.png)
 * - 'v-symbol'     : Standalone V-arrow brand symbol (1:1, 1254x1254, /assets/brand/vakancy-symbol-v.png)
 * - 'symbol-globe' : Standalone Globe symbol (1:1, 1254x1254, /assets/brand/vakancy-symbol-globe.png)
 * - 'responsive'   : Desktop (>=768px) -> 'global-full'; Mobile (<768px) -> 'v-symbol' (preserves approved compact mobile header)
 *
 * Features:
 * - Natural aspect ratio preservation (no stretch, distortion, or compression)
 * - Accessible single-element rendering (no redundant screen-reader announcements)
 * - Explicit dimensions & object-contain to prevent CLS
 * - Accessible focus rings when wrapped in a link
 * - Optional onDark surface wrapper for dark backgrounds to maintain contrast
 */

const ASSET_PATHS = {
  'global-full': '/assets/brand/vakancy-global-logo.png',
  'stacked': '/assets/brand/vakancy-global-logo.png',
  'v-wordmark': '/assets/brand/vakancy-logo-horizontal.png',
  'horizontal': '/assets/brand/vakancy-logo-horizontal.png',
  'v-symbol': '/assets/brand/vakancy-symbol-v.png',
  'symbol-v': '/assets/brand/vakancy-symbol-v.png',
  'symbol-globe': '/assets/brand/vakancy-symbol-globe.png'
};

const NATURAL_DIMENSIONS = {
  'global-full': { width: 1448, height: 1086, aspect: '4/3' },
  'stacked': { width: 1448, height: 1086, aspect: '4/3' },
  'v-wordmark': { width: 2172, height: 724, aspect: '3/1' },
  'horizontal': { width: 2172, height: 724, aspect: '3/1' },
  'v-symbol': { width: 1254, height: 1254, aspect: '1/1' },
  'symbol-v': { width: 1254, height: 1254, aspect: '1/1' },
  'symbol-globe': { width: 1254, height: 1254, aspect: '1/1' }
};

const SIZE_PRESETS = {
  xs: {
    'global-full': 'h-8 sm:h-9',
    stacked: 'h-8 sm:h-9',
    'v-wordmark': 'h-6 sm:h-7',
    horizontal: 'h-6 sm:h-7',
    'v-symbol': 'h-6 w-6',
    'symbol-v': 'h-6 w-6',
    'symbol-globe': 'h-6 w-6'
  },
  sm: {
    'global-full': 'h-10 sm:h-11',
    stacked: 'h-10 sm:h-11',
    'v-wordmark': 'h-7 sm:h-8',
    horizontal: 'h-7 sm:h-8',
    'v-symbol': 'h-7 w-7 sm:h-8 sm:w-8',
    'symbol-v': 'h-7 w-7 sm:h-8 sm:w-8',
    'symbol-globe': 'h-7 w-7 sm:h-8 sm:w-8'
  },
  md: {
    'global-full': 'h-12 sm:h-13 lg:h-14',
    stacked: 'h-12 sm:h-13 lg:h-14',
    'v-wordmark': 'h-8 sm:h-9 lg:h-10',
    horizontal: 'h-8 sm:h-9 lg:h-10',
    'v-symbol': 'h-8 w-8 sm:h-9 sm:w-9',
    'symbol-v': 'h-8 w-8 sm:h-9 sm:w-9',
    'symbol-globe': 'h-8 w-8 sm:h-9 sm:w-9'
  },
  lg: {
    'global-full': 'h-16 sm:h-20',
    stacked: 'h-16 sm:h-20',
    'v-wordmark': 'h-10 sm:h-11 lg:h-12',
    horizontal: 'h-10 sm:h-11 lg:h-12',
    'v-symbol': 'h-10 w-10 sm:h-12 sm:w-12',
    'symbol-v': 'h-10 w-10 sm:h-12 sm:w-12',
    'symbol-globe': 'h-10 w-10 sm:h-12 sm:w-12'
  },
  xl: {
    'global-full': 'h-24 sm:h-28',
    stacked: 'h-24 sm:h-28',
    'v-wordmark': 'h-14 sm:h-16',
    horizontal: 'h-14 sm:h-16',
    'v-symbol': 'h-14 w-14 sm:h-16 sm:w-16',
    'symbol-v': 'h-14 w-14 sm:h-16 sm:w-16',
    'symbol-globe': 'h-14 w-14 sm:h-16 sm:w-16'
  }
};

export const BrandLogo = ({
  variant = 'v-wordmark',
  size = 'md',
  to = '/',
  alt,
  className = '',
  onClick,
  priority = true,
  onDark = false
}) => {
  const currentSize = SIZE_PRESETS[size] || SIZE_PRESETS.md;

  // Determine accessible alt text
  const defaultAlt =
    variant === 'v-symbol' || variant === 'symbol-v'
      ? 'Vakancy.in Brand Symbol'
      : variant === 'symbol-globe'
      ? 'Vakancy.in Globe'
      : variant === 'global-full' || variant === 'stacked'
      ? 'Vakancy.in Global Recruitment'
      : 'Vakancy.in - Recruitment Platform';

  const accessibleAlt = alt || defaultAlt;

  // Core image rendering
  let content;

  if (variant === 'responsive') {
    // Single picture element with media query —
    // Mobile (<768px): approved compact V-symbol (h-8 w-8, 32px)
    // Desktop (>=768px): approved full Globe + Vakancy.in logo (h-12 to h-14, auto width)
    content = (
      <picture className="inline-flex items-center shrink-0 select-none">
        <source media="(max-width: 767px)" srcSet={ASSET_PATHS['v-symbol']} />
        <img
          src={ASSET_PATHS['global-full']}
          alt={accessibleAlt}
          width={NATURAL_DIMENSIONS['global-full'].width}
          height={NATURAL_DIMENSIONS['global-full'].height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className={`h-8 w-8 md:h-12 md:w-auto lg:h-14 object-contain shrink-0 transition-opacity ${className}`}
        />
      </picture>
    );
  } else {
    const canonicalKey =
      variant === 'horizontal' ? 'v-wordmark' :
      variant === 'stacked' ? 'global-full' :
      variant === 'symbol-v' ? 'v-symbol' :
      variant;

    const assetPath = ASSET_PATHS[canonicalKey] || ASSET_PATHS['v-wordmark'];
    const dims = NATURAL_DIMENSIONS[canonicalKey] || NATURAL_DIMENSIONS['v-wordmark'];
    const sizeClass = currentSize[canonicalKey] || currentSize['v-wordmark'];

    content = (
      <img
        src={assetPath}
        alt={accessibleAlt}
        width={dims.width}
        height={dims.height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={`${sizeClass} w-auto max-w-full object-contain shrink-0 select-none transition-opacity ${className}`}
      />
    );
  }

  // If on dark background, wrap in a subtle high-contrast light pill surface
  if (onDark) {
    content = (
      <div className="inline-flex items-center justify-center bg-white/95 backdrop-blur-sm px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-white/20 shadow-xs">
        {content}
      </div>
    );
  }

  // If link is requested
  if (to) {
    return (
      <Link
        to={to}
        onClick={onClick}
        aria-label="Vakancy.in Homepage"
        className="inline-flex items-center shrink-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00288e] focus-visible:ring-offset-2 hover:opacity-90 active:opacity-80 transition-all select-none"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="inline-flex items-center shrink-0 select-none" onClick={onClick}>
      {content}
    </div>
  );
};

export default BrandLogo;
