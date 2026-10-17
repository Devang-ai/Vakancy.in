import React, { useRef, useEffect, useState } from 'react';

// A utility hook to detect if a user has prefers-reduced-motion enabled
export const useReducedMotion = () => {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handler = (e) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  return reducedMotion;
};

// Intersection observer hook
const useIntersection = (ref, threshold = 0.1) => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, [threshold, ref]);
  return isVisible;
};

// Base motion component
export const RevealOnScroll = ({ children, className = '', delay = 0, threshold = 0.1, y = 24 }) => {
  const ref = useRef(null);
  const isVisible = useIntersection(ref, threshold);
  const isReduced = useReducedMotion();

  const style = isReduced
    ? { opacity: isVisible ? 1 : 0, transition: `opacity 500ms ease-out ${delay}ms` }
    : {
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : `translateY(${y}px)`,
        transition: `opacity 700ms ease-out ${delay}ms, transform 700ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`
      };

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
};

export const FadeInSection = ({ children, className = '', delay = 0 }) => {
  const ref = useRef(null);
  const isVisible = useIntersection(ref, 0.1);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transition: `opacity 800ms ease-in-out ${delay}ms`
      }}
    >
      {children}
    </div>
  );
};

export const StaggerContainer = ({ children, className = '' }) => {
  // Staggering happens by mapping over children and injecting a delay if they are StaggerItem
  // But a simple CSS approach is better for arbitrary children. We'll pass an index manually or use a wrapper.
  return <div className={className}>{children}</div>;
};

export const StaggerItem = ({ children, index = 0, delay = 100, className = '' }) => {
  return (
    <RevealOnScroll className={className} delay={index * delay} y={16}>
      {children}
    </RevealOnScroll>
  );
};

export const PageTransition = ({ children, className = '' }) => {
  const [mounted, setMounted] = useState(false);
  const isReduced = useReducedMotion();
  useEffect(() => {
    setMounted(true);
  }, []);

  const style = isReduced
    ? { opacity: mounted ? 1 : 0, transition: 'opacity 300ms ease-in' }
    : {
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 400ms ease-out, transform 400ms cubic-bezier(0.16, 1, 0.3, 1)'
      };

  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
};
