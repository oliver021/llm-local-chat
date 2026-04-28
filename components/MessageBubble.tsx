import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types';
import { formatTime } from '../utils/timeUtils';
import { markdownComponents } from '../utils/markdownComponents';
import { useChatActions } from '../context/ChatContext';
import { useUIState } from '../hooks/useUIState';
import { MessageActionMenu } from './MessageActionMenu';
import { Sparkles } from './Icons';

// Placeholder avatar — extract to a user config / context if auth is added
const USER_AVATAR_URL = 'https://picsum.photos/100/100?random=1';

interface MessageBubbleProps {
  message: Message;
  chatId: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, chatId }) => {
  const isAI = message.role === 'ai';
  const [isEditing, setIsEditing] = React.useState(false);
  const [draftContent, setDraftContent] = React.useState(message.content);
  const editTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const { compactMode } = useUIState();

  const { handleCopyMessage, handleDeleteMessage, handleEditMessage, handleRegenerateMessage } =
    useChatActions();

  // Auto-focus + auto-size textarea on entering edit mode
  React.useLayoutEffect(() => {
    if (isEditing && editTextareaRef.current) {
      const el = editTextareaRef.current;
      el.focus();
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [isEditing]);

  const handleSaveEdit = React.useCallback(() => {
    if (draftContent.trim()) {
      handleEditMessage(chatId, message.id, draftContent.trim());
      setIsEditing(false);
    }
  }, [draftContent, chatId, message.id, handleEditMessage]);

  const handleCancelEdit = React.useCallback(() => {
    setDraftContent(message.content);
    setIsEditing(false);
  }, [message.content]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleSaveEdit(); }
      if (e.key === 'Escape')                             { e.preventDefault(); handleCancelEdit(); }
    },
    [handleSaveEdit, handleCancelEdit]
  );

  return (
    <div className={`w-full flex ${isAI ? 'justify-start' : 'justify-end'} ${compactMode ? 'mb-2' : 'mb-4'} animate-fade-in-up`}>
      <div className={`flex gap-2 ${isAI ? 'flex-row' : 'flex-row-reverse'} max-w-2xl group`}>

        {/* Avatar */}
        <div className="flex-shrink-0 mt-1">
          {isAI ? (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
              <Sparkles size={16} className="text-white" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden border border-gray-300 dark:border-gray-600">
              <img src={USER_AVATAR_URL} alt="User" loading="lazy" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* Message wrapper */}
        <div className="flex flex-col gap-1">
          {/* Content box */}
          <div className={`${
            message.isError
              ? 'bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/50'
              : isAI
                ? 'bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/80 border border-gray-200/60 dark:border-gray-700/50'
                : 'bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-500 dark:to-blue-700'
          } rounded-2xl px-4 py-2.5 max-w-xl shadow-sm`}>

            {/* Header: name · timestamp · edited badge */}
            <div className={`flex items-baseline gap-2 mb-1 text-xs ${isAI ? 'text-gray-500 dark:text-gray-400' : 'text-blue-100 dark:text-blue-200'}`}>
              <span className={`font-semibold text-sm ${isAI ? 'text-gray-800 dark:text-gray-200' : 'text-white'}`}>
                {isAI ? 'Aura' : 'You'}
              </span>
              <span>{formatTime(message.timestamp)}</span>
              {message.isEdited && <span className="italic">(edited)</span>}
            </div>

            {/* Body */}
            {isEditing && !isAI ? (
              <div className="w-full">
                <textarea
                  ref={editTextareaRef}
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-blue-400 rounded-md font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={handleSaveEdit} type="button"
                    className="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors">
                    Save
                  </button>
                  <button onClick={handleCancelEdit} type="button"
                    className="px-3 py-1 text-xs bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-md transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className={`text-sm leading-relaxed ${isAI ? 'text-gray-700 dark:text-gray-300' : 'text-white'}`}>
                {isAI ? (
                  <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown>
                ) : (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                )}
              </div>
            )}

            {/* Streaming cursor */}
            {message.isStreaming && (
              <span className="inline-block w-0.5 h-4 bg-blue-400 ml-0.5 align-middle animate-pulse" aria-label="AI is typing" />
            )}

            {/* Retry button for failed responses */}
            {message.isError && !message.isStreaming && (
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRegenerateMessage(chatId, message.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800/60 transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                  Retry
                </button>
              </div>
            )}
          </div>

          {/* Action menu + bookmark button */}
          {!message.isStreaming && !isEditing && (
            <div className={`flex items-center gap-1 ${isAI ? 'justify-start' : 'justify-end'} px-2 opacity-0 group-hover:opacity-100 transition-opacity`}>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('bookmark-message', { detail: { messageId: message.id, chatId } }))}
                className="p-1.5 rounded-md text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                title="Bookmark"
                aria-label="Bookmark message"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('rebranch-message', { detail: { messageId: message.id, chatId } }))}
                className="p-1.5 rounded-md text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                title="Branch from here"
                aria-label="Branch conversation from this message"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" />
                </svg>
              </button>
              <MessageActionMenu
                messageId={message.id}
                chatId={chatId}
                isAIMessage={isAI}
                onCopy={handleCopyMessage}
                onEdit={!isAI ? () => setIsEditing(true) : undefined}
                onDelete={handleDeleteMessage}
                onRegenerate={handleRegenerateMessage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
