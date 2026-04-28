import { useState, useEffect, useCallback } from 'react';
import { Theme, ThemeName } from '../types';
import { getStoredTheme, setStoredTheme, getStoredThemeName, setStoredThemeName } from '../utils/storage';

const THEME_EVENT = 'aura-theme-change';
const THEME_NAME_EVENT = 'aura-theme-name-change';

export function useTheme(): {
  theme: Theme;
  toggleTheme: () => void;
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
} {
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme('dark'));
  const [themeName, setThemeNameState] = useState<ThemeName>(() => getStoredThemeName('default'));

  // Apply light/dark class to <html> and broadcast to other hook instances
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    setStoredTheme(theme);
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
  }, [theme]);

  // Apply data-theme attribute to <html> and broadcast
  useEffect(() => {
    const root = document.documentElement;
    if (themeName === 'default') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', themeName);
    }
    setStoredThemeName(themeName);
    window.dispatchEvent(new CustomEvent(THEME_NAME_EVENT, { detail: themeName }));
  }, [themeName]);

  // Sync with other hook instances in the same page
  useEffect(() => {
    const onTheme = (e: Event) => {
      const next = (e as CustomEvent<Theme>).detail;
      if (next !== theme) setTheme(next);
    };
    const onThemeName = (e: Event) => {
      const next = (e as CustomEvent<ThemeName>).detail;
      if (next !== themeName) setThemeNameState(next);
    };
    window.addEventListener(THEME_EVENT, onTheme);
    window.addEventListener(THEME_NAME_EVENT, onThemeName);
    return () => {
      window.removeEventListener(THEME_EVENT, onTheme);
      window.removeEventListener(THEME_NAME_EVENT, onThemeName);
    };
  }, [theme, themeName]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const setThemeName = useCallback((name: ThemeName) => {
    setThemeNameState(name);
  }, []);

  return { theme, toggleTheme, themeName, setThemeName };
}
