import React, { useState, useEffect } from 'react';

/**
 * PerksAndBenefitsSelector
 * Reusable, master-driven component for selecting and adding Perks & Benefits.
 * - Loads predefined benefits from Master Catalog (/api/master/benefits)
 * - Highlights 8 agreed primary benefits (Health Insurance, Paid Leave, Performance Bonus, etc.)
 * - Allows multi-selection with toggle chips
 * - Allows adding custom benefits with case-insensitive duplicate prevention
 * - Resiliently handles string arrays, object arrays ({ id, title, desc } or { name }), or mixed types
 * - Clearly displays all selected benefits with remove action
 * - Zero vanity statistics or fake analytics
 */

const PREDEFINED_DEFAULTS = [
  'Health Insurance',
  'Paid Leave',
  'Performance Bonus',
  'Work From Home',
  'Flexible Hours',
  'Provident Fund',
  'Travel Allowance',
  'Meal Allowance'
];

export default function PerksAndBenefitsSelector({
  selectedBenefits = [],
  onChange,
  token,
  error
}) {
  const [masterBenefits, setMasterBenefits] = useState(PREDEFINED_DEFAULTS);
  const [customInput, setCustomInput] = useState('');
  const [inputError, setInputError] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Normalize selected benefits array to string names (handles strings OR {id, title, desc} OR {name})
  const currentBenefits = (Array.isArray(selectedBenefits) ? selectedBenefits : [])
    .map((b) => {
      if (!b) return '';
      if (typeof b === 'string') return b.trim();
      return (b.title || b.name || b.id || '').toString().trim();
    })
    .filter(Boolean);

  // Fetch master benefits catalog from backend
  useEffect(() => {
    let isMounted = true;
    const fetchMasterBenefits = async () => {
      try {
        const res = await fetch('/api/master/benefits');
        const data = await res.json();
        if (data.success && Array.isArray(data.benefits) && isMounted) {
          const rawNames = data.benefits
            .map((b) => (typeof b === 'string' ? b : (b.name || b.title || '')).toString().trim())
            .filter(Boolean);
          const combined = Array.from(new Set([...PREDEFINED_DEFAULTS, ...rawNames]));
          setMasterBenefits(combined);
        }
      } catch (err) {
        console.warn('Notice fetching master benefits:', err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchMasterBenefits();
    return () => {
      isMounted = false;
    };
  }, []);

  // Toggle benefit selection
  const handleToggleBenefit = (benefitName) => {
    if (!benefitName) return;
    const nameStr = typeof benefitName === 'string' ? benefitName : (benefitName.title || benefitName.name || '');
    const trimmed = nameStr.trim();
    if (!trimmed) return;

    const lower = trimmed.toLowerCase();
    const existingIndex = currentBenefits.findIndex(
      (b) => b.toLowerCase() === lower
    );

    if (existingIndex >= 0) {
      // Remove
      const next = currentBenefits.filter((_, idx) => idx !== existingIndex);
      if (onChange) onChange(next);
    } else {
      // Add
      if (onChange) onChange([...currentBenefits, trimmed]);
    }
  };

  // Remove a specific selected benefit
  const handleRemoveBenefit = (benefitToRemove) => {
    if (!benefitToRemove) return;
    const nameStr = typeof benefitToRemove === 'string' ? benefitToRemove : (benefitToRemove.title || benefitToRemove.name || '');
    const lower = nameStr.toLowerCase().trim();
    const next = currentBenefits.filter(
      (b) => b.toLowerCase() !== lower
    );
    if (onChange) onChange(next);
  };

  // Add custom benefit with case-insensitive duplicate prevention
  const handleAddCustomBenefit = async () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;

    if (trimmed.length > 100) {
      setInputError('Benefit name cannot exceed 100 characters.');
      return;
    }

    const lower = trimmed.toLowerCase();

    // Check duplicate in already selected
    const isAlreadySelected = currentBenefits.some(
      (b) => b.toLowerCase() === lower
    );
    if (isAlreadySelected) {
      setInputError(`"${trimmed}" is already selected.`);
      return;
    }

    setInputError(null);
    setIsAdding(true);

    // Persist to Master Catalog in background if token exists
    try {
      if (token) {
        await fetch('/api/master/benefits', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ name: trimmed, category: 'Custom' })
        });
      }
    } catch (_) {}

    // Add to master list if not present
    if (!masterBenefits.some((b) => b.toLowerCase() === lower)) {
      setMasterBenefits((prev) => [...prev, trimmed]);
    }

    // Add to selected list
    if (onChange) onChange([...currentBenefits, trimmed]);
    setCustomInput('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-4">
      {/* Header & Counter */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-bold text-[#0b1c30]">
            Select Perks &amp; Benefits
          </label>
          <p className="text-[11px] text-[#757684] mt-0.5">
            Choose from predefined benefits or add custom offerings for this position.
          </p>
        </div>
        <span className="text-[11px] font-semibold text-[#00288e] bg-[#eff4ff] px-2.5 py-1 rounded-full border border-blue-100">
          {currentBenefits.length} selected
        </span>
      </div>

      {/* Selected Benefits Chips Container */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold text-[#444653] uppercase tracking-wider">
          Currently Selected Benefits
        </span>
        <div className="flex flex-wrap gap-2 p-3 bg-[#eff4ff] rounded-xl min-h-[48px] items-center border border-slate-100">
          {currentBenefits.length > 0 ? (
            currentBenefits.map((ben, idx) => {
              const benName = typeof ben === 'string' ? ben : (ben?.title || ben?.name || `Benefit-${idx}`);
              return (
                <div
                  key={`${benName}-${idx}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-[#0b1c30] rounded-lg shadow-xs text-xs font-semibold border border-slate-200/50 transition-all"
                >
                  <span className="text-[#00288e]">✓</span>
                  <span>{benName}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveBenefit(benName)}
                    className="hover:text-[#ba1a1a] transition-colors ml-1 cursor-pointer text-slate-400 hover:text-red-600 font-bold"
                    title={`Remove ${benName}`}
                  >
                    ✕
                  </button>
                </div>
              );
            })
          ) : (
            <span className="text-xs text-slate-400 italic">
              No benefits selected yet. Click any predefined option below or enter a custom benefit.
            </span>
          )}
        </div>
      </div>

      {/* Predefined Master Benefits Grid */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-[#444653] uppercase tracking-wider">
          Predefined Benefit Options
        </span>
        <div className="flex flex-wrap gap-2">
          {masterBenefits.map((bItem, idx) => {
            const bName = typeof bItem === 'string' ? bItem : (bItem.name || bItem.title || '');
            const isSelected = currentBenefits.some(
              (b) => b.toLowerCase() === bName.toLowerCase()
            );

            return (
              <button
                key={`${bName}-${idx}`}
                type="button"
                onClick={() => handleToggleBenefit(bName)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#00288e] text-white border-[#00288e] shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-[#0b1c30] border-slate-200/70 hover:border-slate-300'
                }`}
              >
                {isSelected ? (
                  <span className="text-white font-bold">✓</span>
                ) : (
                  <span className="text-slate-400 font-bold">+</span>
                )}
                <span>{bName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Add Custom Benefit Input */}
      <div className="pt-2 border-t border-slate-100 space-y-1.5">
        <label className="text-xs font-bold text-[#0b1c30]" htmlFor="custom_benefit_input">
          Add Custom Benefit / Perk
        </label>
        <div className="flex gap-2">
          <input
            id="custom_benefit_input"
            type="text"
            value={customInput}
            onChange={(e) => {
              setCustomInput(e.target.value);
              if (inputError) setInputError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustomBenefit();
              }
            }}
            placeholder="e.g. Annual Learning Stipend, Commute Shuttle..."
            maxLength={100}
            className="flex-1 px-3.5 py-2 bg-[#eff4ff] text-[#0b1c30] rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#00288e] outline-none border border-transparent"
          />
          <button
            type="button"
            onClick={handleAddCustomBenefit}
            disabled={!customInput.trim() || isAdding}
            className="px-4 py-2 bg-[#00288e] text-white rounded-xl text-xs font-semibold hover:bg-blue-900 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isAdding ? 'Adding...' : '+ Add'}
          </button>
        </div>
        {inputError && (
          <p className="text-[11px] text-[#ba1a1a] font-medium mt-1">
            {inputError}
          </p>
        )}
      </div>

      {error && (
        <p className="text-xs text-[#ba1a1a] font-medium mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
