/**
 * Focus trap utility for modals and dialogs
 * Ensures Tab key cycles focus only within focusable elements inside the container,
 * preventing focus from escaping to background content
 */

import { useEffect } from 'react';

export function useFocusTrap(containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Find all focusable elements (buttons, links, inputs, textareas, select)
    const getFocusableElements = (): HTMLElement[] => {
      const selector = [
        'button:not(:disabled)',
        'a[href]',
        'input:not(:disabled)',
        'textarea:not(:disabled)',
        'select:not(:disabled)',
        '[tabindex]:not([tabindex="-1"])',
      ].join(',');

      return Array.from(container.querySelectorAll(selector));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const activeElement = document.activeElement as HTMLElement;
      const currentIndex = focusableElements.indexOf(activeElement);

      if (e.shiftKey) {
        // Shift+Tab: move focus backward
        const prevIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
        e.preventDefault();
        focusableElements[prevIndex].focus();
      } else {
        // Tab: move focus forward
        const nextIndex = currentIndex >= focusableElements.length - 1 ? 0 : currentIndex + 1;
        e.preventDefault();
        focusableElements[nextIndex].focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, []);
}
