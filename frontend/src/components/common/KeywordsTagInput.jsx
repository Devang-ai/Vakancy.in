import React, { useState } from 'react';

/**
 * KeywordsTagInput
 * Manual multi-tag input component for job posting keywords.
 * - No predefined master dropdown or limitation.
 * - Enter key or comma creates tag without submitting form.
 * - Paste handler splits by comma or newline.
 * - Case-insensitive duplicate prevention.
 * - Clear remove action (x).
 * - Preserves technical symbols (C++, C#, .NET, Node.js, REST API, CI/CD, SAP S/4HANA).
 */
export default function KeywordsTagInput({ keywords = [], onChange, placeholder = "Type a keyword and press Enter..." }) {
  const [inputValue, setInputValue] = useState('');

  const currentTags = Array.isArray(keywords) ? keywords : [];

  const addTag = (text) => {
    if (!text) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    // Length validation check (max 100 characters per tag)
    if (trimmed.length > 100) return;

    // Case-insensitive duplicate check
    const normalizedNew = trimmed.toLowerCase();
    const isDuplicate = currentTags.some(tag => tag && tag.toLowerCase() === normalizedNew);

    if (!isDuplicate) {
      onChange([...currentTags, trimmed]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && currentTags.length > 0) {
      // Remove last tag when pressing backspace on empty input
      const updated = [...currentTags];
      updated.pop();
      onChange(updated);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    if (!pastedText) return;

    // Split by comma or newline
    const items = pastedText.split(/[\n,]+/);
    const newTags = [...currentTags];

    items.forEach(item => {
      const trimmed = item.trim();
      if (trimmed && trimmed.length <= 100) {
        const normalizedItem = trimmed.toLowerCase();
        const exists = newTags.some(t => t && t.toLowerCase() === normalizedItem);
        if (!exists) {
          newTags.push(trimmed);
        }
      }
    });

    onChange(newTags);
    setInputValue('');
  };

  const removeTag = (indexToRemove) => {
    const updated = currentTags.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="w-full p-2 bg-[#eff4ff] rounded-xl border border-transparent focus-within:bg-white focus-within:ring-2 focus-within:ring-[#00288e] flex flex-wrap items-center gap-2 transition-all min-h-[46px]">
        {currentTags.map((tag, idx) => (
          <span
            key={`${tag}-${idx}`}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#00288e] text-white rounded-lg text-xs font-semibold shadow-xs transition-all hover:bg-[#001e6e]"
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(idx)}
              className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer text-xs font-bold leading-none"
              title={`Remove ${tag}`}
              aria-label={`Remove ${tag}`}
            >
              &times;
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={currentTags.length === 0 ? placeholder : "Add another keyword..."}
          className="flex-1 min-w-[180px] bg-transparent text-[#0b1c30] text-xs font-medium outline-none py-1.5 px-1 placeholder-[#444653]/60"
        />
      </div>
      <span className="text-[11px] text-[#444653] flex items-center justify-between">
        <span>Press <kbd className="px-1 py-0.5 bg-slate-200 border border-slate-300 rounded text-[10px] font-mono">Enter</kbd> or <kbd className="px-1 py-0.5 bg-slate-200 border border-slate-300 rounded text-[10px] font-mono">,</kbd> to add tags (e.g. B2B Sales, Financial Modeling, SEO, Accounting, Project Management).</span>
        {currentTags.length > 0 && (
          <span className="font-semibold text-[#00288e]">{currentTags.length} keyword{currentTags.length > 1 ? 's' : ''} added</span>
        )}
      </span>
    </div>
  );
}
