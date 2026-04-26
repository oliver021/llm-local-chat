import { useState, useEffect } from 'react';
import { Download, ExternalLink } from '../../Icons';
import type { ModelInfo } from '../../../services/modelDiscovery';

export function DownloadPopover({ model, onClose }: { model: ModelInfo; onClose: () => void }) {
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
