import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/**
 * SectionHeader Component
 * Standardized executive heading component with eyebrow badge, title, subtitle, and optional link.
 */
export const SectionHeader = ({
  badge,
  title,
  subtitle,
  actionText,
  actionHref,
  centered = false,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 ${
        centered ? 'text-center md:items-center' : ''
      } ${className}`}
    >
      <div className={`max-w-2xl ${centered ? 'mx-auto' : ''}`}>
        {badge && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/20 mb-3">
            {badge}
          </div>
        )}
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-surface-100 font-sans">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 text-sm sm:text-base text-surface-400 leading-relaxed font-normal">
            {subtitle}
          </p>
        )}
      </div>

      {actionText && actionHref && (
        <Link
          to={actionHref}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-400 hover:text-brand-300 transition-colors shrink-0 group self-start md:self-end"
        >
          <span>{actionText}</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
};

export default SectionHeader;
