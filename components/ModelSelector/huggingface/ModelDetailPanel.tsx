import { useState, useEffect } from 'react';
import { Loader2, ExternalLink } from '../../Icons';
import { fetchHFModelDetail } from '../../../services/modelDiscovery';
import { extractQuantLabel, MetaItem } from './utils';
import type { ModelInfo, HFModelDetail } from '../../../services/modelDiscovery';

export function ModelDetailPanel({ repoId, allVariants, selectedVariantIdx, onSelectVariant }: {
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
