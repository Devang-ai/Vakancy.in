import React, { useState, useEffect, useRef } from 'react';

/**
 * RequiredSkillsSelector
 * Single-source multi-select autocomplete component for Required Skills.
 * - Searches against centralized Skill Master (/api/master/skills?search=...)
 * - Displays selected skills as removable chips
 * - Allows adding new skills (+ Add New Skill) if not present in master catalog
 * - Supports basic computer skills (MS Excel, Hands-on Computer, Data Entry, MS Office)
 * - Quick-select pills for commonly required foundational skills
 * - Preserves technical symbols (C++, C#, .NET, Node.js, React.js, REST API, CI/CD)
 * - Prevents case-insensitive duplicates
 */

const QUICK_ESSENTIAL_SKILLS = [
  'MS Excel',
  'Basic Computer Knowledge',
  'Hands-on Computer',
  'Data Entry',
  'MS Office',
  'Communication Skills',
  'Tally Prime',
  'Email Communication'
];

export default function RequiredSkillsSelector({ selectedSkills = [], onChange, error, allowCreate = true, label = "Required Technical & Operational Skills", description = "Select both core technical tools and essential office/computer skills candidates need.", placeholder = "+ Add skill..." }) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingSkill, setIsAddingSkill] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const currentSkills = Array.isArray(selectedSkills)
    ? selectedSkills.map((s) => (typeof s === 'string' ? s : (s?.title || s?.name || '')).trim()).filter(Boolean)
    : [];

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch skill suggestions from backend Skill Master
  const fetchSkillSuggestions = async (queryText) => {
    setIsLoading(true);
    try {
      const q = encodeURIComponent((queryText || '').trim());
      const url = q ? `/api/master/skills?search=${q}&query=${q}&q=${q}` : '/api/master/skills';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.skills)) {
        setSuggestions(data.skills);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error('Error fetching skill suggestions:', err);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    setIsOpen(true);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(() => {
      fetchSkillSuggestions(val);
    }, 120);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    fetchSkillSuggestions(inputValue);
  };

  // Add skill to selected array
  const addSkillToSelection = (skillName) => {
    if (!skillName || typeof skillName !== 'string') return;
    const trimmed = skillName.trim();
    if (!trimmed) return;

    const normalized = trimmed.toLowerCase();
    const isDuplicate = currentSkills.some((s) => s.toLowerCase() === normalized);

    if (!isDuplicate && onChange) {
      onChange([...currentSkills, trimmed]);
    }

    setInputValue('');
    setSuggestions([]);
    setIsOpen(false);
  };

  // Create new skill in Master Catalog and select it
  const handleAddNewSkill = async (customSkillName) => {
    const skillToAdd = (customSkillName || inputValue).trim();
    if (!skillToAdd) return;

    setIsAddingSkill(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/master/skills', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: skillToAdd, category: 'General' })
      });
      const data = await res.json();
      const finalSkillName = data.success && data.skill?.name ? data.skill.name : skillToAdd;
      addSkillToSelection(finalSkillName);
    } catch (err) {
      console.error('Error creating new skill:', err);
      addSkillToSelection(skillToAdd);
    } finally {
      setIsAddingSkill(false);
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    const updated = currentSkills.filter(
      (s) => s.toLowerCase() !== skillToRemove.toLowerCase()
    );
    if (onChange) onChange(updated);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0) {
        addSkillToSelection(suggestions[0].name || suggestions[0]);
      } else if (inputValue.trim() && allowCreate) {
        handleAddNewSkill();
      }
    } else if (e.key === 'Backspace' && !inputValue && currentSkills.length > 0) {
      const updated = [...currentSkills];
      updated.pop();
      if (onChange) onChange(updated);
    }
  };

  const exactMatchExists = suggestions.some((s) => {
    const name = typeof s === 'string' ? s : (s?.name || '');
    return name.toLowerCase() === inputValue.trim().toLowerCase();
  });

  return (
    <div className="flex flex-col gap-2" ref={containerRef}>
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-bold text-[#0b1c30]">
            {label} <span className="text-[#ba1a1a] font-bold">*</span>
          </label>
          <p className="text-[11px] text-[#757684]">
            {description}
          </p>
        </div>
        <span className="text-[11px] font-semibold text-[#00288e] bg-[#eff4ff] px-2.5 py-0.5 rounded-full border border-blue-100">
          {currentSkills.length} selected
        </span>
      </div>

      {/* Container with chips and input */}
      <div
        className={`w-full p-2 bg-[#eff4ff] rounded-xl border flex flex-wrap items-center gap-2 transition-all min-h-[46px] relative ${
          error ? 'border-[#ba1a1a]' : 'border-transparent focus-within:bg-white focus-within:ring-2 focus-within:ring-[#00288e]'
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Selected Skill Chips */}
        {currentSkills.map((skill, idx) => (
          <span
            key={`${skill}-${idx}`}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-[#00288e] rounded-lg text-xs font-semibold shadow-xs border border-blue-200/80 transition-all hover:bg-blue-50"
          >
            <span>{skill}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveSkill(skill);
              }}
              className="w-4 h-4 rounded-full flex items-center justify-center text-[#00288e] hover:bg-[#00288e] hover:text-white transition-colors cursor-pointer text-xs font-bold leading-none"
              title={`Remove ${skill}`}
              aria-label={`Remove ${skill}`}
            >
              &times;
            </button>
          </span>
        ))}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={currentSkills.length === 0 ? (placeholder === "+ Add skill..." ? "Search skills (e.g. Excel, Basic Computer, Java, Sales)..." : placeholder) : placeholder}
          className="flex-1 min-w-[200px] bg-transparent border-none text-xs text-[#0b1c30] outline-none font-medium placeholder:text-[#757684]/70"
        />

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute right-3 top-3">
            <div className="w-3.5 h-3.5 border-2 border-[#00288e] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Quick-Pick Popular & Foundational Skills */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[10px] font-bold text-[#757684] uppercase tracking-wider mr-1">
          Popular:
        </span>
        {QUICK_ESSENTIAL_SKILLS.map((qSkill) => {
          const isAdded = currentSkills.some((s) => s.toLowerCase() === qSkill.toLowerCase());
          return (
            <button
              key={qSkill}
              type="button"
              onClick={() => {
                if (isAdded) handleRemoveSkill(qSkill);
                else addSkillToSelection(qSkill);
              }}
              className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer border ${
                isAdded
                  ? 'bg-[#00288e] text-white border-[#00288e] shadow-xs'
                  : 'bg-white text-[#444653] hover:text-[#00288e] border-slate-200/80 hover:bg-blue-50'
              }`}
            >
              {isAdded ? '✓ ' : '+ '}
              {qSkill}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-[11px] text-[#ba1a1a] font-semibold mt-0.5">{error}</p>
      )}

      {/* Search Dropdown */}
      {isOpen && (
        <div className="relative w-full z-30">
          <ul className="absolute left-0 right-0 top-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 text-xs text-[#0b1c30] font-medium z-50">
            {suggestions.length > 0 ? (
              suggestions.map((item, idx) => {
                const name = typeof item === 'string' ? item : (item.name || item);
                const isSelected = currentSkills.some((s) => s.toLowerCase() === name.toLowerCase());

                return (
                  <li
                    key={item.id || `${name}-${idx}`}
                    onClick={() => {
                      if (!isSelected) addSkillToSelection(name);
                    }}
                    className={`px-3.5 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'hover:bg-[#eff4ff] hover:text-[#00288e]'
                    }`}
                  >
                    <span className="font-semibold">{name}</span>
                    {isSelected ? (
                      <span className="text-[10px] font-bold text-slate-400">Added</span>
                    ) : (
                      <span className="text-[10px] font-bold text-[#00288e]">+ Select</span>
                    )}
                  </li>
                );
              })
            ) : (
              <li className="px-3.5 py-2 text-slate-400 italic">
                {inputValue.trim() ? (allowCreate ? `No pre-listed skill found for "${inputValue}".` : "Skill not found. Please select a skill from the available list.") : 'Type to search skills...'}
              </li>
            )}

            {/* Add New Custom Skill Option */}
            {allowCreate && !exactMatchExists && inputValue.trim().length > 0 && (
              <li
                onClick={() => handleAddNewSkill()}
                className="px-3.5 py-2.5 border-t border-slate-100 bg-blue-50/50 hover:bg-blue-50 text-[#00288e] flex items-center justify-between cursor-pointer font-bold"
              >
                <span>+ Add &quot;{inputValue.trim()}&quot; as New Skill</span>
                {isAddingSkill ? (
                  <span className="text-[10px] font-semibold text-slate-400 animate-pulse">Adding...</span>
                ) : (
                  <span className="text-[10px] font-bold bg-[#00288e] text-white px-2 py-0.5 rounded-full">Save &amp; Add</span>
                )}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
