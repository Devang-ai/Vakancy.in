import React, { useState, useEffect, useRef } from 'react';

/**
 * JobCategoryAutocomplete
 * Single-select searchable autocomplete input component for Job Category / Domain
 * Standardized for Vakancy.in Employer Job Creation flow.
 */

// Fallback Master Categories List in case API is offline
const DEFAULT_MASTER_CATEGORIES = [
  { id: 'cat00000-0000-0000-0000-000000000001', name: 'Software Engineering', slug: 'software-engineering' },
  { id: 'cat-software-dev', name: 'Software Development', slug: 'software-development' },
  { id: 'cat-software-qa', name: 'Software Testing / QA', slug: 'software-testing-qa' },
  { id: 'cat-social-media', name: 'Social Media', slug: 'social-media' },
  { id: 'cat-web-dev', name: 'Web Development', slug: 'web-development' },
  { id: 'cat-mobile-dev', name: 'Mobile App Development', slug: 'mobile-app-development' },
  { id: 'cat-frontend-dev', name: 'Frontend Development', slug: 'frontend-development' },
  { id: 'cat-backend-dev', name: 'Backend Development', slug: 'backend-development' },
  { id: 'cat-fullstack-dev', name: 'Full Stack Development', slug: 'full-stack-development' },
  { id: 'cat-devops', name: 'DevOps & Infrastructure', slug: 'devops-infrastructure' },
  { id: 'cat-cloud-infra', name: 'Cloud & Infrastructure', slug: 'cloud-infrastructure' },
  { id: 'cat00000-0000-0000-0000-000000000002', name: 'Data Science & AI', slug: 'data-science-ai' },
  { id: 'cat-data-analytics', name: 'Data Science & Analytics', slug: 'data-science-analytics' },
  { id: 'cat-ai-ml', name: 'Artificial Intelligence / ML', slug: 'artificial-intelligence-ml' },
  { id: 'cat-cyber-security', name: 'Cyber Security', slug: 'cyber-security' },
  { id: 'cat-database-admin', name: 'Database Administration', slug: 'database-administration' },
  { id: 'cat00000-0000-0000-0000-000000000003', name: 'Product & Design', slug: 'product-design' },
  { id: 'cat-ui-ux-design', name: 'UI/UX Design', slug: 'ui-ux-design' },
  { id: 'cat-product-mgmt', name: 'Product Management', slug: 'product-management' },
  { id: 'cat-project-mgmt', name: 'Project Management', slug: 'project-management' },
  { id: 'cat-human-resources', name: 'Human Resources', slug: 'human-resources' },
  { id: 'cat-recruitment', name: 'Recruitment & Talent Acquisition', slug: 'recruitment-talent-acquisition' },
  { id: 'cat-payroll-benefits', name: 'Payroll & HR Compliance', slug: 'payroll-hr-compliance' },
  { id: 'cat00000-0000-0000-0000-000000000004', name: 'Sales & Marketing', slug: 'sales-marketing' },
  { id: 'cat-digital-marketing', name: 'Digital Marketing', slug: 'digital-marketing' },
  { id: 'cat-seo-sem', name: 'SEO & Performance Marketing', slug: 'seo-performance-marketing' },
  { id: 'cat-content-marketing', name: 'Content Strategy & Writing', slug: 'content-strategy-writing' },
  { id: 'cat-sales-bdev', name: 'Sales & Business Development', slug: 'sales-business-development' },
  { id: 'cat-enterprise-sales', name: 'Enterprise B2B Sales', slug: 'enterprise-b2b-sales' },
  { id: 'cat-account-mgmt', name: 'Account Management', slug: 'account-management' },
  { id: 'cat-customer-support', name: 'Customer Support & Service', slug: 'customer-support-service' },
  { id: 'cat-customer-success', name: 'Customer Success', slug: 'customer-success' },
  { id: 'cat00000-0000-0000-0000-000000000005', name: 'Finance & Accounting', slug: 'finance-accounting' },
  { id: 'cat-statutory-audit', name: 'Statutory Audit & Taxation', slug: 'statutory-audit-taxation' },
  { id: 'cat-investment-banking', name: 'Investment Banking', slug: 'investment-banking' },
  { id: 'cat-operations-logistics', name: 'Operations & Logistics', slug: 'operations-logistics' },
  { id: 'cat-procurement-supply', name: 'Procurement & Supply Chain', slug: 'procurement-supply-chain' },
  { id: 'cat-manufacturing', name: 'Manufacturing & Production', slug: 'manufacturing-production' },
  { id: 'cat-quality-control', name: 'Quality Control & Maintenance', slug: 'quality-control-maintenance' },
  { id: 'cat-healthcare-medical', name: 'Healthcare & Medical', slug: 'healthcare-medical' },
  { id: 'cat-nursing-clinical', name: 'Nursing & Clinical Support', slug: 'nursing-clinical-support' },
  { id: 'cat-pharmaceuticals', name: 'Pharmaceuticals & Life Sciences', slug: 'pharmaceuticals-life-sciences' },
  { id: 'cat-education-training', name: 'Education & Academics', slug: 'education-academics' },
  { id: 'cat-teaching-pedagogy', name: 'Teaching & Pedagogy', slug: 'teaching-pedagogy' },
  { id: 'cat-hospitality-tourism', name: 'Hospitality & Tourism', slug: 'hospitality-tourism' },
  { id: 'cat-construction-eng', name: 'Construction & Civil Engineering', slug: 'construction-civil-engineering' },
  { id: 'cat-legal-compliance', name: 'Legal & Corporate Compliance', slug: 'legal-corporate-compliance' },
  { id: 'cat-media-comm', name: 'Media & Public Relations', slug: 'media-public-relations' },
  { id: 'cat-general-mgmt', name: 'General Management', slug: 'general-management' }
];

export default function JobCategoryAutocomplete({
  selectedCategoryId,
  selectedCategoryName,
  onSelectCategory,
  onClearCategory,
  error
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch / Filter categories dynamically
  const fetchSuggestions = async (queryText) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/job-categories?search=${encodeURIComponent(queryText)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setSuggestions(data.categories);
      } else {
        fallbackFilter(queryText);
      }
    } catch (err) {
      fallbackFilter(queryText);
    } finally {
      setIsLoading(false);
    }
  };

  const fallbackFilter = (queryText) => {
    if (!queryText || !queryText.trim()) {
      setSuggestions(DEFAULT_MASTER_CATEGORIES);
      return;
    }
    const lower = queryText.trim().toLowerCase();
    const startsWith = [];
    const contains = [];

    DEFAULT_MASTER_CATEGORIES.forEach((cat) => {
      const catLower = cat.name.toLowerCase();
      if (catLower.startsWith(lower)) {
        startsWith.push(cat);
      } else if (catLower.includes(lower)) {
        contains.push(cat);
      }
    });

    setSuggestions([...startsWith, ...contains]);
  };

  // Handle Input Focus / Change
  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    setIsOpen(true);
    setHighlightedIndex(-1);
    fetchSuggestions(val);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    fetchSuggestions(searchQuery);
  };

  // Keyboard Navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSelect(suggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleSelect = (category) => {
    onSelectCategory(category);
    setSearchQuery('');
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = () => {
    onClearCategory();
    setSearchQuery('');
    setSuggestions([]);
    setIsOpen(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const isCategorySelected = Boolean(selectedCategoryId || selectedCategoryName);

  return (
    <div className="flex flex-col gap-1 relative" ref={containerRef}>
      <label className="text-xs font-bold text-[#0b1c30]">
        Job Category / Domain <span className="text-[#ba1a1a] font-bold">*</span>
      </label>

      {/* Selected State (Single Select Locked Box with ×) */}
      {isCategorySelected ? (
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#eff4ff] border border-[#00288e] rounded-xl shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <svg className="w-4 h-4 text-[#00288e] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10M7 12h10m-5 5h5" />
            </svg>
            <span className="text-xs font-bold text-[#0b1c30] truncate">
              {selectedCategoryName || 'Selected Category'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            title="Clear selection and search again"
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-200 text-[#444653] font-bold text-xs transition-colors cursor-pointer shrink-0 ml-2"
          >
            ✕
          </button>
        </div>
      ) : (
        /* Unselected State (Searchable Input Autocomplete) */
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder="Search job category (e.g. Software Development)..."
            className={`w-full px-3.5 py-2.5 bg-[#eff4ff] text-[#0b1c30] rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#00288e] outline-none transition-all ${
              error ? 'border border-[#ba1a1a]' : 'border border-transparent'
            }`}
          />
          <svg
            className="w-4 h-4 absolute right-3 top-3 text-[#444653] pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>

          {/* Autocomplete Suggestions Popup */}
          {isOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto py-1 animate-fade-in">
              {isLoading ? (
                <div className="px-4 py-3 text-xs text-[#444653] flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-[#00288e] border-t-transparent rounded-full animate-spin"></div>
                  <span>Searching categories...</span>
                </div>
              ) : suggestions.length > 0 ? (
                suggestions.map((cat, index) => (
                  <button
                    key={cat.id || cat.slug || cat.name}
                    type="button"
                    onClick={() => handleSelect(cat)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      index === highlightedIndex ? 'bg-[#eff4ff] text-[#00288e] font-bold' : 'text-[#0b1c30] hover:bg-slate-50'
                    }`}
                  >
                    <span>{cat.name}</span>
                    {index === highlightedIndex && (
                      <span className="text-[10px] text-[#00288e] font-semibold">Select</span>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-xs text-slate-500 italic">
                  No categories found
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error ? (
        <p className="text-[11px] text-[#ba1a1a] font-semibold">{error}</p>
      ) : (
        <span className="text-[11px] text-[#444653]">
          Type to search master categories. Select ONE category.
        </span>
      )}
    </div>
  );
}
