import { ChatSession, Theme } from '../types';

const STORAGE_KEYS = {
  CHATS: 'AURA_CHATS',
  THEME: 'AURA_THEME',
  UI_STATE: 'AURA_UI_STATE',
} as const;

// ── Generic helpers ────────────────────────────────────────────────────────────
// Centralises all try/catch boilerplate so individual getters/setters stay lean.

function storageGet<T>(key: string, fallback: T, validate?: (v: unknown) => v is T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (validate && !validate(parsed)) {
      console.warn(`Stored value for "${key}" failed validation, using fallback`);
      return fallback;
    }
    return parsed as T;
  } catch (error) {
    console.warn(`Failed to read "${key}" from localStorage:`, error);
    return fallback;
  }
}

function storageSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to write "${key}" to localStorage:`, error);
  }
}

// ── UIState ────────────────────────────────────────────────────────────────────

interface UIState {
  sidebarOpen: boolean;
  settingsOpen: boolean;
  compactMode?: boolean;
  dataCollection?: boolean;
  chatHistory?: boolean;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function getStoredChats(fallback: ChatSession[]): ChatSession[] {
  return storageGet(STORAGE_KEYS.CHATS, fallback, Array.isArray);
}

export function setStoredChats(chats: ChatSession[]): void {
  storageSet(STORAGE_KEYS.CHATS, chats);
}

export function getStoredTheme(fallback: Theme): Theme {
  const stored = storageGet<string>(STORAGE_KEYS.THEME, '');
  return stored === 'light' || stored === 'dark' ? stored : fallback;
}

export function setStoredTheme(theme: Theme): void {
  storageSet(STORAGE_KEYS.THEME, theme);
}

export function getStoredUIState(fallback: UIState): UIState {
  const stored = storageGet<Partial<UIState>>(STORAGE_KEYS.UI_STATE, {});
  return {
    sidebarOpen:     typeof stored.sidebarOpen     === 'boolean' ? stored.sidebarOpen     : fallback.sidebarOpen,
    settingsOpen:    typeof stored.settingsOpen     === 'boolean' ? stored.settingsOpen    : fallback.settingsOpen,
    compactMode:     typeof stored.compactMode      === 'boolean' ? stored.compactMode     : fallback.compactMode,
    dataCollection:  typeof stored.dataCollection   === 'boolean' ? stored.dataCollection  : fallback.dataCollection,
    chatHistory:     typeof stored.chatHistory      === 'boolean' ? stored.chatHistory     : fallback.chatHistory,
  };
}

export function setStoredUIState(state: UIState): void {
  storageSet(STORAGE_KEYS.UI_STATE, state);
}

export function clearAllStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.CHATS);
    localStorage.removeItem(STORAGE_KEYS.THEME);
    localStorage.removeItem(STORAGE_KEYS.UI_STATE);
  } catch (error) {
    console.warn('Failed to clear localStorage:', error);
  }
}
