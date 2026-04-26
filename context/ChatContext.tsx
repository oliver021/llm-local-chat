import React, { createContext, useContext } from 'react';

/**
 * ChatActionsContext — the single nerve centre for every user-initiated mutation in the app.
 *
 * ── ARCHITECTURE ROLE ────────────────────────────────────────────────────────
 * This context sits at the boundary between the UI layer and the state layer:
 *
 *   UI components  →  useChatActions()  →  ChatActionsContext  →  useChats.ts
 *
 * Components NEVER import useChats directly. They consume this context, which
 * means the entire state implementation (useChats.ts) can be swapped, split, or
 * migrated to a state manager (Zustand, Redux, Jotai) without touching a single
 * component file. Only the provider wiring in App.tsx changes.
 *
 * ── WHAT LIVES HERE vs WHAT DOESN'T ─────────────────────────────────────────
 * This context carries ACTION DISPATCHERS only — functions that trigger state
 * mutations. It intentionally does NOT carry state values (chats, activeChat,
 * isTyping). Those are passed as props directly from App.tsx to the components
 * that need them (Sidebar, ChatArea). This split keeps re-render scope tight:
 * a component that only calls actions never re-renders due to state changes.
 *
 * ── EXTENDING THIS CONTEXT ───────────────────────────────────────────────────
 * To add a new action (e.g. handleBookmarkMessage):
 *   1. Declare the signature here in ChatActionsContextValue
 *   2. Implement the handler in hooks/useChats.ts
 *   3. Pass it into <ChatActionsProvider value={...}> in App.tsx
 * No component file needs to change until it actually calls the new action.
 *
 * ── PROVIDER LOCATION ────────────────────────────────────────────────────────
 * The provider wraps the entire component tree in App.tsx, above Sidebar,
 * TopNav, and ChatArea. This means every component at any depth can call
 * useChatActions() — including deeply nested ones like MessageActionMenu —
 * without threading callbacks through intermediate layers.
 */
interface ChatActionsContextValue {
  /**
   * Send a user message and trigger an AI response stream.
   *
   * Behaviour:
   * - If no chat is active, creates a new ChatSession first, then sends.
   * - Auto-titles the new chat from the first 30 characters of `content`.
   * - Cancels any currently running AI stream before starting a new one,
   *   preventing orphaned setState calls from a previous in-flight request.
   * - Appends a placeholder AI message with `isStreaming: true` after a brief
   *   delay (~380ms) to show the typing indicator before the first token lands.
   * - As tokens arrive via streamMockAiResponse, they are appended to the
   *   placeholder message's `content` field in-place.
   * - Sets `isStreaming: false` on completion, revealing the action menu.
   *
   * Callers: ChatInput (primary), suggested prompt buttons in ChatArea.
   * Implemented in: hooks/useChats.ts → handleSendMessage
   */
  handleSendMessage: (content: string) => void;

  /**
   * Create a blank ChatSession and make it the active chat.
   *
   * Behaviour:
   * - Cancels any running AI stream (user is navigating away mid-response).
   * - Prepends the new session to the chats array so it appears first in the sidebar.
   * - On mobile (viewport < 768px), closes the sidebar overlay automatically.
   *
   * Callers: Sidebar "New Chat" button, ⌘K / Ctrl+K keyboard shortcut (via App.tsx).
   * Implemented in: hooks/useChats.ts → handleNewChat
   */
  handleNewChat: () => void;

  /**
   * Switch the active chat to the session identified by `id`.
   *
   * Behaviour:
   * - Cancels any running AI stream before switching — prevents a response
   *   meant for chat A from being written into chat B's message list.
   * - On mobile, closes the sidebar overlay after navigation.
   *
   * Callers: ChatItem in Sidebar (click on any conversation).
   * Implemented in: hooks/useChats.ts → handleSelectChat
   */
  handleSelectChat: (id: string) => void;

  /**
   * Toggle the `isPinned` flag on a ChatSession.
   *
   * Behaviour:
   * - Flips the boolean in place; the Sidebar re-renders the PINNED / RECENT
   *   sections based on this flag automatically.
   * - Persisted to localStorage immediately via the useEffect sync in useChats.ts.
   *
   * Callers: Pin/unpin button in ChatItem (Sidebar).
   * Implemented in: hooks/useChats.ts → handleTogglePin
   *
   * NOTE: `id` here is a ChatSession.id, not a Message.id. The parameter name
   * matches the pattern of the other handlers but refers to a chat, not a pin.
   */
  handleTogglePin: (id: string) => void;
  handleDeleteChat: (id: string) => void;
  handleRenameChat: (id: string, newTitle: string) => void;
  handleStopStreaming: () => void;

  /**
   * Open the Settings modal.
   *
   * This is a pure UI action — it sets `settingsOpen: true` in useUIState.ts,
   * which causes <SettingsModal> in App.tsx to render. No chat state is touched.
   *
   * Placed in this context (rather than a separate UIContext) because the primary
   * consumer is the Sidebar footer button, which already consumes this context.
   * Adding a second context just for this one action would be over-engineering.
   *
   * Callers: Settings button in Sidebar footer.
   * Implemented in: hooks/useUIState.ts → openSettings, wired in App.tsx.
   */
  openSettings: () => void;

  /**
   * Open the Model Selector modal.
   * Pure UI action — sets `modelSelectorOpen: true` in useUIState.
   * Placed here so TopNav can call it via useChatActions() without a prop chain.
   */
  openModelSelector: () => void;

  /**
   * Copy a message's text content to the system clipboard.
   *
   * Behaviour:
   * - Looks up the message by `messageId` across all chats in state.
   * - Uses the async Clipboard API (navigator.clipboard.writeText).
   * - Fires toast.success('Copied to clipboard') on success.
   * - Fires toast.error('Could not access clipboard') on failure (e.g. no HTTPS,
   *   or user denied clipboard permission).
   *
   * Callers: Copy button in MessageActionMenu.
   * Implemented in: hooks/useChats.ts → handleCopyMessage
   *
   * NOTE: Only accepts `messageId` (not chatId) because message IDs are globally
   * unique across all sessions — the handler finds the chat internally.
   */
  handleCopyMessage: (messageId: string) => void;

  /**
   * Permanently remove a single message from a chat's message list.
   *
   * Behaviour:
   * - Filters the message out of ChatSession.messages immutably.
   * - Updates ChatSession.updatedAt so the sidebar reflects the change.
   * - Fires a toast notification ('Message deleted' with 🗑️ icon).
   * - Change is persisted to localStorage via the useEffect sync.
   *
   * Callers: Delete button in MessageActionMenu (visible on hover, for both roles).
   * Implemented in: hooks/useChats.ts → handleDeleteMessage
   *
   * IMPORTANT: Both `chatId` and `messageId` are required. Message IDs are
   * unique, but passing chatId avoids a full flat-map scan across all chats —
   * it narrows directly to the correct session in a single .map() pass.
   */
  handleDeleteMessage: (chatId: string, messageId: string) => void;

  /**
   * Replace the content of an existing user message.
   *
   * Behaviour:
   * - Replaces `message.content` with `newContent` immutably.
   * - Sets `message.isEdited = true` and `message.editedAt = Date.now()`.
   * - The "(edited)" badge in MessageBubble appears automatically via `isEdited`.
   * - Fires toast.success('Message updated').
   * - Does NOT re-trigger an AI response — that is intentional. If you want
   *   edit → regenerate behaviour, call handleEditMessage then handleRegenerateMessage.
   *
   * Callers: Edit button in MessageActionMenu (user messages only — the menu
   *          conditionally renders this button based on `isAIMessage` prop).
   * Implemented in: hooks/useChats.ts → handleEditMessage
   */
  handleEditMessage: (chatId: string, messageId: string, newContent: string) => void;

  /**
   * Delete an AI message and stream a fresh replacement in its place.
   *
   * Behaviour:
   * - Cancels any currently running stream first.
   * - Removes the old AI message from the chat.
   * - Shows a toast.loading('Regenerating response…') that resolves on completion.
   * - Appends a new placeholder message with `isStreaming: true`.
   * - Calls streamMockAiResponse — replace with your real backend call.
   * - On completion, sets `isStreaming: false` and resolves the loading toast.
   *
   * Callers: Regenerate button in MessageActionMenu (AI messages only).
   * Implemented in: hooks/useChats.ts → handleRegenerateMessage
   *
   * BACKEND NOTE: The current implementation regenerates without context — it
   * does not pass conversation history to streamMockAiResponse. When connecting
   * a real backend, retrieve the messages preceding `messageId` from the chat
   * and pass them as the conversation history. See connecting.md §2 for details.
   */
  handleRegenerateMessage: (chatId: string, messageId: string) => void;

  /**
   * Permanently delete all chats and clear all stored state.
   *
   * Behaviour:
   * - Cancels any running stream.
   * - Clears chats array to empty.
   * - Resets activeChatId to null.
   * - Clears all localStorage (chats, theme, UI state).
   * - Fires toast.success('Chat history cleared').
   *
   * Callers: "Clear all chat history" button in Settings modal (Privacy tab, danger zone).
   * Implemented in: hooks/useChats.ts → handleClearHistory
   *
   * This is a destructive action — should always be preceded by a confirmation dialog.
   */
  handleClearHistory: () => void;
}

/**
 * The context instance. Initialised as null so that useChatActions() can detect
 * when a component is accidentally rendered outside the provider tree and throw
 * a clear, actionable error instead of a confusing "cannot read property of undefined".
 */
const ChatActionsContext = createContext<ChatActionsContextValue | null>(null);

/**
 * Re-exported directly from the context — no wrapper component needed.
 *
 * Usage in App.tsx:
 *   <ChatActionsProvider value={{ handleSendMessage, handleNewChat, ... }}>
 *     <Sidebar ... />
 *     <ChatArea ... />
 *   </ChatActionsProvider>
 *
 * The value object is assembled from useChats() and useUIState() in App.tsx,
 * which is the only place that imports those hooks. This is the seam between
 * the state layer and the UI layer — see connecting.md for integration details.
 */
export const ChatActionsProvider = ChatActionsContext.Provider;

/**
 * Consume chat actions from any component inside the provider tree.
 *
 * The guard (if !ctx) turns a silent undefined-access bug into an explicit
 * error with a readable message. If you see this error in development, it
 * means a component is being rendered outside of <ChatActionsProvider> — check
 * that the component is a descendant of the provider in App.tsx.
 *
 * @example
 *   // In any component inside the provider tree:
 *   const { handleSendMessage, handleDeleteMessage } = useChatActions();
 *
 * Destructure only what you need — the rest won't trigger re-renders because
 * the context value reference is stable (the value object is created once in
 * App.tsx and only changes if the underlying handlers are recreated via useCallback).
 */
export function useChatActions(): ChatActionsContextValue {
  const ctx = useContext(ChatActionsContext);
  if (!ctx) throw new Error('useChatActions must be used within ChatActionsProvider');
  return ctx;
}
