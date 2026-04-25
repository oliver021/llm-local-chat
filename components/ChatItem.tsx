import React from 'react';
import { ChatSession } from '../types';
import { MessageSquare, Pin } from './Icons';

interface ChatItemProps {
  chat: ChatSession;
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onTogglePin: (id: string) => void;
}

export const ChatItem: React.FC<ChatItemProps> = ({
  chat,
  activeChatId,
  onSelectChat,
  onTogglePin,
}) => {
  const isActive = chat.id === activeChatId;

  return (
    <div
      onClick={() => onSelectChat(chat.id)}
      className={`group relative flex items-center justify-between px-3 py-2.5 mx-2 rounded-xl cursor-pointer transition-all duration-200 ease-in-out
        ${
          isActive
            ? 'bg-blue-50 dark:bg-gray-800 text-blue-600 dark:text-blue-400 font-medium'
            : 'hover:bg-gray-100 dark:hover:bg-gray-850 text-gray-700 dark:text-gray-300'
        }`}
    >
      {/* Left accent bar — appears only on active item */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-blue-500 dark:bg-blue-400" />
      )}

      <div className="flex items-center gap-3 overflow-hidden">
        <MessageSquare
          size={16}
          className={`flex-shrink-0 transition-colors duration-200 ${isActive ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`}
        />
        <span className="truncate text-sm">{chat.title}</span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onTogglePin(chat.id);
        }}
        className={`transition-all duration-150 p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700
          ${chat.isPinned ? 'opacity-100 text-amber-500' : 'opacity-0 group-hover:opacity-100 text-gray-400'}`}
        title={chat.isPinned ? 'Unpin chat' : 'Pin chat'}
        aria-label={chat.isPinned ? 'Unpin chat' : 'Pin chat'}
      >
        <Pin size={14} className={chat.isPinned ? 'fill-current' : ''} />
      </button>
    </div>
  );
};
