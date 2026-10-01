import type { ProviderKey } from '../../../hooks/useProvider';
import type { ConnectionStatus } from '../../../services/modelDiscovery';

export function ProviderHint({ provider, status }: { provider: ProviderKey; status?: ConnectionStatus }) {
  const msgs: Partial<Record<ProviderKey, Record<string, string>>> = {
    'llm-llamacpp': { connected: 'llama-server is running.', offline: 'llama-server not reachable. Start it, or point LLAMA_SERVER_URL at it in .env.' },
    'llm-openai':   { connected: 'API key configured on the server.', 'no-key': 'Set OPENAI_API_KEY in .env and restart the server.' },
    'llm-claude':   { connected: 'API key configured on the server.', 'no-key': 'Set ANTHROPIC_API_KEY in .env and restart the server.' },
    'llm-ollama':   { connected: 'Ollama is running.', offline: 'Ollama not reachable. Run `ollama serve`, or point OLLAMA_URL at it in .env.' },
  };
  const msg = status ? msgs[provider]?.[status] : undefined;
  if (!msg) return null;
  const isWarning = status === 'offline' || status === 'no-key';
  return <p className={`text-xs mt-0.5 ${isWarning ? 'text-amber-500 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>{msg}</p>;
}
