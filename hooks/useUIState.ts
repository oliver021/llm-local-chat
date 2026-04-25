import { useState, useCallback, useEffect } from 'react';
import { getStoredUIState, setStoredUIState } from '../utils/storage';

interface UIState {
  sidebarOpen: boolean;
  settingsOpen: boolean;
  compactMode: boolean;
  dataCollection: boolean;
  chatHistory: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  toggleCompactMode: () => void;
  toggleDataCollection: () => void;
  toggleChatHistory: () => void;
}

const DEFAULT_UI_STATE = { sidebarOpen: false, settingsOpen: false, compactMode: false, dataCollection: true, chatHistory: true };

export function useUIState(): UIState {
  const stored = getStoredUIState(DEFAULT_UI_STATE);
  const [sidebarOpen, setSidebarOpen] = useState(stored.sidebarOpen);
  const [settingsOpen, setSettingsOpen] = useState(stored.settingsOpen);
  const [compactMode, setCompactMode] = useState(stored.compactMode);
  const [dataCollection, setDataCollection] = useState(stored.dataCollection);
  const [chatHistory, setChatHistory] = useState(stored.chatHistory);

  // Persist UI state to localStorage whenever it changes
  useEffect(() => {
    setStoredUIState({ sidebarOpen, settingsOpen, compactMode, dataCollection, chatHistory });
  }, [sidebarOpen, settingsOpen, compactMode, dataCollection, chatHistory]);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const toggleCompactMode = useCallback(() => setCompactMode(prev => !prev), []);
  const toggleDataCollection = useCallback(() => setDataCollection(prev => !prev), []);
  const toggleChatHistory = useCallback(() => setChatHistory(prev => !prev), []);

  return { sidebarOpen, settingsOpen, compactMode, dataCollection, chatHistory, openSidebar, closeSidebar, openSettings, closeSettings, toggleCompactMode, toggleDataCollection, toggleChatHistory };
}
