import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, Cpu, AlertCircle, CheckCircle2, Loader2, RefreshCw,
  ExternalLink, Download, Search, Heart, Info, Star,
} from './Icons';
import type { ProviderKey } from '../hooks/useProvider';
import { PROVIDER_META } from '../hooks/useProvider';
import {
  discoverModels,
  fetchLlamaServerModels,
  fetchHuggingFaceGGUFs,
  fetchHFModelDetail,
  fetchOllamaInstalledModels,
  fetchOllamaRegistry,
  checkProviderStatus,
  formatDownloads,
  TRUSTED_AUTHORS,
  type ModelInfo,
  type HFModelDetail,
  type OllamaInstalledModel,
  type OllamaRegistryEntry,
  type ConnectionStatus,
} from '../services/modelDiscovery';

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
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors disabled:opacity-40 mt-0.5"
                  title="Refresh">
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
              )}
            </div>

            {isLlama && (
              <div className="flex gap-1 mt-3">
                <SubTabButton active={llamaTab === 'local'} onClick={() => setLlamaTab('local')} icon={<span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />} label="Local" />
                <SubTabButton active={llamaTab === 'hf-browse'} onClick={() => setLlamaTab('hf-browse')} icon={<Search size={13} />} label="Browse HuggingFace" />
              </div>
            )}

            {isOllama && (
              <div className="flex gap-1 mt-3">
                <SubTabButton active={ollamaTab === 'installed'} onClick={() => setOllamaTab('installed')} icon={<span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />} label="Installed" />
                <SubTabButton active={ollamaTab === 'library'} onClick={() => setOllamaTab('library')} icon={<Search size={13} />} label="Ollama Library" />
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {isLlama ? (
              llamaTab === 'local'
                ? <LocalModelList activeProvider={activeProvider} activeModel={activeModel} onSelect={handleSelectModel} />
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

// ── LocalModelList ──────────────────────────────────────────────────────────────

function LocalModelList({ activeProvider, activeModel, onSelect }: {
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

// ── HFBrowser ──────────────────────────────────────────────────────────────────

const TRUSTED_SET = new Set<string>(TRUSTED_AUTHORS);

function HFBrowser() {
  const [query, setQuery]           = useState('');
  const [trustedOnly, setTrusted]   = useState(true);
  const [models, setModels]         = useState<ModelInfo[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [openPopover, setOpenPopover]   = useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<string | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, number>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    setLoading(true); setError(null);
    fetchHuggingFaceGGUFs(q)
      .then(setModels)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { search(''); }, [search]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 400);
  };

  // Close popover on outside click
  useEffect(() => {
    if (!openPopover) return;
    const handler = () => setOpenPopover(null);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openPopover]);

  const visibleModels = trustedOnly
    ? models.filter((m) => TRUSTED_SET.has((m.hfRepoId ?? m.id).split('/')[0]))
    : models;

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Search + trusted switch */}
      <div className="px-4 pt-3 pb-2 space-y-2">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input type="text" value={query} onChange={handleQueryChange}
            placeholder="Search GGUF models…"
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors" />
          {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
        </div>

        {/* Trusted authors toggle */}
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <Star size={13} className="text-amber-400" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Trusted quantizers only</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">
              (bartowski, unsloth, TheBloke…)
            </span>
          </div>
          {/* Animated switch */}
          <button
            role="switch"
            aria-checked={trustedOnly}
            onClick={() => setTrusted((v) => !v)}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              trustedOnly ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out ${
              trustedOnly ? 'translate-x-4' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {!loading && error && <ErrorState message={error} onRetry={() => search(query)} />}

        {!loading && !error && visibleModels.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-gray-400">
            <Search size={24} />
            <p className="text-sm">
              {trustedOnly && models.length > 0
                ? 'No trusted-author results. Try turning off the filter.'
                : `No GGUF models found${query ? ` for "${query}"` : ''}.`}
            </p>
          </div>
        )}

        {visibleModels.map((model) => {
          const repoId = model.hfRepoId ?? model.id;
          const allFiles = [model, ...(model.allVariants ?? [])];
          const variantIdx = selectedVariants[repoId] ?? 0;
          const selectedFile = allFiles[Math.min(variantIdx, allFiles.length - 1)];
          const isPopoverOpen   = openPopover === repoId;
          const isDetailOpen    = expandedDetail === repoId;
          const isTrusted = TRUSTED_SET.has(repoId.split('/')[0]);

          return (
            <div key={repoId}
              className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/40 transition-colors overflow-hidden">

              {/* Card header row */}
              <div className="p-3 flex items-start gap-3">
                <AuthorAvatar src={model.authorAvatar} name={repoId} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={repoId}>
                          {model.name}
                        </p>
                        {isTrusted && (
                          <span title="Trusted quantizer" className="flex-shrink-0">
                            <Star size={11} className="text-amber-400 fill-amber-400" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        by{' '}
                        <a href={`https://huggingface.co/${repoId.split('/')[0]}`} target="_blank" rel="noreferrer"
                          className="hover:text-blue-500 transition-colors" onClick={(e) => e.stopPropagation()}>
                          {repoId.split('/')[0]}
                        </a>
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Detail toggle */}
                      <button
                        onClick={() => setExpandedDetail(isDetailOpen ? null : repoId)}
                        title="Model details"
                        className={`p-1.5 rounded-lg transition-colors ${
                          isDetailOpen
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'
                            : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300'
                        }`}>
                        <Info size={14} />
                      </button>

                      {/* Download popover */}
                      <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenPopover(isPopoverOpen ? null : repoId)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            isPopoverOpen
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400'
                          }`}>
                          <Download size={13} />
                          Install
                        </button>
                        {isPopoverOpen && (
                          <DownloadPopover model={selectedFile} onClose={() => setOpenPopover(null)} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quantization chips */}
                  {allFiles.length > 1 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {allFiles.map((f, i) => (
                        <button key={f.id}
                          onClick={() => setSelectedVariants((prev) => ({ ...prev, [repoId]: i }))}
                          title={f.id}
                          className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-medium transition-colors ${
                            i === variantIdx
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}>
                          {f.quantization ?? f.id.split('.')[0].slice(-8)}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Stats row */}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {model.downloads !== undefined && (
                      <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                        <Download size={11} />{formatDownloads(model.downloads)}
                      </span>
                    )}
                    {model.likes !== undefined && (
                      <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                        <Heart size={11} />{formatDownloads(model.likes)}
                      </span>
                    )}
                    {selectedFile.size && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">{selectedFile.size}</span>
                    )}
                    <a href={`https://huggingface.co/${repoId}`} target="_blank" rel="noreferrer"
                      className="text-xs text-blue-500 hover:underline flex items-center gap-0.5 ml-auto"
                      onClick={(e) => e.stopPropagation()}>
                      HF <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              </div>

              {/* Expandable detail panel */}
              {isDetailOpen && (
                <ModelDetailPanel repoId={repoId} allVariants={allFiles}
                  selectedVariantIdx={variantIdx}
                  onSelectVariant={(i) => setSelectedVariants((prev) => ({ ...prev, [repoId]: i }))} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── ModelDetailPanel ───────────────────────────────────────────────────────────

function ModelDetailPanel({ repoId, allVariants, selectedVariantIdx, onSelectVariant }: {
  repoId: string;
  allVariants: ModelInfo[];
  selectedVariantIdx: number;
  onSelectVariant: (i: number) => void;
}) {
  const [detail, setDetail]   = useState<HFModelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); setError(null);
    fetchHFModelDetail(repoId)
      .then(setDetail)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [repoId]);

  // Derive architecture from tags (e.g. "llama", "mistral", "phi", "qwen", "gemma")
  const archTags = detail?.tags.filter((t) =>
    ['llama', 'mistral', 'phi', 'qwen', 'gemma', 'falcon', 'mpt', 'bloom',
     'gpt2', 'gptj', 'gpt-neox', 'mamba', 'rwkv', 'deepseek', 'yi', 'baichuan',
     'internlm', 'starcoder', 'codellama', 'vicuna', 'wizardlm'].includes(t.toLowerCase())
  ) ?? [];

  // Full GGUF file list from siblings (detail API always returns them)
  const detailGgufFiles = detail?.siblings.filter((s) => s.rfilename.endsWith('.gguf')) ?? [];

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return iso; }
  };

  return (
    <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 px-4 py-4">
      {loading && (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Loader2 size={14} className="animate-spin" /> Loading details…
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {detail && (
        <div className="space-y-4">
          {/* Meta row */}
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {detail.pipeline_tag && (
              <MetaItem label="Task" value={detail.pipeline_tag.replace(/-/g, ' ')} />
            )}
            {detail.cardData?.license && (
              <MetaItem label="License" value={detail.cardData.license.toUpperCase()} />
            )}
            {archTags.length > 0 && (
              <MetaItem label="Architecture" value={archTags.join(', ')} />
            )}
            {detail.cardData?.language && detail.cardData.language.length > 0 && (
              <MetaItem label="Language" value={detail.cardData.language.slice(0, 4).join(', ')} />
            )}
            <MetaItem label="Updated" value={formatDate(detail.lastModified)} />
          </div>

          {/* GGUF file list — from detail API (has real siblings) */}
          {detailGgufFiles.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                Available files ({detailGgufFiles.length})
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {detailGgufFiles.map((file) => {
                  const sizeMB = file.size ? Math.round(file.size / 1024 / 1024) : undefined;
                  const sizeStr = sizeMB
                    ? sizeMB > 1024 ? `${(sizeMB / 1024).toFixed(1)} GB` : `${sizeMB} MB`
                    : null;
                  const quant = extractQuantLabel(file.rfilename);
                  // Match against allVariants by filename to determine selection
                  const variantMatch = allVariants.findIndex((v) => v.id === file.rfilename);
                  const isSelected = variantMatch !== -1 && variantMatch === selectedVariantIdx;

                  return (
                    <button key={file.rfilename}
                      onClick={() => variantMatch !== -1 && onSelectVariant(variantMatch)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors text-left ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}>
                      <span className="font-mono truncate flex-1 mr-2">{file.rfilename}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {quant && <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-mono">{quant}</span>}
                        {sizeStr && <span className="text-gray-400">{sizeStr}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tags */}
          {detail.tags.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Tags</p>
              <div className="flex flex-wrap gap-1">
                {detail.tags.slice(0, 16).map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 font-mono">
                    {tag}
                  </span>
                ))}
                {detail.tags.length > 16 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 self-center">
                    +{detail.tags.length - 16} more
                  </span>
                )}
              </div>
            </div>
          )}

          <a href={`https://huggingface.co/${repoId}`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-500 hover:underline">
            View full model card on HuggingFace <ExternalLink size={11} />
          </a>
        </div>
      )}
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5 capitalize">{value}</p>
    </div>
  );
}

function extractQuantLabel(filename: string): string | undefined {
  const m = filename.match(/[Qq][0-9][_KMkm0-9]*/);
  return m ? m[0].toUpperCase() : undefined;
}

// ── AuthorAvatar ───────────────────────────────────────────────────────────────

function AuthorAvatar({ src, name }: { src?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const initial = name.charAt(0).toUpperCase();

  if (!src || failed) {
    return (
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
        {initial}
      </div>
    );
  }
  return (
    <img src={src} alt={name} onError={() => setFailed(true)}
      className="w-10 h-10 rounded-xl object-cover flex-shrink-0 bg-gray-100 dark:bg-gray-800" />
  );
}

// ── DownloadPopover ────────────────────────────────────────────────────────────

function DownloadPopover({ model, onClose }: { model: ModelInfo; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const llamaCmd = model.hfRepoId
    ? `./llama-cli --hf-repo ${model.hfRepoId} --hf-file ${model.id}`
    : '# model id unavailable';

  const handleCopy = () => {
    navigator.clipboard.writeText(llamaCmd).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate" title={model.id}>{model.id}</p>
        {model.size && <p className="text-xs text-gray-400 mt-0.5">{model.size}</p>}
      </div>

      <div className="p-4 space-y-3">
        {model.downloadUrl && (
          <a href={model.downloadUrl} download={model.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 transition-colors group"
            onClick={onClose}>
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
              <Download size={14} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Browser download</p>
              <p className="text-xs text-blue-500 dark:text-blue-400 opacity-70">Saves to your Downloads folder</p>
            </div>
            <ExternalLink size={14} className="opacity-50 group-hover:opacity-100" />
          </a>
        )}

        <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">llama-cli</p>
            <button onClick={handleCopy}
              className={`text-xs px-2 py-0.5 rounded-md transition-colors ${
                copied
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <div className="px-3 py-2 bg-gray-900 dark:bg-gray-950">
            <code className="text-xs text-green-400 font-mono break-all leading-relaxed">{llamaCmd}</code>
          </div>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
          Place the <code className="font-mono text-[11px] px-1 rounded bg-gray-100 dark:bg-gray-800">.gguf</code> file
          in your <code className="font-mono text-[11px] px-1 rounded bg-gray-100 dark:bg-gray-800">models/</code> folder,
          then restart llama-server.
        </p>
      </div>
    </div>
  );
}

// ── OllamaInstalledList ────────────────────────────────────────────────────────

function OllamaInstalledList({ activeModel, onSelect }: {
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

// ── OllamaLibraryBrowser ───────────────────────────────────────────────────────

function OllamaLibraryBrowser() {
  const [query, setQuery]         = useState('');
  const [models, setModels]       = useState<OllamaRegistryEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [expandedModel, setExpanded] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    setLoading(true); setError(null);
    fetchOllamaRegistry(q)
      .then((results) => {
        // If the registry is unreachable, results will be [] — show helpful empty state
        setModels(results);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { search(''); }, [search]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 400);
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Search */}
      <div className="px-4 pt-3 pb-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input type="text" value={query} onChange={handleQueryChange}
            placeholder="Search Ollama library…"
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors" />
          {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {!loading && error && <ErrorState message={error} onRetry={() => search(query)} />}

        {!loading && !error && models.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-center px-4">
            <span className="text-4xl">🦙</span>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {query ? `No models found for "${query}"` : 'Ollama registry unavailable.'}
            </p>
            {!query && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Check your connection — the registry is fetched from ollama.com.
              </p>
            )}
          </div>
        )}

        {models.map((model) => (
          <OllamaModelCard
            key={model.name}
            model={model}
            isExpanded={expandedModel === model.name}
            onToggleExpand={() => setExpanded(expandedModel === model.name ? null : model.name)}
          />
        ))}
      </div>
    </div>
  );
}

// ── OllamaModelCard ────────────────────────────────────────────────────────────

function OllamaModelCard({ model, isExpanded, onToggleExpand }: {
  model: OllamaRegistryEntry;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const pullCmd = (tag?: string) =>
    tag ? `ollama pull ${model.name}:${tag}` : `ollama pull ${model.name}`;

  const copyPull = (tag?: string) => {
    const cmd = pullCmd(tag);
    navigator.clipboard.writeText(cmd).then(() => {
      setCopied(tag ?? '__default');
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const fmtDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return iso; }
  };

  return (
    <div className={`rounded-xl border transition-colors overflow-hidden ${
      isExpanded
        ? 'border-purple-200 dark:border-purple-800'
        : 'border-gray-100 dark:border-gray-800'
    } bg-white dark:bg-gray-800/40`}>

      {/* Card row */}
      <div className="p-3 flex items-start gap-3">
        {/* Emoji avatar */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center flex-shrink-0 text-lg select-none">
          🦙
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{model.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                {model.description || 'No description available.'}
              </p>
            </div>

            {/* Info / expand toggle */}
            <button
              onClick={onToggleExpand}
              title={isExpanded ? 'Collapse' : 'Show details & install'}
              className={`p-1.5 rounded-lg transition-colors flex-shrink-0 mt-0.5 ${
                isExpanded
                  ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-500'
                  : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300'
              }`}>
              <Info size={14} />
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              <Download size={11} /> {formatDownloads(model.pulls)}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {model.tags} variant{model.tags !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Updated {fmtDate(model.updated_at)}
            </span>
            <a href={`https://ollama.com/library/${model.name}`} target="_blank" rel="noreferrer"
              className="text-xs text-purple-500 hover:underline flex items-center gap-0.5 ml-auto"
              onClick={(e) => e.stopPropagation()}>
              Library <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <OllamaDetailPanel
          model={model}
          copied={copied}
          onCopy={copyPull}
          pullCmd={pullCmd}
        />
      )}
    </div>
  );
}

// ── OllamaDetailPanel ──────────────────────────────────────────────────────────

/** Common Ollama model size tags shown as quick-install chips */
const COMMON_TAGS: Record<string, string[]> = {
  'default':   ['latest', '8b', '70b'],
  'llama3':    ['latest', '8b', '70b', '8b-instruct', '70b-instruct'],
  'llama3.1':  ['latest', '8b', '70b', '405b'],
  'llama3.2':  ['latest', '1b', '3b'],
  'mistral':   ['latest', '7b'],
  'qwen2':     ['latest', '0.5b', '1.5b', '7b', '72b'],
  'qwen2.5':   ['latest', '0.5b', '1.5b', '3b', '7b', '14b', '32b', '72b'],
  'phi4':      ['latest'],
  'gemma2':    ['latest', '2b', '9b', '27b'],
  'gemma3':    ['latest', '1b', '4b', '12b', '27b'],
  'deepseek':  ['latest', '7b', '67b'],
  'codellama': ['latest', '7b', '13b', '34b', '70b'],
  'phi3':      ['latest', 'mini', 'medium'],
};

function OllamaDetailPanel({ model, copied, onCopy, pullCmd }: {
  model: OllamaRegistryEntry;
  copied: string | null;
  onCopy: (tag?: string) => void;
  pullCmd: (tag?: string) => string;
}) {
  // Pick the closest known tag set, falling back to defaults
  const tags = COMMON_TAGS[model.name] ?? COMMON_TAGS['default'];

  return (
    <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 px-4 py-4 space-y-4">

      {/* Quick pull chips */}
      <div>
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
          Quick install
        </p>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const isCopied = copied === tag;
            return (
              <button key={tag}
                onClick={() => onCopy(tag)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  isCopied
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-purple-300 dark:hover:border-purple-700 hover:text-purple-600 dark:hover:text-purple-400'
                }`}>
                {isCopied ? '✓' : <Download size={11} />}
                <span className="font-mono">{model.name}:{tag}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Default pull command */}
      <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            ollama pull
          </p>
          <button
            onClick={() => onCopy()}
            className={`text-xs px-2 py-0.5 rounded-md transition-colors ${
              copied === '__default'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}>
            {copied === '__default' ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <div className="px-3 py-2 bg-gray-900 dark:bg-gray-950">
          <code className="text-xs text-green-400 font-mono">{pullCmd()}</code>
        </div>
      </div>

      {/* Custom tag hint */}
      <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
        This model has <span className="font-medium text-gray-600 dark:text-gray-300">{model.tags} variants</span> (parameter sizes and quantizations).
        Specify a tag like <code className="font-mono text-[11px] px-1 rounded bg-gray-100 dark:bg-gray-800">{model.name}:8b</code> or
        browse all at{' '}
        <a href={`https://ollama.com/library/${model.name}/tags`} target="_blank" rel="noreferrer"
          className="text-purple-500 hover:underline">
          ollama.com/library/{model.name}/tags
        </a>.
      </p>
    </div>
  );
}

// ── Shared primitives ──────────────────────────────────────────────────────────

function SubTabButton({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent'
      }`}>
      {icon}{label}
    </button>
  );
}

function StatusDot({ status }: { status: ConnectionStatus | undefined }) {
  const color =
    !status || status === 'unknown' ? 'bg-gray-300 dark:bg-gray-600'
    : status === 'connected'       ? 'bg-green-400'
    : status === 'no-key'          ? 'bg-yellow-400'
    : 'bg-red-400';
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />;
}

function ProviderHint({ provider, status }: { provider: ProviderKey; status?: ConnectionStatus }) {
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

function EmptyHint({ provider }: { provider: ProviderKey }) {
  if (provider === 'llm-ollama') {
    return (
      <p className="text-xs text-center">
        Run <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-xs">ollama pull llama3.1</code> to add a model.
      </p>
    );
  }
  return null;
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-gray-400">
      <Loader2 size={24} className="animate-spin mr-2" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-32 gap-3 text-center px-4">
      <AlertCircle size={28} className="text-red-400" />
      <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
      <button onClick={onRetry} className="text-xs text-blue-500 hover:underline">Try again</button>
    </div>
  );
}

interface ModelListProps {
  models: ModelInfo[]; activeProvider: ProviderKey; activeModel: string;
  selectedProvider: ProviderKey; onSelect: (m: ModelInfo) => void;
}

function ModelList({ models, activeProvider, activeModel, selectedProvider, onSelect }: ModelListProps) {
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
