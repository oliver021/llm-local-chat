import { ChatSession, Theme } from '../types';
import type { ProviderKey } from '../hooks/useProvider';

const STORAGE_KEYS = {
  THEME:    'AURA_THEME',
  UI_STATE: 'AURA_UI_STATE',
  PROVIDER: 'LLM_ACTIVE_PROVIDER',
  MODEL:    'LLM_ACTIVE_MODEL',
  // Legacy key — read once during migration then cleared
  LEGACY_CHATS: 'AURA_CHATS',
} as const;

const VALID_PROVIDERS: ProviderKey[] = ['llm-llamacpp', 'llm-openai', 'llm-claude', 'llm-ollama'];

// ── Generic helpers ────────────────────────────────────────────────────────────

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
    sidebarOpen:    typeof stored.sidebarOpen    === 'boolean' ? stored.sidebarOpen    : fallback.sidebarOpen,
    settingsOpen:   typeof stored.settingsOpen   === 'boolean' ? stored.settingsOpen   : fallback.settingsOpen,
    compactMode:    typeof stored.compactMode    === 'boolean' ? stored.compactMode    : fallback.compactMode,
    dataCollection: typeof stored.dataCollection === 'boolean' ? stored.dataCollection : fallback.dataCollection,
    chatHistory:    typeof stored.chatHistory    === 'boolean' ? stored.chatHistory    : fallback.chatHistory,
  };
}

export function setStoredUIState(state: UIState): void {
  storageSet(STORAGE_KEYS.UI_STATE, state);
}

export function getStoredProvider(fallback: ProviderKey): ProviderKey {
  const stored = storageGet<string>(STORAGE_KEYS.PROVIDER, '');
  return (VALID_PROVIDERS as string[]).includes(stored) ? (stored as ProviderKey) : fallback;
}

export function setStoredProvider(provider: ProviderKey): void {
  storageSet(STORAGE_KEYS.PROVIDER, provider);
}

export function getStoredModel(fallback: string): string {
  const stored = storageGet<string>(STORAGE_KEYS.MODEL, '');
  return stored || fallback;
}

export function setStoredModel(model: string): void {
  storageSet(STORAGE_KEYS.MODEL, model);
}

/**
 * One-time migration: reads chats from the old localStorage key and removes it.
 * Returns null if no legacy data exists.
 */
export function drainLegacyChats(): ChatSession[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LEGACY_CHATS);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    localStorage.removeItem(STORAGE_KEYS.LEGACY_CHATS);
    return Array.isArray(parsed) ? (parsed as ChatSession[]) : null;
  } catch {
    localStorage.removeItem(STORAGE_KEYS.LEGACY_CHATS);
    return null;
  }
}

export function clearAllStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.THEME);
    localStorage.removeItem(STORAGE_KEYS.UI_STATE);
    localStorage.removeItem(STORAGE_KEYS.PROVIDER);
    localStorage.removeItem(STORAGE_KEYS.MODEL);
    localStorage.removeItem(STORAGE_KEYS.LEGACY_CHATS);
  } catch (error) {
    console.warn('Failed to clear localStorage:', error);
  }
}
