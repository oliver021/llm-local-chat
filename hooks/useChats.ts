import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { ChatSession, Message } from '../types';
import { getStreamFn } from '../services/providerDispatch';
import type { ProviderKey } from './useProvider';
import { drainLegacyChats, clearAllStorage } from '../utils/storage';
import { makeChatTitle } from '../utils/chatUtils';
import {
  dbGetChats,
  dbCreateChat,
  dbUpdateChat,
  dbDeleteChat,
  dbDeleteAllChats,
  dbAddMessage,
  dbUpdateMessage,
  dbDeleteMessage,
  dbArchiveChat,
} from '../utils/chatApi';

interface UseChatsResult {
  chats: ChatSession[];
  activeChatId: string | null;
  activeChat: ChatSession | null;
  isTyping: boolean;
  dbReady: boolean;
  handleNewChat: () => void;
  handleSelectChat: (id: string) => void;
  handleTogglePin: (id: string) => void;
  handleDeleteChat: (id: string) => void;
  handleArchiveChat: (id: string) => void;
  handleRenameChat: (id: string, newTitle: string) => void;
  handleStopStreaming: () => void;
  handleSendMessage: (content: string) => void;
  handleCopyMessage: (messageId: string) => void;
  handleDeleteMessage: (chatId: string, messageId: string) => void;
  handleEditMessage: (chatId: string, messageId: string, newContent: string) => void;
  handleRegenerateMessage: (chatId: string, messageId: string) => void;
  handleClearHistory: () => void;
}

// Swallow DB errors so UI keeps working if the API server is momentarily down.
function db<T>(p: Promise<T>): void {
  p.catch(err => console.error('[db]', err));
}

export function useChats(
  onMobileNavigate?: () => void,
  activeProvider: ProviderKey = 'llm-llamacpp',
  activeModel = 'model.gguf'
): UseChatsResult {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [dbReady, setDbReady] = useState(false);

  // cancelStream holds the abort function returned by the stream provider.
  const cancelStreamRef = useRef<(() => void) | null>(null);

  // Mirrors chats state so stable callbacks can read the latest value.
  const chatsRef = useRef<ChatSession[]>([]);
  useEffect(() => { chatsRef.current = chats; }, [chats]);

  // Tracks the chat+message currently being streamed so we can persist on stop/error.
  const streamingCtxRef = useRef<{ chatId: string; messageId: string } | null>(null);

  // ── Boot: load from DB, migrate legacy localStorage chats ─────────────────

  useEffect(() => {
    dbGetChats()
      .then(async (rows) => {
        // Only count non-archived rows for the "is DB empty" check
        const activeRows = rows.filter(r => !r.isArchived);
        if (activeRows.length === 0) {
          // One-time migration: import any chats that lived in localStorage
          const legacy = drainLegacyChats();
          if (legacy && legacy.length > 0) {
            for (const chat of legacy) {
              await dbCreateChat(chat);
              for (const msg of chat.messages) {
                await dbAddMessage(chat.id, msg);
              }
            }
            setChats(legacy);
            setDbReady(true);
            return;
          }
        }
        setChats(rows.filter(r => !r.isArchived));
        setDbReady(true);
      })
      .catch(err => {
        console.error('[db] Failed to load chats:', err);
        // Graceful degradation: keep UI working in memory-only mode
        setDbReady(true);
      });
  }, []);

  // Cancel any in-flight stream on unmount
  useEffect(() => {
    return () => { cancelStreamRef.current?.(); };
  }, []);

  // ── Private helper ─────────────────────────────────────────────────────────

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
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    db(dbCreateChat(newChat));
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
    setChats(prev =>
      prev.map(chat => {
        if (chat.id !== id) return chat;
        const updated = { ...chat, isPinned: !chat.isPinned };
        db(dbUpdateChat(id, { isPinned: updated.isPinned }));
        return updated;
      })
    );
  }, []);

  const handleDeleteChat = useCallback((id: string) => {
    setChats(prev => prev.filter(chat => chat.id !== id));
    setActiveChatId(prev => (prev === id ? null : prev));
    db(dbDeleteChat(id));
    toast.success('Conversation deleted');
  }, []);

  const handleArchiveChat = useCallback((id: string) => {
    setChats(prev => prev.filter(chat => chat.id !== id));
    setActiveChatId(prev => (prev === id ? null : prev));
    db(dbArchiveChat(id));
    toast.success('Conversation archived');
  }, []);

  const handleRenameChat = useCallback((id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setChats(prev =>
      prev.map(chat => (chat.id === id ? { ...chat, title: trimmed } : chat))
    );
    db(dbUpdateChat(id, { title: trimmed }));
  }, []);

  const handleStopStreaming = useCallback(() => {
    cancelStreamRef.current?.();
    cancelStreamRef.current = null;
    setIsTyping(false);

    // Persist partial AI message content before clearing isStreaming
    const ctx = streamingCtxRef.current;
    if (ctx) {
      const chat = chatsRef.current.find(c => c.id === ctx.chatId);
      const msg = chat?.messages.find(m => m.id === ctx.messageId);
      if (msg) {
        db(dbAddMessage(ctx.chatId, { ...msg, isStreaming: undefined }));
      }
      streamingCtxRef.current = null;
    }

    setChats(prev =>
      prev.map(chat => ({
        ...chat,
        messages: chat.messages.map(msg =>
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

      if (!currentChatId) {
        const newChat: ChatSession = {
          id: `chat-${Date.now()}`,
          title: makeChatTitle(content),
          isPinned: false,
          updatedAt: Date.now(),
          messages: [],
        };
        setChats(prev => [newChat, ...prev]);
        currentChatId = newChat.id;
        setActiveChatId(currentChatId);
        db(dbCreateChat(newChat));
      }

      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content,
        timestamp: Date.now(),
      };

      setChats(prev =>
        prev.map(chat => {
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
      db(dbAddMessage(currentChatId, userMessage));

      // ── Streaming response ────────────────────────────────────────────────

      setIsTyping(true);
      const aiMessageId = `msg-ai-${Date.now()}`;

      const placeholder: Message = {
        id: aiMessageId,
        role: 'ai',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      };

      setChats(prev =>
        prev.map(chat =>
          chat.id === currentChatId
            ? { ...chat, messages: [...chat.messages, placeholder] }
            : chat
        )
      );

      streamingCtxRef.current = { chatId: currentChatId, messageId: aiMessageId };

      const currentMessages = chatsRef.current.find(c => c.id === currentChatId)?.messages ?? [];
      const history = [
        ...currentMessages.map(m => ({
          role: (m.role === 'ai' ? 'assistant' : 'user') as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content },
      ];

      const cancel = getStreamFn(activeProvider, activeModel)(
        history,
        (token) => {
          setIsTyping(false);
          setChats(prev =>
            prev.map(chat => {
              if (chat.id !== currentChatId) return chat;
              return {
                ...chat,
                messages: chat.messages.map(msg =>
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
          const now = Date.now();
          setChats(prev =>
            prev.map(chat => {
              if (chat.id !== currentChatId) return chat;
              return {
                ...chat,
                updatedAt: now,
                messages: chat.messages.map(msg =>
                  msg.id === aiMessageId ? { ...msg, isStreaming: false } : msg
                ),
              };
            })
          );
          // Persist complete AI message and update session timestamp
          const finalContent =
            chatsRef.current
              .find(c => c.id === currentChatId)
              ?.messages.find(m => m.id === aiMessageId)?.content ?? '';
          db(dbAddMessage(currentChatId, {
            id: aiMessageId,
            role: 'ai',
            content: finalContent,
            timestamp: placeholder.timestamp,
          }));
          db(dbUpdateChat(currentChatId, { updatedAt: now }));
          streamingCtxRef.current = null;
          cancelStreamRef.current = null;
        },
        (err) => {
          setIsTyping(false);
          const errContent = '(Error — could not reach model)';
          setChats(prev =>
            prev.map(chat => {
              if (chat.id !== currentChatId) return chat;
              return {
                ...chat,
                messages: chat.messages.map(msg =>
                  msg.id === aiMessageId
                    ? { ...msg, content: errContent, isStreaming: false }
                    : msg
                ),
              };
            })
          );
          db(dbAddMessage(currentChatId, {
            id: aiMessageId,
            role: 'ai',
            content: errContent,
            timestamp: placeholder.timestamp,
          }));
          toast.error(err.message);
          streamingCtxRef.current = null;
          cancelStreamRef.current = null;
        }
      );

      cancelStreamRef.current = cancel;
    },
    [activeChatId, cancelActiveStream, activeProvider, activeModel]
  );

  // ── Message action handlers ────────────────────────────────────────────────

  const handleCopyMessage = useCallback(
    (messageId: string) => {
      const chat = chatsRef.current.find(c => c.id === activeChatId);
      const message = chat?.messages.find(m => m.id === messageId);
      if (!message) return;
      navigator.clipboard
        .writeText(message.content)
        .then(() => toast.success('Copied to clipboard'))
        .catch(() => toast.error('Could not access clipboard'));
    },
    [activeChatId]
  );

  const handleDeleteMessage = useCallback((chatId: string, messageId: string) => {
    setChats(prev =>
      prev.map(chat =>
        chat.id === chatId
          ? { ...chat, messages: chat.messages.filter(m => m.id !== messageId), updatedAt: Date.now() }
          : chat
      )
    );
    db(dbDeleteMessage(chatId, messageId));
    toast('Message deleted', { icon: '🗑️' });
  }, []);

  const handleEditMessage = useCallback(
    (chatId: string, messageId: string, newContent: string) => {
      const now = Date.now();
      setChats(prev =>
        prev.map(chat =>
          chat.id === chatId
            ? {
                ...chat,
                messages: chat.messages.map(m =>
                  m.id === messageId
                    ? { ...m, content: newContent, isEdited: true, editedAt: now }
                    : m
                ),
                updatedAt: now,
              }
            : chat
        )
      );
      db(dbUpdateMessage(chatId, messageId, { content: newContent, isEdited: true, editedAt: now }));
      toast.success('Message updated');
    },
    []
  );

  const handleRegenerateMessage = useCallback(
    (chatId: string, messageId: string) => {
      cancelActiveStream();

      setChats(prev =>
        prev.map(chat =>
          chat.id === chatId
            ? { ...chat, messages: chat.messages.filter(m => m.id !== messageId) }
            : chat
        )
      );
      db(dbDeleteMessage(chatId, messageId));

      const toastId = toast.loading('Regenerating response…');
      const newAiId = `msg-ai-${Date.now()}`;

      const placeholder: Message = {
        id: newAiId,
        role: 'ai',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      };

      setChats(prev =>
        prev.map(chat =>
          chat.id === chatId
            ? { ...chat, messages: [...chat.messages, placeholder] }
            : chat
        )
      );

      streamingCtxRef.current = { chatId, messageId: newAiId };

      const history = (chatsRef.current.find(c => c.id === chatId)?.messages ?? [])
        .filter(m => m.id !== messageId)
        .map(m => ({
          role: (m.role === 'ai' ? 'assistant' : 'user') as 'user' | 'assistant',
          content: m.content,
        }));

      const cancel = getStreamFn(activeProvider, activeModel)(
        history,
        (token) => {
          setChats(prev =>
            prev.map(chat => {
              if (chat.id !== chatId) return chat;
              return {
                ...chat,
                messages: chat.messages.map(msg =>
                  msg.id === newAiId ? { ...msg, content: msg.content + token } : msg
                ),
              };
            })
          );
        },
        () => {
          const now = Date.now();
          setChats(prev =>
            prev.map(chat => {
              if (chat.id !== chatId) return chat;
              return {
                ...chat,
                updatedAt: now,
                messages: chat.messages.map(msg =>
                  msg.id === newAiId ? { ...msg, isStreaming: false } : msg
                ),
              };
            })
          );
          const finalContent =
            chatsRef.current
              .find(c => c.id === chatId)
              ?.messages.find(m => m.id === newAiId)?.content ?? '';
          db(dbAddMessage(chatId, {
            id: newAiId,
            role: 'ai',
            content: finalContent,
            timestamp: placeholder.timestamp,
          }));
          db(dbUpdateChat(chatId, { updatedAt: now }));
          toast.success('Response regenerated', { id: toastId });
          streamingCtxRef.current = null;
          cancelStreamRef.current = null;
        },
        (err) => {
          const errContent = '(Error — could not reach model)';
          setChats(prev =>
            prev.map(chat => {
              if (chat.id !== chatId) return chat;
              return {
                ...chat,
                messages: chat.messages.map(msg =>
                  msg.id === newAiId
                    ? { ...msg, content: errContent, isStreaming: false }
                    : msg
                ),
              };
            })
          );
          db(dbAddMessage(chatId, {
            id: newAiId,
            role: 'ai',
            content: errContent,
            timestamp: placeholder.timestamp,
          }));
          toast.error(err.message, { id: toastId });
          streamingCtxRef.current = null;
          cancelStreamRef.current = null;
        }
      );

      cancelStreamRef.current = cancel;
    },
    [cancelActiveStream, activeProvider, activeModel]
  );

  const handleClearHistory = useCallback(() => {
    cancelActiveStream();
    setChats([]);
    setActiveChatId(null);
    db(dbDeleteAllChats());
    clearAllStorage();
    toast.success('Chat history cleared');
  }, [cancelActiveStream]);

  const activeChat = chats.find(c => c.id === activeChatId) ?? null;

  return {
    chats,
    activeChatId,
    activeChat,
    isTyping,
    dbReady,
    handleNewChat,
    handleSelectChat,
    handleTogglePin,
    handleDeleteChat,
    handleArchiveChat,
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
