import React, { useState, useRef, useEffect } from 'react';
import { Theme } from '../types';
import { Menu, Sun, Moon, Sparkles, Cpu } from './Icons';
import { useChatActions } from '../context/ChatContext';
import type { ProviderKey } from '../hooks/useProvider';
import { PROVIDER_META } from '../hooks/useProvider';
import { useBackendStatus } from '../hooks/useBackendStatus';

const ArchiveIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="5" rx="1" />
    <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
    <path d="M10 12h4" />
  </svg>
);

const LogOutIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const UserIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

interface TopNavProps {
  theme: Theme;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  currentChatTitle?: string;
  activeProvider?: ProviderKey;
  activeModel?: string;
  onOpenArchived: () => void;
  onOpenBookmarks: () => void;
  onOpenCopyChat: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  theme,
  toggleTheme,
  toggleSidebar,
  currentChatTitle,
  activeProvider,
  activeModel,
  onOpenArchived,
  onOpenBookmarks,
  onOpenCopyChat,
}) => {
  const { openModelSelector } = useChatActions();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const backendStatus = useBackendStatus();

  const providerLabel = activeProvider
    ? PROVIDER_META.find((p) => p.key === activeProvider)?.shortLabel
    : undefined;

  // Close dropdown on outside click
  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileOpen]);

  // Close on Escape
  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setProfileOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [profileOpen]);

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
        {/* Backend status dot */}
        {backendStatus === 'offline' && (
          <div
            className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0"
            title="Backend unreachable — check if the API server is running on port 3001"
            aria-label="Backend offline"
          />
        )}
        {backendStatus === 'online' && (
          <div
            className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"
            title="Backend connected"
            aria-label="Backend online"
          />
        )}

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

        {/* Profile avatar + dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(o => !o)}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-500 p-[2px] cursor-pointer hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
            aria-label="Profile menu"
            aria-expanded={profileOpen}
          >
            <div className="w-full h-full rounded-full border-2 border-white dark:border-gray-950 overflow-hidden">
              <img src="https://picsum.photos/100/100?random=1" alt="User" className="w-full h-full object-cover" />
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden py-1 z-50">
              {/* Profile info */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">My Account</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">Local session</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => { setProfileOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                  <UserIcon size={15} />
                  Profile
                </button>

                <button
                  onClick={() => { setProfileOpen(false); onOpenCopyChat(); }}
                  title="Duplicate current chat"
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy Chat
                </button>

                <button
                  onClick={() => { setProfileOpen(false); onOpenBookmarks(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                  Bookmarks
                </button>

                <button
                  onClick={() => { setProfileOpen(false); onOpenArchived(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                  <ArchiveIcon size={15} />
                  Archived Chats
                </button>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 py-1">
                <button
                  onClick={() => setProfileOpen(false)}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                  <LogOutIcon size={15} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
