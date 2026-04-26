import type { ProviderKey } from '../../../hooks/useProvider';

export function EmptyHint({ provider }: { provider: ProviderKey }) {
  if (provider === 'llm-ollama') {
    return (
      <p className="text-xs text-center">
        Run <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-xs">ollama pull llama3.1</code> to add a model.
      </p>
    );
  }
  return null;
}
