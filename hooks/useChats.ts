import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { ChatSession, Message } from '../types';
import { MOCK_CHATS } from '../constants';
import { streamMockAiResponse } from '../services/mockAiService';
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
  handleSendMessage: (content: string) => void;
  handleCopyMessage: (messageId: string) => void;
  handleDeleteMessage: (chatId: string, messageId: string) => void;
  handleEditMessage: (chatId: string, messageId: string, newContent: string) => void;
  handleRegenerateMessage: (chatId: string, messageId: string) => void;
  handleClearHistory: () => void;
}

export function useChats(onMobileNavigate?: () => void): UseChatsResult {
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

      // Brief delay so the typing indicator renders before the first token
      const placeholderDelay = setTimeout(() => {
        setIsTyping(false);
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
      }, 380);

      const cancel = streamMockAiResponse(
        (token) => {
          clearTimeout(placeholderDelay);
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
        }
      );

      cancelStreamRef.current = cancel;
    },
    [activeChatId, cancelActiveStream]
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

      const cancel = streamMockAiResponse(
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
        }
      );

      cancelStreamRef.current = cancel;
    },
    [cancelActiveStream]
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
    handleSendMessage,
    handleCopyMessage,
    handleDeleteMessage,
    handleEditMessage,
    handleRegenerateMessage,
    handleClearHistory,
  };
}
