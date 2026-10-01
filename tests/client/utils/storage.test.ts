import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearAllStorage,
  drainLegacyChats,
  getStoredModel,
  getStoredPersonalization,
  getStoredProvider,
  getStoredTheme,
  getStoredThemeName,
  getStoredUIState,
  setStoredProvider,
  setStoredUIState,
} from '../../../utils/storage';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('stored preferences', () => {
  it('fall back when nothing is stored', () => {
    expect(getStoredTheme('dark')).toBe('dark');
    expect(getStoredProvider('llm-ollama')).toBe('llm-ollama');
    expect(getStoredModel('model.gguf')).toBe('model.gguf');
  });

  it('round-trip a valid provider', () => {
    setStoredProvider('llm-claude');
    expect(getStoredProvider('llm-llamacpp')).toBe('llm-claude');
  });

  it('reject values that are not valid choices', () => {
    localStorage.setItem('LLM_ACTIVE_PROVIDER', JSON.stringify('llm-skynet'));
    localStorage.setItem('AURA_THEME', JSON.stringify('purple'));
    localStorage.setItem('AURA_THEME_NAME', JSON.stringify('neon'));
    expect(getStoredProvider('llm-llamacpp')).toBe('llm-llamacpp');
    expect(getStoredTheme('light')).toBe('light');
    expect(getStoredThemeName('default')).toBe('default');
  });

  it('survive corrupted JSON without throwing', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem('LLM_ACTIVE_PROVIDER', '{not json');
    expect(getStoredProvider('llm-ollama')).toBe('llm-ollama');
  });
});

describe('UI state', () => {
  const fallback = {
    sidebarOpen: false,
    settingsOpen: false,
    compactMode: false,
    dataCollection: true,
    chatHistory: true,
  };

  it('fills missing or wrongly typed fields from the fallback', () => {
    localStorage.setItem('AURA_UI_STATE', JSON.stringify({ sidebarOpen: true, compactMode: 'yes' }));
    expect(getStoredUIState(fallback)).toEqual({ ...fallback, sidebarOpen: true });
  });

  it('round-trips', () => {
    setStoredUIState({ ...fallback, compactMode: true });
    expect(getStoredUIState(fallback).compactMode).toBe(true);
  });
});

describe('personalization', () => {
  it('merges stored values over the defaults', () => {
    localStorage.setItem('AURA_PERSONALIZATION', JSON.stringify({ displayName: 'Ada' }));
    expect(getStoredPersonalization()).toEqual({
      displayName: 'Ada',
      customInstructions: '',
      memoriesEnabled: false,
      memories: [],
    });
  });
});

describe('legacy chat migration', () => {
  it('returns the chats once and removes the old key', () => {
    const chats = [{ id: 'c1', title: 't', isPinned: false, updatedAt: 1, messages: [] }];
    localStorage.setItem('AURA_CHATS', JSON.stringify(chats));
    expect(drainLegacyChats()).toEqual(chats);
    expect(localStorage.getItem('AURA_CHATS')).toBeNull();
    expect(drainLegacyChats()).toBeNull();
  });

  it('discards data that is not a list', () => {
    localStorage.setItem('AURA_CHATS', JSON.stringify({ nope: true }));
    expect(drainLegacyChats()).toBeNull();
    expect(localStorage.getItem('AURA_CHATS')).toBeNull();
  });

  it('discards corrupted data', () => {
    localStorage.setItem('AURA_CHATS', '{broken');
    expect(drainLegacyChats()).toBeNull();
    expect(localStorage.getItem('AURA_CHATS')).toBeNull();
  });
});

describe('clearAllStorage', () => {
  it('removes app keys but leaves unrelated ones alone', () => {
    setStoredProvider('llm-ollama');
    localStorage.setItem('unrelated', '1');
    clearAllStorage();
    expect(localStorage.getItem('LLM_ACTIVE_PROVIDER')).toBeNull();
    expect(localStorage.getItem('unrelated')).toBe('1');
  });
});
