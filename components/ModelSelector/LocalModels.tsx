import { useState, useEffect, useCallback } from 'react';
import { Cpu, RefreshCw, CheckCircle2 } from '../Icons';
import { fetchLlamaServerModels } from '../../services/modelDiscovery';
import { Spinner } from './shared/Spinner';
import { ErrorState } from './shared/ErrorState';
import type { ModelInfo, ProviderKey } from '../../services/modelDiscovery';

export function LocalModels({ activeProvider, activeModel, onSelect }: {
  activeProvider: ProviderKey; activeModel: string; onSelect: (m: ModelInfo) => void;
}) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    fetchLlamaServerModels()
      .then(setModels)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner label="Connecting to llama-server…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (models.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 text-center px-6">
        <Cpu size={32} className="text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">No models loaded in llama-server.</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Start llama-server with a model, or run{' '}
          <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-xs">docker compose up</code>
        </p>
        <button onClick={load} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
          <RefreshCw size={11} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
          {models.length} model{models.length !== 1 ? 's' : ''} available
        </p>
        <button onClick={load} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors" title="Refresh">
          <RefreshCw size={13} />
        </button>
      </div>
      {models.map((m) => {
        const isActive = activeProvider === 'llm-llamacpp' && m.id === activeModel;
        return (
          <button key={m.id} onClick={() => onSelect(m)}
            className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-150 flex items-center gap-3 ${
              isActive
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-100 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-gray-50 dark:hover:bg-gray-800/40'
            }`}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Cpu size={14} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium truncate ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                  {m.name}
                </span>
                {isActive && (
                  <span className="text-xs px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-semibold flex-shrink-0">
                    active
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Loaded in llama-server</p>
            </div>
            {isActive && <CheckCircle2 size={16} className="text-blue-500 flex-shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}
