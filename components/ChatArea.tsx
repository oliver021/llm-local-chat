import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { ChatSession } from '../types';
import { SUGGESTED_PROMPTS } from '../constants';
import { groupMessagesByDate } from '../utils/timeUtils';
import { useChatActions } from '../context/ChatContext';
import { ChatInput } from './ChatInput';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { Sparkles, ColorfulIcon } from './Icons';

interface ChatAreaProps {
  chat: ChatSession | null;
  isTyping?: boolean;
  // Forwarded ref so the global "/" shortcut can focus the input from App.tsx
  inputRef?: React.RefObject<HTMLTextAreaElement>;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ chat, isTyping, inputRef }) => {
  const { handleSendMessage } = useChatActions();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // True once the user intentionally scrolls up during an active stream
  const userScrolledUpRef = useRef(false);
  const isNewChat = !chat || chat.messages.length === 0;

  // Derived — single source of truth for streaming state
  const isStreaming = chat?.messages.some(m => m.isStreaming) ?? false;

  // Show the typing indicator while waiting for the server AND while the
  // placeholder message exists but hasn't received its first token yet.
  const streamingMsg = chat?.messages.find(m => m.isStreaming);
  const showTypingIndicator = isTyping || (streamingMsg != null && streamingMsg.content === '');

  const messageGroups = useMemo(() => {
    if (!chat || chat.messages.length === 0) return [];
    return groupMessagesByDate(chat.messages);
  }, [chat?.messages]);

  // When streaming ends, re-enable auto-scroll for the next exchange
  useEffect(() => {
    if (!isStreaming) userScrolledUpRef.current = false;
  }, [isStreaming]);

  // Auto-scroll: only when the user hasn't scrolled up mid-stream
  useEffect(() => {
    if (!userScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chat?.messages]);

  // Detect intentional upward scroll during streaming
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || !isStreaming) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distFromBottom > 80) {
      userScrolledUpRef.current = true;
    } else {
      // Back near the bottom — resume auto-scroll
      userScrolledUpRef.current = false;
    }
  }, [isStreaming]);

  return (
    // ChatArea Container: flex-1 fills remaining space after header
    // overflow-hidden: Prevents double scrollbars; internal divs handle scrolling
    <div className="flex-1 flex flex-col relative bg-white dark:bg-gray-950 overflow-hidden">
      {isNewChat ? (
        // ── Welcome / New-Chat view ─────────────────────────────────────────
        <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in-up overflow-y-auto">
          <div className="w-20 h-20 mb-8 rounded-3xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center shadow-inner">
            <ColorfulIcon icon={Sparkles} colorClass="text-blue-500 dark:text-blue-400" size={40} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-2 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
            How can I help you today?
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-center mb-12 max-w-md">
            I'm Aura, your creative and helpful AI assistant. Ask me anything.
          </p>

          <div className="w-full max-w-3xl">
            <ChatInput isCentered inputRef={inputRef} isStreaming={false} />
          </div>

          {/* Suggested prompts */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl w-full px-4">
            {SUGGESTED_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                className="text-left p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-800 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 text-sm text-gray-600 dark:text-gray-300"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        // ── Existing-chat view ──────────────────────────────────────────────
        <>
          <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
            <div className="max-w-2xl mx-auto flex flex-col pb-4">
              {messageGroups.map((group) => (
                <div key={group.date}>
                  {/* Date divider — sticky so it stays visible while scrolling */}
                  <div className="flex items-center gap-3 my-4 sticky top-0 bg-white dark:bg-gray-950 py-2 z-10">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2">
                      {group.date}
                    </span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                  </div>
                  <div className="space-y-2">
                    {group.messages.map((msg) => (
                      <MessageBubble key={msg.id} message={msg} chatId={chat!.id} />
                    ))}
                  </div>
                </div>
              ))}

              {/* Typing indicator: visible until first token renders */}
              {showTypingIndicator && <TypingIndicator />}

              {/* Scroll anchor — always kept at the bottom of the message list */}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Bottom input area with gradient fade */}
          <div className="p-4 bg-gradient-to-t from-white via-white to-transparent dark:from-gray-950 dark:via-gray-950 pt-8">
            <ChatInput inputRef={inputRef} isStreaming={isStreaming} />
          </div>
        </>
      )}
    </div>
  );
};
