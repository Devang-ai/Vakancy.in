import { useEffect } from 'react';

/**
 * useModalA11y — Reusable Modal & Dialog Accessibility Hook for Admin Panel
 * 
 * Guarantees:
 * 1. Locks document.body scroll while modal is open, preventing page scroll bleedthrough.
 * 2. Restores document.body scroll reliably upon modal unmount or close.
 * 3. Listens for 'Escape' key to close dismissible dialogs.
 * 4. Stacks multiple open modals safely without prematurely restoring body scroll.
 */

let activeModalCount = 0;
let previousBodyOverflow = '';

export function useModalA11y(isOpen, onClose) {
  useEffect(() => {
    if (!isOpen) return;

    if (activeModalCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    activeModalCount++;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (typeof onClose === 'function') {
          e.preventDefault();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      activeModalCount = Math.max(0, activeModalCount - 1);
      if (activeModalCount === 0) {
        document.body.style.overflow = previousBodyOverflow || '';
      }
    };
  }, [isOpen, onClose]);
}

export default useModalA11y;
