import React, { useState, useEffect, useCallback } from 'react';
import { X, Cpu, RefreshCw } from '../Icons';
import type { ProviderKey } from '../../hooks/useProvider';
import { PROVIDER_META } from '../../hooks/useProvider';
import {
  discoverModels,
  checkProviderStatus,
  type ModelInfo,
  type ConnectionStatus,
} from '../../services/modelDiscovery';
import { StatusDot } from './shared/StatusDot';
import { ProviderHint } from './shared/ProviderHint';
import { EmptyHint } from './shared/EmptyHint';
import { Spinner } from './shared/Spinner';
import { ErrorState } from './shared/ErrorState';
import { SubTabButton } from './shared/SubTabButton';
import { LocalModels } from './LocalModels';
import { HFBrowser } from './huggingface/HFBrowser';
import { OllamaInstalledList } from './ollama/OllamaInstalledList';
import { OllamaLibraryBrowser } from './ollama/OllamaLibraryBrowser';
import { ModelList } from './ModelList';

interface ModelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProvider: ProviderKey;
  activeModel: string;
  onSelect: (provider: ProviderKey, model: string) => void;
}

type LlamaCppTab = 'local' | 'hf-browse';
type OllamaTab    = 'installed' | 'library';

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  isOpen,
  onClose,
  activeProvider,
  activeModel,
  onSelect,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<ProviderKey>(activeProvider);
  const [llamaTab, setLlamaTab]   = useState<LlamaCppTab>('local');
  const [ollamaTab, setOllamaTab] = useState<OllamaTab>('installed');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Partial<Record<ProviderKey, ConnectionStatus>>>({});

  useEffect(() => {
    if (isOpen) {
      setSelectedProvider(activeProvider);
      setLlamaTab('local');
      setOllamaTab('installed');
    }
  }, [isOpen, activeProvider]);

  useEffect(() => {
    if (selectedProvider !== 'llm-llamacpp') setLlamaTab('local');
    if (selectedProvider !== 'llm-ollama')   setOllamaTab('installed');
  }, [selectedProvider]);

  useEffect(() => {
    if (!isOpen) return;
    const providers: ProviderKey[] = ['llm-llamacpp', 'llm-openai', 'llm-claude', 'llm-ollama'];
    providers.forEach((p) =>
      checkProviderStatus(p).then((status) =>
        setStatuses((prev) => ({ ...prev, [p]: status }))
      )
    );
  }, [isOpen]);

  const loadModels = useCallback((provider: ProviderKey) => {
    if (provider === 'llm-llamacpp') return;
    setLoading(true); setError(null); setModels([]);
    discoverModels(provider)
      .then(setModels)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isOpen && selectedProvider !== 'llm-llamacpp') loadModels(selectedProvider);
  }, [isOpen, selectedProvider, loadModels]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectModel = (model: ModelInfo) => { onSelect(selectedProvider, model.id); onClose(); };
  const isLlama  = selectedProvider === 'llm-llamacpp';
  const isOllama = selectedProvider === 'llm-ollama';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[80vh] max-h-[680px] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl flex overflow-hidden border border-gray-200 dark:border-gray-800 relative">

        <button onClick={onClose} aria-label="Close"
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors z-10">
          <X size={20} />
        </button>

        {/* ── Left sidebar ── */}
        <div className="w-56 bg-gray-50/50 dark:bg-gray-950/50 border-r border-gray-200 dark:border-gray-800 p-5 flex flex-col flex-shrink-0">
          <div className="flex items-center gap-2 mb-6 px-2">
            <Cpu size={18} className="text-blue-500" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Model</h2>
          </div>

          <nav className="flex flex-col gap-1">
            {PROVIDER_META.map(({ key, label }) => {
              const isActive = selectedProvider === key;
              const isCurrentProvider = activeProvider === key;
              return (
                <button key={key} onClick={() => setSelectedProvider(key)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-sm font-medium text-left ${
                    isActive
                      ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-gray-700'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 border border-transparent'
                  }`}>
                  <StatusDot status={statuses[key]} />
                  <span className="flex-1">{label}</span>
                  {isCurrentProvider && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs text-gray-400 dark:text-gray-500 px-2">
              Active: <span className="font-medium text-gray-600 dark:text-gray-300">
                {PROVIDER_META.find((p) => p.key === activeProvider)?.label}
              </span>
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 px-2 mt-1 truncate" title={activeModel}>
              {activeModel}
            </p>
          </div>
        </div>

        {/* ── Right content ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {PROVIDER_META.find((p) => p.key === selectedProvider)?.label} Models
                </h3>
                <ProviderHint provider={selectedProvider} status={statuses[selectedProvider]} />
              </div>
              {!isLlama && (
                <button onClick={() => loadModels(selectedProvider)} disabled={loading}
                  className="p-2 m-5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors disabled:opacity-40 mt-0.5"
                  title="Refresh">
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
              )}
            </div>

            {isLlama && (
              <div className="flex gap-1 mt-3">
                <SubTabButton active={llamaTab === 'local'} onClick={() => setLlamaTab('local')} icon={<span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />} label="Local" />
                <SubTabButton active={llamaTab === 'hf-browse'} onClick={() => setLlamaTab('hf-browse')} icon={<span className="text-sm">🔍</span>} label="Browse HuggingFace" />
              </div>
            )}

            {isOllama && (
              <div className="flex gap-1 mt-3">
                <SubTabButton active={ollamaTab === 'installed'} onClick={() => setOllamaTab('installed')} icon={<span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />} label="Installed" />
                <SubTabButton active={ollamaTab === 'library'} onClick={() => setOllamaTab('library')} icon={<span className="text-sm">🔍</span>} label="Ollama Library" />
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {isLlama ? (
              llamaTab === 'local'
                ? <LocalModels activeProvider={activeProvider} activeModel={activeModel} onSelect={handleSelectModel} />
                : <HFBrowser />
            ) : isOllama ? (
              ollamaTab === 'installed'
                ? <OllamaInstalledList activeModel={activeModel} onSelect={handleSelectModel} />
                : <OllamaLibraryBrowser />
            ) : (
              <div className="flex-1 overflow-y-auto p-4">
                {loading && <Spinner label="Loading models…" />}
                {!loading && error && <ErrorState message={error} onRetry={() => loadModels(selectedProvider)} />}
                {!loading && !error && models.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 gap-2 text-gray-400">
                    <p className="text-sm">No models found.</p>
                    <EmptyHint provider={selectedProvider} />
                  </div>
                )}
                {!loading && !error && models.length > 0 && (
                  <ModelList models={models} activeProvider={activeProvider} activeModel={activeModel}
                    selectedProvider={selectedProvider} onSelect={handleSelectModel} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
