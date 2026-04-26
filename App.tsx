import React, { useCallback, useRef, useState } from 'react';
import { Toaster } from 'sonner';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { ChatArea } from './components/ChatArea';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SettingsModal } from './components/Settings';
import { ModelSelectorModal } from './components/ModelSelectorModal';
import { ArchivedChatsPage } from './components/ArchivedChatsPage';
import { ChatActionsProvider } from './context/ChatContext';
import { useTheme } from './hooks/useTheme';
import { useUIState } from './hooks/useUIState';
import { useChats } from './hooks/useChats';
import { useProvider } from './hooks/useProvider';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const {
    sidebarOpen, settingsOpen, modelSelectorOpen,
    openSidebar, closeSidebar,
    openSettings, closeSettings,
    openModelSelector, closeModelSelector,
  } = useUIState();

  const { activeProvider, activeModel, setProviderAndModel } = useProvider();

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
    handleRenameChat,
    handleStopStreaming,
    handleSendMessage,
    handleCopyMessage,
    handleDeleteMessage,
    handleEditMessage,
    handleRegenerateMessage,
    handleClearHistory,
  } = useChats(closeSidebar, activeProvider, activeModel);

  // Archived chats page visibility
  const [archivedOpen, setArchivedOpen] = useState(false);

  const openArchived = useCallback(() => setArchivedOpen(true), []);
  const closeArchived = useCallback(() => setArchivedOpen(false), []);

  // Ref forwarded to ChatInput so the keyboard shortcut can focus it
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleFocusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleToggleSidebar = useCallback(() => {
    sidebarOpen ? closeSidebar() : openSidebar();
  }, [sidebarOpen, closeSidebar, openSidebar]);

  // Global keyboard shortcuts: Cmd+K (new chat), Cmd+Shift+S (sidebar), / (focus input)
  useKeyboardShortcuts({
    onNewChat: handleNewChat,
    onToggleSidebar: handleToggleSidebar,
    onFocusInput: handleFocusInput,
  });

  return (
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
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-10 md:hidden backdrop-blur-sm transition-opacity"
            onClick={closeSidebar}
          />
        )}

        <Sidebar
          chats={chats}
          activeChatId={activeChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onTogglePin={handleTogglePin}
          onDeleteChat={handleDeleteChat}
          onArchiveChat={handleArchiveChat}
          onRenameChat={handleRenameChat}
          onOpenSettings={openSettings}
          onOpenArchived={openArchived}
          isOpen={sidebarOpen}
        />

        <main className="flex-1 flex flex-col min-w-0 relative">
          <TopNav
            theme={theme}
            toggleTheme={toggleTheme}
            toggleSidebar={openSidebar}
            currentChatTitle={activeChat?.title !== 'New Chat' ? activeChat?.title : undefined}
            activeProvider={activeProvider}
            activeModel={activeModel}
            onOpenArchived={openArchived}
          />
          <ErrorBoundary>
            <ChatArea chat={activeChat} isTyping={isTyping} inputRef={inputRef} />
          </ErrorBoundary>
        </main>

        <SettingsModal isOpen={settingsOpen} onClose={closeSettings} />

        <ModelSelectorModal
          isOpen={modelSelectorOpen}
          onClose={closeModelSelector}
          activeProvider={activeProvider}
          activeModel={activeModel}
          onSelect={setProviderAndModel}
        />

        <ArchivedChatsPage
          isOpen={archivedOpen}
          onClose={closeArchived}
          onRestored={() => {
            // Re-fetch active chats so restored chat appears in sidebar immediately.
            // The simplest way is a page reload; a lighter option would be to call
            // dbGetChats() and merge — but since restores are rare, reload is fine.
            window.location.reload();
          }}
        />
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
  );
};

export default App;
