import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * ScrollToTop Component
 * Ensures predictable, accessible scroll management across all route transitions.
 * - Starts top on standard navigation (PUSH / REPLACE to new paths)
 * - Preserves native scroll position on browser Back/Forward (POP)
 * - Smoothly scrolls to explicit hash targets (#enquiry-form, #applicationPane, etc.)
 * - Respects prefers-reduced-motion
 */
export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation();
  const navType = useNavigationType();
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    // 1. If explicit hash target is present, scroll smoothly to target
    if (hash) {
      const targetId = hash.replace(/^#/, '');
      const element = document.getElementById(targetId);
      if (element) {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        element.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'start',
        });
        prevPathRef.current = pathname;
        return;
      }
    }

    // 2. For browser back/forward history navigation (POP), let the browser handle position restoration
    if (navType === 'POP') {
      prevPathRef.current = pathname;
      return;
    }

    // 3. For PUSH or REPLACE to a different page path, scroll instantly to top
    if (prevPathRef.current !== pathname || !hash) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant',
      });
    }

    prevPathRef.current = pathname;
  }, [pathname, hash, navType]);

  return null;
}
