import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Assistant, ActiveAssistantId, Memory, PersonalizationSettings,
  WebSearchSettings, MCPServer, VoiceSettings,
} from '../types';
import {
  getStoredAssistants, setStoredAssistants,
  getStoredActiveAssistantId, setStoredActiveAssistantId,
  getStoredPersonalization, setStoredPersonalization,
  getStoredWebSearch, setStoredWebSearch,
  getStoredMCPServers, setStoredMCPServers,
  getStoredVoiceSettings, setStoredVoiceSettings,
} from '../utils/storage';
import { buildSystemPrompt } from '../utils/systemPrompt';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export interface UseSettingsResult {
  // Assistants
  assistants: Assistant[];
  activeAssistantId: ActiveAssistantId;
  activeAssistant: Assistant | null;
  addAssistant: (draft: Omit<Assistant, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateAssistant: (id: string, patch: Partial<Omit<Assistant, 'id'>>) => void;
  deleteAssistant: (id: string) => void;
  setActiveAssistant: (id: ActiveAssistantId) => void;

  // Personalization
  personalization: PersonalizationSettings;
  updatePersonalization: (patch: Partial<PersonalizationSettings>) => void;
  addMemory: (content: string) => void;
  deleteMemory: (id: string) => void;

  // Web Search
  webSearch: WebSearchSettings;
  updateWebSearch: (patch: Partial<WebSearchSettings>) => void;

  // MCP Servers
  mcpServers: MCPServer[];
  addMCPServer: (draft: Omit<MCPServer, 'id' | 'createdAt'>) => void;
  updateMCPServer: (id: string, patch: Partial<Omit<MCPServer, 'id'>>) => void;
  deleteMCPServer: (id: string) => void;

  // Voice Settings
  voiceSettings: VoiceSettings;
  updateVoiceSettings: (patch: Partial<VoiceSettings>) => void;

  // Derived
  composedSystemPrompt: string | null;
}

export function useSettings(): UseSettingsResult {
  const [assistants, setAssistants] = useState<Assistant[]>(() => getStoredAssistants());
  const [activeAssistantId, setActiveAssistantIdState] = useState<ActiveAssistantId>(
    () => getStoredActiveAssistantId()
  );
  const [personalization, setPersonalization] = useState<PersonalizationSettings>(
    () => getStoredPersonalization()
  );
  const [webSearch, setWebSearch] = useState<WebSearchSettings>(() => getStoredWebSearch());
  const [mcpServers, setMCPServers] = useState<MCPServer[]>(() => getStoredMCPServers());
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() => getStoredVoiceSettings());

  useEffect(() => { setStoredAssistants(assistants); }, [assistants]);
  useEffect(() => { setStoredActiveAssistantId(activeAssistantId); }, [activeAssistantId]);
  useEffect(() => { setStoredPersonalization(personalization); }, [personalization]);
  useEffect(() => { setStoredWebSearch(webSearch); }, [webSearch]);
  useEffect(() => { setStoredMCPServers(mcpServers); }, [mcpServers]);
  useEffect(() => { setStoredVoiceSettings(voiceSettings); }, [voiceSettings]);

  const activeAssistant = useMemo(
    () => assistants.find(a => a.id === activeAssistantId) ?? null,
    [assistants, activeAssistantId]
  );

  const composedSystemPrompt = useMemo(
    () => buildSystemPrompt(activeAssistant, personalization),
    [activeAssistant, personalization]
  );

  // ── Assistants ────────────────────────────────────────────────────────────

  const addAssistant = useCallback((draft: Omit<Assistant, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    setAssistants(prev => [...prev, { ...draft, id: uid(), createdAt: now, updatedAt: now }]);
  }, []);

  const updateAssistant = useCallback((id: string, patch: Partial<Omit<Assistant, 'id'>>) => {
    setAssistants(prev =>
      prev.map(a => a.id === id ? { ...a, ...patch, updatedAt: Date.now() } : a)
    );
  }, []);

  const deleteAssistant = useCallback((id: string) => {
    setAssistants(prev => prev.filter(a => a.id !== id));
    setActiveAssistantIdState(prev => (prev === id ? null : prev));
  }, []);

  const setActiveAssistant = useCallback((id: ActiveAssistantId) => {
    setActiveAssistantIdState(id);
  }, []);

  // ── Personalization ───────────────────────────────────────────────────────

  const updatePersonalization = useCallback((patch: Partial<PersonalizationSettings>) => {
    setPersonalization(prev => ({ ...prev, ...patch }));
  }, []);

  const addMemory = useCallback((content: string) => {
    const mem: Memory = { id: uid(), content, createdAt: Date.now() };
    setPersonalization(prev => ({ ...prev, memories: [...prev.memories, mem] }));
  }, []);

  const deleteMemory = useCallback((id: string) => {
    setPersonalization(prev => ({
      ...prev,
      memories: prev.memories.filter(m => m.id !== id),
    }));
  }, []);

  // ── Web Search ────────────────────────────────────────────────────────────

  const updateWebSearch = useCallback((patch: Partial<WebSearchSettings>) => {
    setWebSearch(prev => ({ ...prev, ...patch }));
  }, []);

  // ── MCP Servers ───────────────────────────────────────────────────────────

  const addMCPServer = useCallback((draft: Omit<MCPServer, 'id' | 'createdAt'>) => {
    setMCPServers(prev => [...prev, { ...draft, id: uid(), createdAt: Date.now() }]);
  }, []);

  const updateMCPServer = useCallback((id: string, patch: Partial<Omit<MCPServer, 'id'>>) => {
    setMCPServers(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  }, []);

  const deleteMCPServer = useCallback((id: string) => {
    setMCPServers(prev => prev.filter(s => s.id !== id));
  }, []);

  // ── Voice Settings ────────────────────────────────────────────────────────

  const updateVoiceSettings = useCallback((patch: Partial<VoiceSettings>) => {
    setVoiceSettings(prev => ({ ...prev, ...patch }));
  }, []);

  return {
    assistants, activeAssistantId, activeAssistant,
    addAssistant, updateAssistant, deleteAssistant, setActiveAssistant,
    personalization, updatePersonalization, addMemory, deleteMemory,
    webSearch, updateWebSearch,
    mcpServers, addMCPServer, updateMCPServer, deleteMCPServer,
    voiceSettings, updateVoiceSettings,
    composedSystemPrompt,
  };
}
