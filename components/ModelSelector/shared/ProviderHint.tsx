import type { ProviderKey, ConnectionStatus } from '../../../hooks/useProvider';

export function ProviderHint({ provider, status }: { provider: ProviderKey; status?: ConnectionStatus }) {
  const msgs: Partial<Record<ProviderKey, Record<string, string>>> = {
    'llm-llamacpp': { connected: 'llama-server is running.', offline: 'llama-server not detected. Start it or run docker compose up.' },
    'llm-openai':   { connected: 'API key found.', 'no-key': 'Set VITE_OPENAI_API_KEY in .env.local to enable.' },
    'llm-claude':   { connected: 'API key found.', 'no-key': 'Set VITE_ANTHROPIC_API_KEY in .env.local to enable.' },
    'llm-ollama':   { connected: 'Ollama is running.', offline: 'Ollama not detected. Run: ollama serve' },
  };
  const msg = status ? msgs[provider]?.[status] : undefined;
  if (!msg) return null;
  const isWarning = status === 'offline' || status === 'no-key';
  return <p className={`text-xs mt-0.5 ${isWarning ? 'text-amber-500 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>{msg}</p>;
}
