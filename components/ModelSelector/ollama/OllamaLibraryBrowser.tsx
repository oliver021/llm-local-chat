import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Search } from '../../Icons';
import { fetchOllamaRegistry } from '../../../services/modelDiscovery';
import { ErrorState } from '../shared/ErrorState';
import { OllamaModelCard } from './OllamaModelCard';
import type { OllamaRegistryEntry } from '../../../services/modelDiscovery';

export function OllamaLibraryBrowser() {
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
