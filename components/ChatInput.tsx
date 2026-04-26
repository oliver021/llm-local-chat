import React, { useState, useRef, useEffect } from 'react';
import { useChatActions } from '../context/ChatContext';
import { Send, Plus, Square } from './Icons';

const MAX_INPUT_LENGTH  = 4000;
const INPUT_WARN_THRESHOLD = 3500;

interface ChatInputProps {
  isCentered?: boolean;
  // Optional ref forwarded from App so the "/" shortcut can focus the input
  inputRef?: React.RefObject<HTMLTextAreaElement>;
  // Whether an AI response is currently streaming (disables send)
  isStreaming?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ isCentered = false, inputRef, isStreaming = false }) => {
  const { handleSendMessage, handleStopStreaming } = useChatActions();
  const [input, setInput] = useState('');

  // Use the forwarded ref if provided, otherwise create a local one
  const localRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = (inputRef ?? localRef) as React.RefObject<HTMLTextAreaElement>;

  const handleSend = () => {
    if (input.trim()) {
      handleSendMessage(input.trim());
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter sends, Shift+Enter inserts a newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea up to 200px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  return (
    <div
      className={`w-full max-w-3xl mx-auto transition-all duration-500 ease-in-out ${isCentered ? 'scale-105' : 'scale-100'}`}
    >
      <div className="relative flex items-center gap-2 bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-700 rounded-3xl p-2 shadow-sm focus-within:shadow-md focus-within:border-blue-300 dark:focus-within:border-blue-500/50 transition-all">
        <button
          type="button"
          className="p-3 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0"
          aria-label="Attach file"
        >
          <Plus size={20} />
        </button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT_LENGTH))}
          onKeyDown={handleKeyDown}
          placeholder="Message Aura…"
          rows={1}
          className="w-full max-h-[200px] py-3 px-2 bg-transparent border-none focus:ring-0 resize-none text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-base leading-relaxed"
        />

        {isStreaming ? (
          <button
            type="button"
            onClick={handleStopStreaming}
            aria-label="Stop generating"
            className="flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            <Square size={16} className="fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim()}
            aria-label="Send message"
            className={`flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 transition-all duration-200 ${
              input.trim()
                ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg hover:scale-105'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send size={20} className="transition-transform" />
          </button>
        )}
      </div>

      {/* Shortcut hint line + character counter */}
      <div className="flex items-center justify-between mt-3 px-1">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          Aura can make mistakes. Consider verifying important information.
        </span>
        <div className="flex items-center gap-4">
          {/* Character counter */}
          <span className={`text-xs font-mono ${
            input.length > MAX_INPUT_LENGTH
              ? 'text-red-600 dark:text-red-400'
              : input.length > INPUT_WARN_THRESHOLD
              ? 'text-orange-600 dark:text-orange-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}>
            {input.length} / {MAX_INPUT_LENGTH}
          </span>
          {/* Shortcuts hint */}
          <span className="text-xs text-gray-300 dark:text-gray-600 hidden sm:block">
            <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-[10px]">⌘K</kbd> new chat
            &nbsp;·&nbsp;
            <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-[10px]">/</kbd> focus
          </span>
        </div>
      </div>
    </div>
  );
};
