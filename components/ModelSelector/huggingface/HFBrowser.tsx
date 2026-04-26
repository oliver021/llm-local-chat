import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Search, Star, Download, Heart, ExternalLink, Info } from '../../Icons';
import { fetchHuggingFaceGGUFs, TRUSTED_AUTHORS, formatDownloads } from '../../../services/modelDiscovery';
import { ErrorState } from '../shared/ErrorState';
import { AuthorAvatar } from './AuthorAvatar';
import { DownloadPopover } from './DownloadPopover';
import { ModelDetailPanel } from './ModelDetailPanel';
import type { ModelInfo } from '../../../services/modelDiscovery';

const TRUSTED_SET = new Set<string>(TRUSTED_AUTHORS);

export function HFBrowser() {
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
