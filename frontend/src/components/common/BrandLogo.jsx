import { Link } from 'react-router-dom';

/**
 * BrandLogo — Centralized Approved Brand Logo Component for Vakancy.in
 *
 * Implements the approved brand decision:
 * - Primary Brand: Horizontal V-arrow symbol + Vakancy.in wordmark (3:1, 2172x724)
 * - On Dark Brand: Horizontal V-arrow wordmark with high-contrast white arrow
 * - Mobile Brand: Compact horizontal V-arrow + Vakancy.in wordmark (Vakancy.in remains visible)
 * - Standalone Symbol: V-arrow brand icon (1:1, 1254x1254) for favicons & compact badges
 *
 * Features:
 * - Strict aspect ratio preservation (no stretch, skew, or facial/letter distortion)
 * - Explicit width/height metadata to prevent Cumulative Layout Shift (CLS)
 * - Accessible focus rings with visible outline for keyboard users
 * - Full compliance with WCAG contrast and responsive sizing standards
 */

const ASSET_PATHS = {
  'v-wordmark': '/assets/brand/vakancy-wordmark.png',
  'horizontal': '/assets/brand/vakancy-wordmark.png',
  'v-wordmark-white': '/assets/brand/vakancy-wordmark-white-arrow.png',
  'global-full': '/assets/brand/vakancy-wordmark.png',
  'stacked': '/assets/brand/vakancy-wordmark.png',
  'v-symbol': '/assets/brand/vakancy-v-symbol.png',
  'symbol-v': '/assets/brand/vakancy-v-symbol.png'
};

const NATURAL_DIMENSIONS = {
  'v-wordmark': { width: 2172, height: 724, aspect: '3/1' },
  'horizontal': { width: 2172, height: 724, aspect: '3/1' },
  'v-wordmark-white': { width: 2172, height: 724, aspect: '3/1' },
  'global-full': { width: 2172, height: 724, aspect: '3/1' },
  'stacked': { width: 2172, height: 724, aspect: '3/1' },
  'v-symbol': { width: 1254, height: 1254, aspect: '1/1' },
  'symbol-v': { width: 1254, height: 1254, aspect: '1/1' }
};

const SIZE_PRESETS = {
  xs: {
    'v-wordmark': 'h-6.5 sm:h-7',
    horizontal: 'h-6.5 sm:h-7',
    'v-symbol': 'h-6 w-6'
  },
  sm: {
    'v-wordmark': 'h-7.5 sm:h-8',
    horizontal: 'h-7.5 sm:h-8',
    'v-symbol': 'h-7 w-7 sm:h-8 sm:w-8'
  },
  md: {
    'v-wordmark': 'h-8.5 sm:h-9.5 lg:h-10.5',
    horizontal: 'h-8.5 sm:h-9.5 lg:h-10.5',
    'v-symbol': 'h-8 w-8 sm:h-9 sm:w-9'
  },
  lg: {
    'v-wordmark': 'h-10.5 sm:h-11.5 lg:h-12.5',
    horizontal: 'h-10.5 sm:h-11.5 lg:h-12.5',
    'v-symbol': 'h-10 w-10 sm:h-12 sm:w-12'
  },
  xl: {
    'v-wordmark': 'h-14 sm:h-16 lg:h-20',
    horizontal: 'h-14 sm:h-16 lg:h-20',
    'v-symbol': 'h-14 w-14 sm:h-16 sm:w-16'
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

  const defaultAlt =
    variant === 'v-symbol' || variant === 'symbol-v'
      ? 'Vakancy.in Brand Symbol'
      : 'Vakancy.in - Global Recruitment Platform';

  const accessibleAlt = alt || defaultAlt;

  let content;

  if (variant === 'responsive') {
    // Responsive: Shows full horizontal V-arrow wordmark on BOTH mobile & desktop.
    // Mobile: compact h-7 to h-8 (Vakancy.in remains fully readable).
    // Desktop: moderately larger h-9 to h-10 for high-clarity enterprise presence.
    const selectedAsset = onDark ? ASSET_PATHS['v-wordmark-white'] : ASSET_PATHS['v-wordmark'];
    content = (
      <img
        src={selectedAsset}
        alt={accessibleAlt}
        width={NATURAL_DIMENSIONS['v-wordmark'].width}
        height={NATURAL_DIMENSIONS['v-wordmark'].height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={`h-8 sm:h-8.5 md:h-9.5 lg:h-10.5 w-auto max-w-full object-contain shrink-0 select-none transition-opacity ${className}`}
      />
    );
  } else {
    const canonicalKey =
      variant === 'symbol-v' ? 'v-symbol' :
        (variant === 'v-symbol') ? 'v-symbol' :
          'v-wordmark';

    const assetPath = onDark && canonicalKey === 'v-wordmark'
      ? ASSET_PATHS['v-wordmark-white']
      : (ASSET_PATHS[canonicalKey] || ASSET_PATHS['v-wordmark']);

    const dims = NATURAL_DIMENSIONS[canonicalKey] || NATURAL_DIMENSIONS['v-wordmark'];
    const sizeClass = currentSize[canonicalKey] || currentSize['v-wordmark'] || 'h-8 sm:h-9 lg:h-10';

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

  // If on dark surface without dedicated white-arrow asset, wrap in a subtle high-contrast pill
  if (onDark && variant !== 'v-wordmark-white') {
    content = (
      <div className="inline-flex items-center justify-center bg-white/95 backdrop-blur-sm px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-white/20 shadow-xs">
        {content}
      </div>
    );
  }

  if (to) {
    return (
      <Link
        to={to}
        onClick={onClick}
        aria-label="Vakancy.in - Global Recruitment Platform Homepage"
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
