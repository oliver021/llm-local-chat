import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { ChatArea } from './components/ChatArea';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SettingsModal } from './components/Settings';
import { ModelSelectorModal } from './components/ModelSelectorModal';
import { ArchivedChatsPage } from './components/ArchivedChatsPage';
import { BookmarksPage } from './components/BookmarksPage';
import { ChatActionsProvider } from './context/ChatContext';
import { SettingsProvider } from './context/SettingsContext';
import { useTheme } from './hooks/useTheme';
import { useUIState } from './hooks/useUIState';
import { useChats } from './hooks/useChats';
import { useProvider } from './hooks/useProvider';
import { useSettings } from './hooks/useSettings';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { dbCopyChat } from './utils/chatApi';
import { dbCreateBookmark } from './utils/bookmarkApi';
import { toast } from 'sonner';

const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const {
    sidebarOpen, settingsOpen, modelSelectorOpen,
    openSidebar, closeSidebar,
    openSettings, closeSettings,
    openModelSelector, closeModelSelector,
  } = useUIState();

  const { activeProvider, activeModel, setProviderAndModel } = useProvider();
  const settings = useSettings();

  const {
    chats,
    activeChatId,
    activeChat,
    isTyping,
    handleNewChat,
    handleSelectChat,
    handleTogglePin,
    handleDeleteChat,
    handleArchiveChat,
    handleCopyChat,
    handleRenameChat,
    handleStopStreaming,
    handleSendMessage,
    handleCopyMessage,
    handleDeleteMessage,
    handleEditMessage,
    handleRegenerateMessage,
    handleClearHistory,
  } = useChats(closeSidebar, activeProvider, activeModel, settings.composedSystemPrompt ?? undefined);

  const [archivedOpen, setArchivedOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyTitle, setCopyTitle] = useState('');

  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Listen for bookmark and rebranch events from MessageBubble
  useEffect(() => {
    const handleBookmark = (e: any) => {
      const { messageId, chatId } = e.detail;
      const msg = chats.find(c => c.id === chatId)?.messages.find(m => m.id === messageId);
      if (msg) {
        const bookmarkId = `bm-${Date.now()}`;
        dbCreateBookmark({
          id: bookmarkId,
          messageId,
          chatId,
          title: msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : ''),
          createdAt: Date.now(),
        }).then(() => toast.success('Message bookmarked')).catch(() => toast.error('Could not bookmark'));
      }
    };

    const handleRebranch = (e: any) => {
      const { messageId, chatId } = e.detail;
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
        const msgIdx = chat.messages.findIndex(m => m.id === messageId);
        if (msgIdx >= 0) {
          const fromMessages = chat.messages.slice(msgIdx);
          const newId = `chat-${Date.now()}`;
          setCopyTitle(`${chat.title} (Branched)`);
          handleCopyChat(chatId);
          // The rebranch is handled via the copy dialog - user confirms
        }
      }
    };

    window.addEventListener('bookmark-message', handleBookmark);
    window.addEventListener('rebranch-message', handleRebranch);
    return () => {
      window.removeEventListener('bookmark-message', handleBookmark);
      window.removeEventListener('rebranch-message', handleRebranch);
    };
  }, [chats, handleCopyChat]);

  const handleFocusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleToggleSidebar = useCallback(() => {
    sidebarOpen ? closeSidebar() : openSidebar();
  }, [sidebarOpen, closeSidebar, openSidebar]);

  useKeyboardShortcuts({
    onNewChat: handleNewChat,
    onToggleSidebar: handleToggleSidebar,
    onFocusInput: handleFocusInput,
  });

  return (
    <SettingsProvider value={settings}>
    <ChatActionsProvider
      value={{
        handleSendMessage,
        handleNewChat,
        handleSelectChat,
        handleTogglePin,
        handleDeleteChat,
        handleArchiveChat,
        handleRenameChat,
        handleStopStreaming,
        openSettings,
        openModelSelector,
        handleCopyMessage,
        handleDeleteMessage,
        handleEditMessage,
        handleRegenerateMessage,
        handleClearHistory,
      }}
    >
      <div className="flex h-full w-full overflow-hidden bg-white dark:bg-gray-950">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-10 md:hidden backdrop-blur-sm transition-opacity"
            onClick={closeSidebar}
          />
        )}

        <ErrorBoundary fallback={
          <div className="w-64 h-full bg-gray-950 flex flex-col items-center justify-center gap-3 p-4 flex-shrink-0">
            <p className="text-xs text-gray-500 text-center">Sidebar crashed.</p>
            <button onClick={() => window.location.reload()} className="text-xs text-blue-400 underline">Reload</button>
          </div>
        }>
          <Sidebar
            chats={chats}
            activeChatId={activeChatId}
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChat}
            onTogglePin={handleTogglePin}
            onDeleteChat={handleDeleteChat}
            onArchiveChat={handleArchiveChat}
            onCopyChat={(id) => {
              const chat = chats.find(c => c.id === id);
              if (chat) {
                setCopyTitle(`${chat.title} (Copy)`);
                setCopyDialogOpen(true);
              }
            }}
            onRenameChat={handleRenameChat}
            onOpenSettings={openSettings}
            onOpenArchived={() => setArchivedOpen(true)}
            isOpen={sidebarOpen}
          />
        </ErrorBoundary>

        <main className="flex-1 flex flex-col min-w-0 relative">
          <ErrorBoundary fallback={
            <div className="h-16 flex items-center justify-center bg-white/80 dark:bg-gray-950/80 border-b border-gray-100 dark:border-gray-800/50">
              <p className="text-xs text-gray-500">Navigation error. <button onClick={() => window.location.reload()} className="text-blue-400 underline">Reload</button></p>
            </div>
          }>
            <TopNav
              theme={theme}
              toggleTheme={toggleTheme}
              toggleSidebar={openSidebar}
              currentChatTitle={activeChat?.title !== 'New Chat' ? activeChat?.title : undefined}
              activeProvider={activeProvider}
              activeModel={activeModel}
              onOpenArchived={() => setArchivedOpen(true)}
              onOpenBookmarks={() => setBookmarksOpen(true)}
              onOpenCopyChat={() => {
                if (activeChat) {
                  setCopyTitle(`${activeChat.title} (Copy)`);
                  setCopyDialogOpen(true);
                } else {
                  toast.error('No chat to copy');
                }
              }}
            />
          </ErrorBoundary>
          <ErrorBoundary>
            <ChatArea chat={activeChat} isTyping={isTyping} inputRef={inputRef} />
          </ErrorBoundary>
        </main>

        <ErrorBoundary>
          <SettingsModal isOpen={settingsOpen} onClose={closeSettings} />
        </ErrorBoundary>

        <ErrorBoundary>
          <ModelSelectorModal
            isOpen={modelSelectorOpen}
            onClose={closeModelSelector}
            activeProvider={activeProvider}
            activeModel={activeModel}
            onSelect={setProviderAndModel}
          />
        </ErrorBoundary>

        <ErrorBoundary>
          <ArchivedChatsPage
            isOpen={archivedOpen}
            onClose={() => setArchivedOpen(false)}
            onRestored={() => window.location.reload()}
          />
        </ErrorBoundary>

        <ErrorBoundary>
          <BookmarksPage
            isOpen={bookmarksOpen}
            onClose={() => setBookmarksOpen(false)}
          />
        </ErrorBoundary>

        {/* Copy chat dialog */}
        {copyDialogOpen && activeChat && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
            onClick={() => setCopyDialogOpen(false)}
          >
            <div
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-96 p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Copy Chat</h3>
              <input
                type="text"
                value={copyTitle}
                onChange={e => setCopyTitle(e.target.value)}
                placeholder="New chat title"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setCopyDialogOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const newId = `chat-${Date.now()}`;
                    handleCopyChat(activeChat.id);
                    setCopyDialogOpen(false);
                    toast.success('Chat copied');
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Toaster
        position="top-right"
        richColors
        closeButton
        theme={theme}
        toastOptions={{
          duration: 3000,
          style: { fontFamily: 'Inter, sans-serif' },
        }}
      />
    </ChatActionsProvider>
    </SettingsProvider>
  );
};

export default App;
