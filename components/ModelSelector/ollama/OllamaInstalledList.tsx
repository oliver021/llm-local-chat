import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle2, Cpu } from '../../Icons';
import { fetchOllamaInstalledModels } from '../../../services/modelDiscovery';
import { Spinner } from '../shared/Spinner';
import { ErrorState } from '../shared/ErrorState';
import type { ModelInfo, OllamaInstalledModel } from '../../../services/modelDiscovery';

export function OllamaInstalledList({ activeModel, onSelect }: {
  activeModel: string;
  onSelect: (m: ModelInfo) => void;
}) {
  const [models, setModels]   = useState<OllamaInstalledModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    fetchOllamaInstalledModels()
      .then(setModels)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmtSize = (bytes: number) => {
    const gb = bytes / 1024 / 1024 / 1024;
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${Math.round(bytes / 1024 / 1024)} MB`;
  };

  const fmtDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return iso; }
  };

  if (loading) return <Spinner label="Checking Ollama…" />;
  if (error)   return <ErrorState message={error} onRetry={load} />;

  if (models.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 text-center px-6">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <span className="text-2xl">🦙</span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">No models installed in Ollama.</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Switch to the <span className="font-medium text-gray-600 dark:text-gray-300">Ollama Library</span> tab to browse and pull models.
        </p>
        <button onClick={load} className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
          <RefreshCw size={11} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
          {models.length} model{models.length !== 1 ? 's' : ''} installed
        </p>
        <button onClick={load} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors" title="Refresh">
          <RefreshCw size={13} />
        </button>
      </div>

      {models.map((m) => {
        const isActive  = m.name === activeModel;
        const baseName  = m.name.split(':')[0];
        const tag       = m.name.includes(':') ? m.name.split(':')[1] : 'latest';
        const family    = m.details?.family ?? baseName;
        const paramSize = m.details?.parameter_size;
        const quant     = m.details?.quantization_level;

        return (
          <button key={m.name}
            onClick={() => onSelect({ id: m.name, name: m.name, source: 'local' })}
            className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-150 flex items-center gap-3 group ${
              isActive
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/40'
            }`}>

            {/* Llama emoji avatar */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${
              isActive ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-100 dark:bg-gray-800'
            }`}>
              🦙
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-semibold ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                  {baseName}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded-md font-mono font-medium flex-shrink-0 ${
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  {tag}
                </span>
                {isActive && (
                  <span className="text-xs px-1.5 py-0.5 rounded-md bg-blue-500 text-white font-semibold flex-shrink-0">active</span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">{family}</span>
                {paramSize && <span className="text-xs text-gray-400 dark:text-gray-500">· {paramSize}</span>}
                {quant     && <span className="text-xs font-mono text-gray-400 dark:text-gray-500">· {quant}</span>}
                {m.size    && <span className="text-xs text-gray-400 dark:text-gray-500">· {fmtSize(m.size)}</span>}
              </div>

              <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5">
                Modified {fmtDate(m.modified_at)}
              </p>
            </div>

            {isActive
              ? <CheckCircle2 size={16} className="text-blue-500 flex-shrink-0" />
              : <span className="text-xs text-gray-300 dark:text-gray-700 font-mono truncate max-w-[60px] opacity-0 group-hover:opacity-100 transition-opacity">
                  {m.digest.slice(7, 15)}
                </span>
            }
          </button>
        );
      })}
    </div>
  );
}
