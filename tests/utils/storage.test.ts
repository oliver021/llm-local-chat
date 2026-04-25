import { describe, it, expect } from 'vitest';
import {
  getStoredChats,
  setStoredChats,
  getStoredTheme,
  setStoredTheme,
  getStoredUIState,
  setStoredUIState,
  clearAllStorage,
} from '../../utils/storage';
import type { ChatSession } from '../../types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FALLBACK_CHATS: ChatSession[] = [];

const SAMPLE_CHAT: ChatSession = {
  id: 'chat-1',
  title: 'Test chat',
  isPinned: false,
  updatedAt: 1_000_000,
  messages: [],
};

// ── getStoredChats / setStoredChats ───────────────────────────────────────────

describe('getStoredChats', () => {
  it('returns fallback when localStorage is empty', () => {
    expect(getStoredChats(FALLBACK_CHATS)).toEqual(FALLBACK_CHATS);
  });

  it('returns parsed chats after saving them', () => {
    setStoredChats([SAMPLE_CHAT]);
    expect(getStoredChats(FALLBACK_CHATS)).toEqual([SAMPLE_CHAT]);
  });

  it('returns fallback when stored value is not an array', () => {
    localStorage.setItem('AURA_CHATS', JSON.stringify({ not: 'an array' }));
    expect(getStoredChats(FALLBACK_CHATS)).toEqual(FALLBACK_CHATS);
  });

  it('returns fallback on corrupt JSON', () => {
    localStorage.setItem('AURA_CHATS', '{ broken json :::');
    expect(getStoredChats(FALLBACK_CHATS)).toEqual(FALLBACK_CHATS);
  });
});

// ── getStoredTheme / setStoredTheme ───────────────────────────────────────────

describe('getStoredTheme', () => {
  it('returns fallback when nothing is stored', () => {
    expect(getStoredTheme('dark')).toBe('dark');
  });

  it('returns "light" after storing "light"', () => {
    setStoredTheme('light');
    expect(getStoredTheme('dark')).toBe('light');
  });

  it('returns "dark" after storing "dark"', () => {
    setStoredTheme('dark');
    expect(getStoredTheme('light')).toBe('dark');
  });

  it('returns fallback when stored value is invalid', () => {
    localStorage.setItem('AURA_THEME', '"blue"');
    expect(getStoredTheme('dark')).toBe('dark');
  });
});

// ── getStoredUIState / setStoredUIState ───────────────────────────────────────

const FALLBACK_UI = {
  sidebarOpen: false,
  settingsOpen: false,
  compactMode: false,
  dataCollection: true,
  chatHistory: true,
};

describe('getStoredUIState', () => {
  it('returns fallback when nothing is stored', () => {
    expect(getStoredUIState(FALLBACK_UI)).toEqual(FALLBACK_UI);
  });

  it('restores all five fields after saving — regression test for getStoredUIState bug', () => {
    setStoredUIState({
      sidebarOpen: true,
      settingsOpen: false,
      compactMode: true,
      dataCollection: false,
      chatHistory: false,
    });

    const restored = getStoredUIState(FALLBACK_UI);
    expect(restored.sidebarOpen).toBe(true);
    expect(restored.compactMode).toBe(true);      // was silently dropped before fix
    expect(restored.dataCollection).toBe(false);  // was silently dropped before fix
    expect(restored.chatHistory).toBe(false);     // was silently dropped before fix
  });

  it('falls back per-field when a stored value has the wrong type', () => {
    localStorage.setItem('AURA_UI_STATE', JSON.stringify({ sidebarOpen: 'yes', compactMode: 1 }));
    const result = getStoredUIState(FALLBACK_UI);
    expect(result.sidebarOpen).toBe(FALLBACK_UI.sidebarOpen);
    expect(result.compactMode).toBe(FALLBACK_UI.compactMode);
  });

  it('returns fallback on corrupt JSON', () => {
    localStorage.setItem('AURA_UI_STATE', '{{bad');
    expect(getStoredUIState(FALLBACK_UI)).toEqual(FALLBACK_UI);
  });
});

// ── clearAllStorage ───────────────────────────────────────────────────────────

describe('clearAllStorage', () => {
  it('removes all stored keys', () => {
    setStoredChats([SAMPLE_CHAT]);
    setStoredTheme('light');
    setStoredUIState(FALLBACK_UI);

    clearAllStorage();

    expect(getStoredChats(FALLBACK_CHATS)).toEqual(FALLBACK_CHATS);
    expect(getStoredTheme('dark')).toBe('dark');
    expect(getStoredUIState(FALLBACK_UI)).toEqual(FALLBACK_UI);
  });
});
