import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { ChatSession, Message } from '../types';
import { MOCK_CHATS } from '../constants';
import { getStreamFn } from '../services/providerDispatch';
import type { ProviderKey } from './useProvider';
import { getStoredChats, setStoredChats, clearAllStorage } from '../utils/storage';
import { makeChatTitle } from '../utils/chatUtils';

interface UseChatsResult {
  chats: ChatSession[];
  activeChatId: string | null;
  activeChat: ChatSession | null;
  isTyping: boolean;
  handleNewChat: () => void;
  handleSelectChat: (id: string) => void;
  handleTogglePin: (id: string) => void;
  handleDeleteChat: (id: string) => void;
  handleRenameChat: (id: string, newTitle: string) => void;
  handleStopStreaming: () => void;
  handleSendMessage: (content: string) => void;
  handleCopyMessage: (messageId: string) => void;
  handleDeleteMessage: (chatId: string, messageId: string) => void;
  handleEditMessage: (chatId: string, messageId: string, newContent: string) => void;
  handleRegenerateMessage: (chatId: string, messageId: string) => void;
  handleClearHistory: () => void;
}

export function useChats(
  onMobileNavigate?: () => void,
  activeProvider: ProviderKey = 'llm-llamacpp',
  activeModel = 'model.gguf'
): UseChatsResult {
  const [chats, setChats] = useState<ChatSession[]>(() => getStoredChats(MOCK_CHATS));
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // isTyping = true only during the initial delay before the first token arrives
  const [isTyping, setIsTyping] = useState(false);

  // cancelStream holds the abort function returned by streamMockAiResponse.
  const cancelStreamRef = useRef<(() => void) | null>(null);

  // Persist chats to localStorage whenever they change
  useEffect(() => {
    setStoredChats(chats);
  }, [chats]);

  // Cancel any in-flight stream on unmount
  useEffect(() => {
    return () => { cancelStreamRef.current?.(); };
  }, []);

  // ── Private helper ─────────────────────────────────────────────────────────
  /** Cancels any running stream and resets the typing indicator. */
  const cancelActiveStream = useCallback(() => {
    cancelStreamRef.current?.();
    cancelStreamRef.current = null;
    setIsTyping(false);
  }, []);

  // ── Navigation handlers ────────────────────────────────────────────────────

  const handleNewChat = useCallback(() => {
    cancelActiveStream();
    const newChat: ChatSession = {
      id: `chat-${Date.now()}`,
      title: 'New Chat',
      isPinned: false,
      updatedAt: Date.now(),
      messages: [],
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    if (window.innerWidth < 768) onMobileNavigate?.();
  }, [cancelActiveStream, onMobileNavigate]);

  const handleSelectChat = useCallback(
    (id: string) => {
      cancelActiveStream();
      setActiveChatId(id);
      if (window.innerWidth < 768) onMobileNavigate?.();
    },
    [cancelActiveStream, onMobileNavigate]
  );

  const handleTogglePin = useCallback((id: string) => {
    setChats((prev) =>
      prev.map((chat) => (chat.id === id ? { ...chat, isPinned: !chat.isPinned } : chat))
    );
  }, []);

  const handleDeleteChat = useCallback((id: string) => {
    setChats((prev) => prev.filter((chat) => chat.id !== id));
    setActiveChatId((prev) => (prev === id ? null : prev));
    toast.success('Conversation deleted');
  }, []);

  const handleRenameChat = useCallback((id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setChats((prev) =>
      prev.map((chat) => (chat.id === id ? { ...chat, title: trimmed } : chat))
    );
  }, []);

  // Stop current stream immediately; keep any partial content already received.
  const handleStopStreaming = useCallback(() => {
    cancelStreamRef.current?.();
    cancelStreamRef.current = null;
    setIsTyping(false);
    // Finalize any message still marked as streaming — preserve partial content.
    setChats((prev) =>
      prev.map((chat) => ({
        ...chat,
        messages: chat.messages.map((msg) =>
          msg.isStreaming ? { ...msg, isStreaming: false } : msg
        ),
      }))
    );
  }, []);

  // ── Messaging handlers ─────────────────────────────────────────────────────

  const handleSendMessage = useCallback(
    (content: string) => {
      cancelActiveStream();

      let currentChatId = activeChatId;

      // If no active chat, create one inline
      if (!currentChatId) {
        const newChat: ChatSession = {
          id: `chat-${Date.now()}`,
          title: makeChatTitle(content),
          isPinned: false,
          updatedAt: Date.now(),
          messages: [],
        };
        setChats((prev) => [newChat, ...prev]);
        currentChatId = newChat.id;
        setActiveChatId(currentChatId);
      }

      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content,
        timestamp: Date.now(),
      };

      // Append user message; set title on first message of a new chat
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== currentChatId) return chat;
          const newTitle =
            chat.title === 'New Chat' && chat.messages.length === 0
              ? makeChatTitle(content)
              : chat.title;
          return {
            ...chat,
            title: newTitle,
            updatedAt: Date.now(),
            messages: [...chat.messages, userMessage],
          };
        })
      );

      // ── Streaming response ────────────────────────────────────────────────
      setIsTyping(true);
      const aiMessageId = `msg-ai-${Date.now()}`;

      // Add the AI placeholder immediately so the streaming message exists;
      // isTyping stays true until the first token arrives (keeps indicator visible
      // during the full cold-start latency of local models).
      const placeholder: Message = {
        id: aiMessageId,
        role: 'ai',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      };
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId
            ? { ...chat, messages: [...chat.messages, placeholder] }
            : chat
        )
      );

      // Build history including the new user message for context
      const currentMessages = chats.find((c) => c.id === currentChatId)?.messages ?? [];
      const history = [
        ...currentMessages.map((m) => ({
          role: (m.role === 'ai' ? 'assistant' : 'user') as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content },
      ];

      const cancel = getStreamFn(activeProvider, activeModel)(
        history,
        (token) => {
          // Hide the typing indicator on the very first token — model has started responding.
          setIsTyping(false);
          setChats((prev) =>
            prev.map((chat) => {
              if (chat.id !== currentChatId) return chat;
              return {
                ...chat,
                messages: chat.messages.map((msg) =>
                  msg.id === aiMessageId
                    ? { ...msg, content: msg.content + token }
                    : msg
                ),
              };
            })
          );
        },
        () => {
          setIsTyping(false);
          setChats((prev) =>
            prev.map((chat) => {
              if (chat.id !== currentChatId) return chat;
              return {
                ...chat,
                updatedAt: Date.now(),
                messages: chat.messages.map((msg) =>
                  msg.id === aiMessageId ? { ...msg, isStreaming: false } : msg
                ),
              };
            })
          );
          cancelStreamRef.current = null;
        },
        (err) => {
          setIsTyping(false);
          setChats((prev) =>
            prev.map((chat) => {
              if (chat.id !== currentChatId) return chat;
              return {
                ...chat,
                messages: chat.messages.map((msg) =>
                  msg.id === aiMessageId
                    ? { ...msg, content: '(Error — could not reach model)', isStreaming: false }
                    : msg
                ),
              };
            })
          );
          toast.error(err.message);
          cancelStreamRef.current = null;
        }
      );

      cancelStreamRef.current = cancel;
    },
    [activeChatId, cancelActiveStream, chats, activeProvider, activeModel]
  );

  // ── Message action handlers ────────────────────────────────────────────────

  const handleCopyMessage = useCallback(
    (messageId: string) => {
      // Target only the active chat — avoids O(n×m) flatMap scan across all chats
      const chat = chats.find((c) => c.id === activeChatId);
      const message = chat?.messages.find((m) => m.id === messageId);
      if (!message) return;

      navigator.clipboard
        .writeText(message.content)
        .then(() => toast.success('Copied to clipboard'))
        .catch(() => toast.error('Could not access clipboard'));
    },
    [chats, activeChatId]
  );

  const handleDeleteMessage = useCallback((chatId: string, messageId: string) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              messages: chat.messages.filter((m) => m.id !== messageId),
              updatedAt: Date.now(),
            }
          : chat
      )
    );
    toast('Message deleted', { icon: '🗑️' });
  }, []);

  const handleEditMessage = useCallback(
    (chatId: string, messageId: string, newContent: string) => {
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                messages: chat.messages.map((m) =>
                  m.id === messageId
                    ? { ...m, content: newContent, isEdited: true, editedAt: Date.now() }
                    : m
                ),
                updatedAt: Date.now(),
              }
            : chat
        )
      );
      toast.success('Message updated');
    },
    []
  );

  const handleRegenerateMessage = useCallback(
    (chatId: string, messageId: string) => {
      cancelActiveStream();

      // Remove the old AI message
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? { ...chat, messages: chat.messages.filter((m) => m.id !== messageId) }
            : chat
        )
      );

      const toastId = toast.loading('Regenerating response…');
      const newAiId = `msg-ai-${Date.now()}`;

      const placeholder: Message = {
        id: newAiId,
        role: 'ai',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      };

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? { ...chat, messages: [...chat.messages, placeholder] }
            : chat
        )
      );

      // Read history before setChats removal flush — exclude the regenerated message
      const chatSnapshot = chats.find((c) => c.id === chatId);
      const history = (chatSnapshot?.messages ?? [])
        .filter((m) => m.id !== messageId)
        .map((m) => ({
          role: (m.role === 'ai' ? 'assistant' : 'user') as 'user' | 'assistant',
          content: m.content,
        }));

      const cancel = getStreamFn(activeProvider, activeModel)(
        history,
        (token) => {
          setChats((prev) =>
            prev.map((chat) => {
              if (chat.id !== chatId) return chat;
              return {
                ...chat,
                messages: chat.messages.map((msg) =>
                  msg.id === newAiId ? { ...msg, content: msg.content + token } : msg
                ),
              };
            })
          );
        },
        () => {
          setChats((prev) =>
            prev.map((chat) => {
              if (chat.id !== chatId) return chat;
              return {
                ...chat,
                updatedAt: Date.now(),
                messages: chat.messages.map((msg) =>
                  msg.id === newAiId ? { ...msg, isStreaming: false } : msg
                ),
              };
            })
          );
          toast.success('Response regenerated', { id: toastId });
          cancelStreamRef.current = null;
        },
        (err) => {
          setChats((prev) =>
            prev.map((chat) => {
              if (chat.id !== chatId) return chat;
              return {
                ...chat,
                messages: chat.messages.map((msg) =>
                  msg.id === newAiId
                    ? { ...msg, content: '(Error — could not reach model)', isStreaming: false }
                    : msg
                ),
              };
            })
          );
          toast.error(err.message, { id: toastId });
          cancelStreamRef.current = null;
        }
      );

      cancelStreamRef.current = cancel;
    },
    [cancelActiveStream, chats, activeProvider, activeModel]
  );

  const handleClearHistory = useCallback(() => {
    cancelActiveStream();
    setChats([]);
    setActiveChatId(null);
    clearAllStorage();
    toast.success('Chat history cleared');
  }, [cancelActiveStream]);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;

  return {
    chats,
    activeChatId,
    activeChat,
    isTyping,
    handleNewChat,
    handleSelectChat,
    handleTogglePin,
    handleDeleteChat,
    handleRenameChat,
    handleStopStreaming,
    handleSendMessage,
    handleCopyMessage,
    handleDeleteMessage,
    handleEditMessage,
    handleRegenerateMessage,
    handleClearHistory,
  };
}
