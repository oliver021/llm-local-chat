import { Download } from '../../Icons';
import { COMMON_TAGS } from './constants';
import type { OllamaRegistryEntry } from '../../../services/modelDiscovery';

export function OllamaDetailPanel({ model, copied, onCopy, pullCmd }: {
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
