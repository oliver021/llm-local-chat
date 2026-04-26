import React from 'react';
import { Theme } from '../types';
import { Menu, Sun, Moon, Sparkles, Cpu } from './Icons';
import { useChatActions } from '../context/ChatContext';
import type { ProviderKey } from '../hooks/useProvider';
import { PROVIDER_META } from '../hooks/useProvider';

interface TopNavProps {
  theme: Theme;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  currentChatTitle?: string;
  activeProvider?: ProviderKey;
  activeModel?: string;
}

export const TopNav: React.FC<TopNavProps> = ({
  theme,
  toggleTheme,
  toggleSidebar,
  currentChatTitle,
  activeProvider,
  activeModel,
}) => {
  const { openModelSelector } = useChatActions();

  const providerLabel = activeProvider
    ? PROVIDER_META.find((p) => p.key === activeProvider)?.shortLabel
    : undefined;

  return (
    <header className="h-16 flex-shrink-0 flex items-center justify-between px-4 md:px-6 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800/50 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 md:hidden transition-colors"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 hidden sm:block">
            Aura
          </span>
        </div>

        {currentChatTitle && (
          <>
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-2 hidden sm:block" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate max-w-[200px] sm:max-w-xs">
              {currentChatTitle}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Model selector button */}
        <button
          onClick={openModelSelector}
          title="Select model / provider"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
        >
          <Cpu size={16} />
          {providerLabel && (
            <span className="text-xs font-medium hidden sm:block">{providerLabel}</span>
          )}
          {activeModel && (
            <span className="text-xs text-gray-400 dark:text-gray-500 hidden md:block truncate max-w-[100px]">
              / {activeModel}
            </span>
          )}
        </button>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-500 p-[2px] cursor-pointer hover:shadow-md transition-shadow">
          <div className="w-full h-full rounded-full border-2 border-white dark:border-gray-950 overflow-hidden">
            <img src="https://picsum.photos/100/100?random=1" alt="User" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </header>
  );
};
