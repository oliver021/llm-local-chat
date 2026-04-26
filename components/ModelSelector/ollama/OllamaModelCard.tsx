import { useState } from 'react';
import { Download, Info, ExternalLink } from '../../Icons';
import { formatDownloads } from '../../../services/modelDiscovery';
import { OllamaDetailPanel } from './OllamaDetailPanel';
import type { OllamaRegistryEntry } from '../../../services/modelDiscovery';

export function OllamaModelCard({ model, isExpanded, onToggleExpand }: {
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
