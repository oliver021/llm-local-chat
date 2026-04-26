import React from 'react';
import { ChatSession } from '../types';
import { Plus, Settings, ColorfulIcon, Sparkles } from './Icons';
import { ChatItem } from './ChatItem';

interface SidebarProps {
  chats: ChatSession[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onTogglePin: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onOpenSettings: () => void;
  isOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onTogglePin,
  onDeleteChat,
  onRenameChat,
  onOpenSettings,
  isOpen,
}) => {
  const pinnedChats = chats.filter((c) => c.isPinned).sort((a, b) => b.updatedAt - a.updatedAt);
  const recentChats = chats.filter((c) => !c.isPinned).sort((a, b) => b.updatedAt - a.updatedAt);

  // SCROLLBAR WIDTH COMPENSATION (see index.html scrollbar-gutter: stable):
  // On desktop (md:), when ChatArea scrolls, its scrollbar (~17px) appears.
  // Without compensation, sidebar visually "expands" making a gap between sidebar border and scrollbar.
  // Solution: CSS scrollbar-gutter: stable reserves scrollbar space to prevent layout shift.

  return (
    <aside
      aria-label="Chat sessions"
      className={`
      fixed inset-y-0 left-0 z-20 flex flex-col w-72 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      md:relative md:translate-x-0
    `}
    >
      {/* Header / New Chat Button */}
      <div className="p-4">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500/50 transition-all duration-300 group"
        >
          <ColorfulIcon
            icon={Sparkles}
            colorClass="text-blue-500 dark:text-blue-400 group-hover:animate-pulse-slow"
            size={20}
          />
          <span className="font-medium tracking-tight text-gray-800 dark:text-gray-100">New Chat</span>
          <Plus size={18} className="ml-auto text-gray-400 group-hover:text-blue-500 transition-colors" />
        </button>
      </div>

      {/* Chat Lists */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-4">
        {chats.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center mb-4">
              <Sparkles size={24} className="text-blue-500 dark:text-blue-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">No conversations yet</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Start a new chat to begin</p>
            <kbd className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-800 font-mono text-gray-600 dark:text-gray-400">⌘K</kbd>
          </div>
        ) : (
          <>
            {pinnedChats.length > 0 && (
              <div className="mb-6">
                <div className="px-5 py-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                  Pinned
                </div>
                <ul className="space-y-0.5" role="list">
                  {pinnedChats.map((chat) => (
                    <li key={chat.id}>
                      <ChatItem
                        chat={chat}
                        activeChatId={activeChatId}
                        onSelectChat={onSelectChat}
                        onTogglePin={onTogglePin}
                        onDeleteChat={onDeleteChat}
                        onRenameChat={onRenameChat}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <div className="px-5 py-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Recent
              </div>
              <ul className="space-y-0.5" role="list">
                {recentChats.map((chat) => (
                  <li key={chat.id}>
                    <ChatItem
                      chat={chat}
                      activeChatId={activeChatId}
                      onSelectChat={onSelectChat}
                      onTogglePin={onTogglePin}
                      onDeleteChat={onDeleteChat}
                      onRenameChat={onRenameChat}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl hover:bg-gray-100 dark:hover:bg-gray-850 text-gray-700 dark:text-gray-300 transition-colors"
        >
          <Settings size={18} className="text-gray-500" />
          <span className="text-sm font-normal tracking-tight">Settings</span>
        </button>
      </div>
    </aside>
  );
};
