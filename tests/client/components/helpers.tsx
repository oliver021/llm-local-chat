import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { vi } from 'vitest';
import { ChatActionsProvider } from '../../../context/ChatContext';
import { SettingsProvider } from '../../../context/SettingsContext';
import type { UseSettingsResult } from '../../../hooks/useSettings';

type Actions = NonNullable<Parameters<typeof ChatActionsProvider>[0]['value']>;

/** Every chat action as a spy. */
export function makeActions(overrides: Partial<Actions> = {}): Actions {
  return {
    handleSendMessage: vi.fn(),
    handleNewChat: vi.fn(),
    handleSelectChat: vi.fn(),
    handleTogglePin: vi.fn(),
    handleDeleteChat: vi.fn(),
    handleArchiveChat: vi.fn(),
    handleCopyChat: vi.fn(),
    handleRenameChat: vi.fn(),
    handleStopStreaming: vi.fn(),
    openSettings: vi.fn(),
    openModelSelector: vi.fn(),
    handleCopyMessage: vi.fn(),
    handleDeleteMessage: vi.fn(),
    handleEditMessage: vi.fn(),
    handleRegenerateMessage: vi.fn(),
    handleClearHistory: vi.fn(),
    ...overrides,
  };
}

export function renderWithActions(ui: ReactElement, actions: Actions = makeActions()) {
  return { actions, ...render(<ChatActionsProvider value={actions}>{ui}</ChatActionsProvider>) };
}

export function renderWithSettings(ui: ReactElement, displayName = '') {
  const settings = {
    personalization: { displayName, customInstructions: '', memoriesEnabled: false, memories: [] },
  } as unknown as UseSettingsResult;
  return render(<SettingsProvider value={settings}>{ui}</SettingsProvider>);
}
