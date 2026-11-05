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
 * - Strict aspect ratio preservation (no stretch, skew, or letter distortion)
 * - Explicit width/height metadata to prevent Cumulative Layout Shift (CLS)
 * - Guaranteed valid Tailwind classes and responsive max-width bounds to prevent mobile blowouts
 * - Accessible focus rings with visible outline for keyboard users
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
    'v-wordmark': 'h-6 sm:h-7 max-w-[110px] sm:max-w-[130px]',
    horizontal: 'h-6 sm:h-7 max-w-[110px] sm:max-w-[130px]',
    'v-symbol': 'h-6 w-6'
  },
  sm: {
    'v-wordmark': 'h-7 sm:h-8 max-w-[130px] sm:max-w-[145px]',
    horizontal: 'h-7 sm:h-8 max-w-[130px] sm:max-w-[145px]',
    'v-symbol': 'h-7 w-7 sm:h-8 sm:w-8'
  },
  md: {
    'v-wordmark': 'h-8 sm:h-9 max-w-[150px] sm:max-w-[170px]',
    horizontal: 'h-8 sm:h-9 max-w-[150px] sm:max-w-[170px]',
    'v-symbol': 'h-8 w-8 sm:h-9 sm:w-9'
  },
  lg: {
    'v-wordmark': 'h-9 sm:h-10 max-w-[170px] sm:max-w-[200px]',
    horizontal: 'h-9 sm:h-10 max-w-[170px] sm:max-w-[200px]',
    'v-symbol': 'h-10 w-10 sm:h-12 sm:w-12'
  },
  xl: {
    'v-wordmark': 'h-12 sm:h-14 max-w-[240px] sm:max-w-[280px]',
    horizontal: 'h-12 sm:h-14 max-w-[240px] sm:max-w-[280px]',
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
    // Responsive: Dedicated for public header.
    // Mobile: compact h-7 to h-8 (approx 85-96px width, max 135px).
    // Desktop: moderately increased h-10 to h-[42px] (~120-126px width, approx 20-25% larger than baseline h-8)
    // Perfectly utilizes left navigation space without height blowouts.
    const selectedAsset = onDark ? ASSET_PATHS['v-wordmark-white'] : ASSET_PATHS['v-wordmark'];
    content = (
      <img
        src={selectedAsset}
        alt={accessibleAlt}
        width={NATURAL_DIMENSIONS['v-wordmark'].width}
        height={NATURAL_DIMENSIONS['v-wordmark'].height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={`h-7 sm:h-8 md:h-9 lg:h-10 xl:h-[42px] w-auto max-w-[135px] sm:max-w-[155px] md:max-w-[175px] lg:max-w-[200px] object-contain shrink-0 select-none transition-all ${className}`}
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
    const sizeClass = currentSize[canonicalKey] || currentSize['v-wordmark'] || 'h-8 sm:h-9 max-w-[150px]';

    content = (
      <img
        src={assetPath}
        alt={accessibleAlt}
        width={dims.width}
        height={dims.height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={`${sizeClass} w-auto max-w-full object-contain shrink-0 select-none transition-all ${className}`}
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
