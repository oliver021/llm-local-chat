import { createContext, useContext } from 'react';
import { UseSettingsResult } from '../hooks/useSettings';

const SettingsContext = createContext<UseSettingsResult | null>(null);

export const SettingsProvider = SettingsContext.Provider;

export function useSettingsContext(): UseSettingsResult {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettingsContext must be used inside <SettingsProvider>');
  return ctx;
}
