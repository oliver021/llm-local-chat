import React, { useCallback, useRef } from 'react';
import { Toaster } from 'sonner';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { ChatArea } from './components/ChatArea';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SettingsModal } from './components/Settings';
import { ChatActionsProvider } from './context/ChatContext';
import { useTheme } from './hooks/useTheme';
import { useUIState } from './hooks/useUIState';
import { useChats } from './hooks/useChats';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { sidebarOpen, settingsOpen, openSidebar, closeSidebar, openSettings, closeSettings } =
    useUIState();
  const {
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
  } = useChats(closeSidebar);

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
        openSettings,
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
          onOpenSettings={openSettings}
          isOpen={sidebarOpen}
        />

        {/* MAIN LAYOUT: Flex column with fixed header + scrollable chat area */}
        {/* flex-1: Main expands to fill remaining space (after sidebar on md:) */}
        {/* min-w-0: Prevents overflow of flex children on narrow screens */}
        <main className="flex-1 flex flex-col min-w-0 relative">
          <TopNav
            theme={theme}
            toggleTheme={toggleTheme}
            toggleSidebar={openSidebar}
            currentChatTitle={activeChat?.title !== 'New Chat' ? activeChat?.title : undefined}
          />
          {/* ErrorBoundary isolates crashes to the chat area; sidebar + settings survive */}
          <ErrorBoundary>
            <ChatArea chat={activeChat} isTyping={isTyping} inputRef={inputRef} />
          </ErrorBoundary>
        </main>

        <SettingsModal isOpen={settingsOpen} onClose={closeSettings} />
      </div>

      {/*
        Toaster: positioned top-right, respects dark/light mode automatically.
        richColors enables semantic green/red/yellow styling for success/error/warning.
      */}
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
