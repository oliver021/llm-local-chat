import React from 'react';
import { useSettingsContext } from '../../context/SettingsContext';
import { SettingToggle } from '../SettingToggle';
import { WebSearchProvider } from '../../types';

const PROVIDERS: { value: WebSearchProvider; label: string; description: string }[] = [
  { value: 'tavily', label: 'Tavily', description: 'AI-optimized search API' },
  { value: 'serpapi', label: 'SerpAPI', description: 'Google & Bing results' },
  { value: 'brave', label: 'Brave Search', description: 'Privacy-focused search' },
];

export const WebSearchTab: React.FC = () => {
  const { webSearch, updateWebSearch } = useSettingsContext();

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">Web Search</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Allow the assistant to search the web to answer questions.</p>
      </div>

      <SettingToggle
        label="Enable Web Search"
        description="Augment responses with real-time web results."
        checked={webSearch.enabled}
        onToggle={() => updateWebSearch({ enabled: !webSearch.enabled })}
      />

      {webSearch.enabled && (
        <>
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Search Provider</h4>
            <div className="space-y-2">
              {PROVIDERS.map(p => (
                <button
                  key={p.value}
                  onClick={() => updateWebSearch({ provider: p.value })}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all ${
                    webSearch.provider === p.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white text-sm">{p.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{p.description}</div>
                  </div>
                  {webSearch.provider === p.value && (
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">API Key</h4>
            <input
              type="password"
              value={webSearch.apiKey}
              onChange={e => updateWebSearch({ apiKey: e.target.value })}
              placeholder="Paste your API key here"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500">Stored locally in your browser only.</p>
          </div>
        </>
      )}
    </div>
  );
};
