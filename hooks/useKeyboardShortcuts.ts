import { useEffect } from 'react';

/**
 * useKeyboardShortcuts
 *
 * Registers global keyboard shortcuts for the chat app.
 * All handlers are cleaned up on unmount to avoid memory leaks.
 *
 * Shortcuts:
 *   Cmd/Ctrl + K       → Start a new chat
 *   Cmd/Ctrl + Shift+S → Toggle sidebar
 *   Escape             → Close settings modal (already handled in SettingsModal)
 *   /                  → Focus the message input (when not already focused in a field)
 */

interface ShortcutHandlers {
  onNewChat: () => void;
  onToggleSidebar: () => void;
  onFocusInput: () => void;
}

export function useKeyboardShortcuts({
  onNewChat,
  onToggleSidebar,
  onFocusInput,
}: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Don't fire shortcuts when typing in a text field
      const target = e.target as HTMLElement;
      const isInInput =
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'INPUT' ||
        target.isContentEditable;

      // ── Cmd/Ctrl + K → New chat ──────────────────────────────────────────
      if (modKey && e.key === 'k') {
        e.preventDefault();
        onNewChat();
        return;
      }

      // ── Cmd/Ctrl + Shift + S → Toggle sidebar ───────────────────────────
      if (modKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        onToggleSidebar();
        return;
      }

      // ── / → Focus message input (only when not already in a field) ───────
      if (e.key === '/' && !isInInput && !modKey) {
        e.preventDefault();
        onFocusInput();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onNewChat, onToggleSidebar, onFocusInput]);
}
