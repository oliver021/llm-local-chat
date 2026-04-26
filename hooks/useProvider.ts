import { useState, useCallback, useEffect } from 'react';
import { getStoredProvider, setStoredProvider, getStoredModel, setStoredModel } from '../utils/storage';

export type ProviderKey = 'llm-llamacpp' | 'llm-openai' | 'llm-claude' | 'llm-ollama';

export interface ProviderLabels {
  key: ProviderKey;
  label: string;
  shortLabel: string;
}

export const PROVIDER_META: ProviderLabels[] = [
  { key: 'llm-llamacpp', label: 'llama.cpp',    shortLabel: 'llama.cpp' },
  { key: 'llm-openai',   label: 'OpenAI',        shortLabel: 'OpenAI'    },
  { key: 'llm-claude',   label: 'Anthropic',     shortLabel: 'Claude'    },
  { key: 'llm-ollama',   label: 'Ollama',         shortLabel: 'Ollama'    },
];

const DEFAULT_MODELS: Record<ProviderKey, string> = {
  'llm-llamacpp': 'model.gguf',
  'llm-openai':   'gpt-4o',
  'llm-claude':   'claude-sonnet-4-6',
  'llm-ollama':   'llama3.1',
};

interface UseProviderResult {
  activeProvider: ProviderKey;
  activeModel: string;
  setProvider: (p: ProviderKey) => void;
  setModel: (m: string) => void;
  setProviderAndModel: (p: ProviderKey, m: string) => void;
}

export function useProvider(): UseProviderResult {
  const [activeProvider, setActiveProviderState] = useState<ProviderKey>(
    () => getStoredProvider('llm-llamacpp')
  );
  const [activeModel, setActiveModelState] = useState<string>(
    () => getStoredModel(DEFAULT_MODELS['llm-llamacpp'])
  );

  useEffect(() => { setStoredProvider(activeProvider); }, [activeProvider]);
  useEffect(() => { setStoredModel(activeModel); }, [activeModel]);

  const setProvider = useCallback((p: ProviderKey) => {
    setActiveProviderState(p);
  }, []);

  const setModel = useCallback((m: string) => {
    setActiveModelState(m);
  }, []);

  const setProviderAndModel = useCallback((p: ProviderKey, m: string) => {
    setActiveProviderState(p);
    setActiveModelState(m);
  }, []);

  return { activeProvider, activeModel, setProvider, setModel, setProviderAndModel };
}
