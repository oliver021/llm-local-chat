import { CheckCircle2 } from '../Icons';
import type { ModelInfo, ProviderKey } from '../../services/modelDiscovery';

interface ModelListProps {
  models: ModelInfo[]; activeProvider: ProviderKey; activeModel: string;
  selectedProvider: ProviderKey; onSelect: (m: ModelInfo) => void;
}

export function ModelList({ models, activeProvider, activeModel, selectedProvider, onSelect }: ModelListProps) {
  const local  = models.filter((m) => m.source === 'local' || m.installed);
  const remote = models.filter((m) => m.source !== 'local' && !m.installed);

  const renderModel = (m: ModelInfo) => {
    const isActive = selectedProvider === activeProvider && m.id === activeModel;
    const isRemote = m.source === 'huggingface' || m.source === 'ollama-registry';
    return (
      <button key={m.id} onClick={() => onSelect(m)}
        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-150 flex items-start gap-3 ${
          isActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-100 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-gray-50 dark:hover:bg-gray-800/40'
        }`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium truncate ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>{m.name}</span>
            {isActive  && <span className="text-xs px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-semibold flex-shrink-0">active</span>}
            {m.installed && <span className="text-xs px-1.5 py-0.5 rounded-md bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex-shrink-0">installed</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {m.size && <span className="text-xs text-gray-400">{m.size}</span>}
            {m.quantization && <span className="text-xs text-gray-400 font-mono">{m.quantization}</span>}
            {isRemote && <span className="text-xs text-gray-300 dark:text-gray-600 italic">{m.source === 'huggingface' ? 'Hugging Face' : 'Ollama registry'}</span>}
          </div>
        </div>
        {isActive && <CheckCircle2 size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />}
      </button>
    );
  };

  return (
    <div className="space-y-1">
      {local.length > 0 && (
        <>
          {local.length < models.length && (
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 pb-1">Available locally</p>
          )}
          {local.map(renderModel)}
        </>
      )}
      {remote.length > 0 && (
        <>
          <div className="flex items-center gap-2 pt-3 pb-1 px-1">
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex-shrink-0">
              {local.length > 0 ? 'Suggestions' : 'Available'}
            </p>
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
          </div>
          {remote.map(renderModel)}
        </>
      )}
    </div>
  );
}
