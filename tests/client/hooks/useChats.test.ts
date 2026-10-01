import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppError, ChatSession } from '../../../types';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => 'toast-id'),
  }),
}));

vi.mock('../../../utils/chatApi', () => ({
  dbGetChats: vi.fn(),
  dbCreateChat: vi.fn(async () => undefined),
  dbUpdateChat: vi.fn(async () => undefined),
  dbDeleteChat: vi.fn(async () => undefined),
  dbDeleteAllChats: vi.fn(async () => undefined),
  dbAddMessage: vi.fn(async () => undefined),
  dbUpdateMessage: vi.fn(async () => undefined),
  dbDeleteMessage: vi.fn(async () => undefined),
  dbArchiveChat: vi.fn(async () => undefined),
  dbCopyChat: vi.fn(async () => undefined),
}));

vi.mock('../../../services/providerDispatch', () => ({ getStreamFn: vi.fn() }));

import * as api from '../../../utils/chatApi';
import { getStreamFn } from '../../../services/providerDispatch';
import { useChats } from '../../../hooks/useChats';

const seedChat = (): ChatSession => ({
  id: 'chat-seed',
  title: 'Seed chat',
  isPinned: false,
  updatedAt: 1,
  messages: [
    { id: 'u1', role: 'user', content: 'first question', timestamp: 1 },
    { id: 'a1', role: 'ai', content: 'first answer', timestamp: 2 },
    { id: 'u2', role: 'user', content: 'second question', timestamp: 3 },
    { id: 'a2', role: 'ai', content: 'second answer', timestamp: 4 },
  ],
});

/** Replace the model with a stream the test drives by hand. */
function fakeModel() {
  const calls: Array<{
    messages: Array<{ role: string; content: string }>;
    systemPrompt?: string;
    onChunk: (t: string) => void;
    onDone: () => void;
    onError: (e: Error) => void;
  }> = [];
  const cancel = vi.fn();
  const stream = vi.fn((messages, onChunk, onDone, onError, systemPrompt) => {
    calls.push({ messages, systemPrompt, onChunk, onDone, onError });
    return cancel;
  });
  vi.mocked(getStreamFn).mockReturnValue(stream);
  return { calls, cancel, stream };
}

async function loadHook(systemPrompt?: string, chats: ChatSession[] = [seedChat()]) {
  vi.mocked(api.dbGetChats).mockResolvedValue(chats);
  const hook = renderHook(
    (props: { systemPrompt?: string }) => useChats(undefined, 'llm-llamacpp', 'model.gguf', props.systemPrompt),
    { initialProps: { systemPrompt } }
  );
  await waitFor(() => expect(hook.result.current.dbReady).toBe(true));
  return hook;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('loading', () => {
  it('shows the stored chats, not the archived ones', async () => {
    const archived = { ...seedChat(), id: 'old', isArchived: true };
    const { result } = await loadHook(undefined, [seedChat(), archived]);
    expect(result.current.chats.map((c) => c.id)).toEqual(['chat-seed']);
  });

  it('keeps working in memory when the backend is down', async () => {
    vi.mocked(api.dbGetChats).mockRejectedValue(new Error('offline'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useChats());
    await waitFor(() => expect(result.current.dbReady).toBe(true));
    expect(result.current.chats).toEqual([]);
  });
});

describe('sending a message', () => {
  it('streams the reply into a new chat and persists both messages', async () => {
    const model = fakeModel();
    const { result } = await loadHook(undefined, []);

    act(() => result.current.handleSendMessage('hello there'));

    const chat = result.current.chats[0];
    expect(chat.title).toBe('hello there');
    expect(chat.messages.map((m) => m.role)).toEqual(['user', 'ai']);
    expect(chat.messages[1].isStreaming).toBe(true);
    expect(api.dbCreateChat).toHaveBeenCalledWith(expect.objectContaining({ id: chat.id }));
    expect(model.calls[0].messages).toEqual([{ role: 'user', content: 'hello there' }]);

    act(() => {
      model.calls[0].onChunk('Hel');
      model.calls[0].onChunk('lo');
    });
    expect(result.current.chats[0].messages[1].content).toBe('Hello');

    act(() => model.calls[0].onDone());
    const [, reply] = result.current.chats[0].messages;
    expect(reply).toMatchObject({ content: 'Hello', isStreaming: false });
    expect(api.dbAddMessage).toHaveBeenCalledWith(chat.id, expect.objectContaining({ role: 'user', content: 'hello there' }));
    expect(api.dbAddMessage).toHaveBeenCalledWith(chat.id, expect.objectContaining({ role: 'ai', content: 'Hello' }));
  });

  it('sends the earlier conversation as history, with roles mapped for the API', async () => {
    const model = fakeModel();
    const { result } = await loadHook();
    act(() => result.current.handleSelectChat('chat-seed'));
    act(() => result.current.handleSendMessage('third question'));

    expect(model.calls[0].messages).toEqual([
      { role: 'user', content: 'first question' },
      { role: 'assistant', content: 'first answer' },
      { role: 'user', content: 'second question' },
      { role: 'assistant', content: 'second answer' },
      { role: 'user', content: 'third question' },
    ]);
  });

  it('shows and stores a readable message when the model fails', async () => {
    const model = fakeModel();
    const { result } = await loadHook(undefined, []);
    act(() => result.current.handleSendMessage('hi'));

    const error = Object.assign(new Error('boom'), {
      code: 'NETWORK_UNREACHABLE',
      userMessage: 'Could not reach Ollama at http://x. Is it running?',
    }) as AppError;
    act(() => model.calls[0].onError(error));

    const reply = result.current.chats[0].messages[1];
    expect(reply).toMatchObject({
      content: 'Could not reach Ollama at http://x. Is it running?',
      isError: true,
      isStreaming: false,
      errorCode: 'NETWORK_UNREACHABLE',
    });
    expect(api.dbAddMessage).toHaveBeenCalledWith(
      result.current.chats[0].id,
      expect.objectContaining({ role: 'ai', content: 'Could not reach Ollama at http://x. Is it running?' })
    );
  });

  it('Stop cancels the stream and keeps what was received so far', async () => {
    const model = fakeModel();
    const { result } = await loadHook(undefined, []);
    act(() => result.current.handleSendMessage('write a poem'));
    act(() => model.calls[0].onChunk('Roses are'));

    act(() => result.current.handleStopStreaming());

    expect(model.cancel).toHaveBeenCalled();
    expect(result.current.chats[0].messages[1]).toMatchObject({ content: 'Roses are', isStreaming: false });
    expect(api.dbAddMessage).toHaveBeenCalledWith(
      result.current.chats[0].id,
      expect.objectContaining({ role: 'ai', content: 'Roses are' })
    );
  });

  it('uses the latest system prompt, not the one from an earlier render', async () => {
    // Regression: the memoised callback used to capture the first prompt forever.
    const model = fakeModel();
    const { result, rerender } = await loadHook('You are version A.', []);

    rerender({ systemPrompt: 'You are version B.' });
    act(() => result.current.handleSendMessage('hi'));

    expect(model.calls[0].systemPrompt).toBe('You are version B.');
  });
});

describe('copying and branching a chat', () => {
  it('copies every message under fresh ids (ids are primary keys in the database)', async () => {
    // Regression: copies reused the original ids, so the server rejected them.
    const { result } = await loadHook();
    act(() => result.current.handleCopyChat('chat-seed'));

    const [copy, original] = result.current.chats;
    expect(original.id).toBe('chat-seed');
    expect(copy.title).toBe('Seed chat (Copy)');
    expect(copy.messages.map((m) => m.content)).toEqual(original.messages.map((m) => m.content));

    const copyIds = copy.messages.map((m) => m.id);
    expect(new Set(copyIds).size).toBe(copyIds.length);
    expect(copyIds.some((id) => original.messages.some((m) => m.id === id))).toBe(false);

    expect(api.dbCopyChat).toHaveBeenCalledWith(copy.id, 'Seed chat (Copy)', copy.messages);
    expect(result.current.activeChatId).toBe(copy.id);
  });

  it('uses the title the user typed', async () => {
    const { result } = await loadHook();
    act(() => result.current.handleCopyChat('chat-seed', { title: '  My own title ' }));
    expect(result.current.chats[0].title).toBe('My own title');
  });

  it('branches up to and including the chosen message', async () => {
    const { result } = await loadHook();
    act(() => result.current.handleCopyChat('chat-seed', { title: 'Seed chat (Branch)', upToMessageId: 'a1' }));

    const branch = result.current.chats[0];
    expect(branch.messages.map((m) => m.content)).toEqual(['first question', 'first answer']);
    expect(result.current.chats.find((c) => c.id === 'chat-seed')?.messages).toHaveLength(4);
  });

  it('does nothing for an unknown chat or message', async () => {
    const { result } = await loadHook();
    act(() => result.current.handleCopyChat('ghost'));
    act(() => result.current.handleCopyChat('chat-seed', { upToMessageId: 'ghost' }));
    expect(result.current.chats).toHaveLength(1);
    expect(api.dbCopyChat).not.toHaveBeenCalled();
  });
});

describe('chat management', () => {
  it('pins, renames, archives and deletes, mirroring each change to the server', async () => {
    const { result } = await loadHook();

    act(() => result.current.handleTogglePin('chat-seed'));
    expect(result.current.chats[0].isPinned).toBe(true);
    expect(api.dbUpdateChat).toHaveBeenCalledWith('chat-seed', { isPinned: true });

    act(() => result.current.handleRenameChat('chat-seed', '  Renamed  '));
    expect(result.current.chats[0].title).toBe('Renamed');
    expect(api.dbUpdateChat).toHaveBeenCalledWith('chat-seed', { title: 'Renamed' });

    act(() => result.current.handleRenameChat('chat-seed', '   '));
    expect(result.current.chats[0].title).toBe('Renamed');

    act(() => result.current.handleArchiveChat('chat-seed'));
    expect(result.current.chats).toHaveLength(0);
    expect(api.dbArchiveChat).toHaveBeenCalledWith('chat-seed');
  });

  it('deletes a chat and clears the selection if it was active', async () => {
    const { result } = await loadHook();
    act(() => result.current.handleSelectChat('chat-seed'));
    act(() => result.current.handleDeleteChat('chat-seed'));
    expect(result.current.chats).toHaveLength(0);
    expect(result.current.activeChatId).toBeNull();
    expect(api.dbDeleteChat).toHaveBeenCalledWith('chat-seed');
  });

  it('edits and deletes single messages', async () => {
    const { result } = await loadHook();
    act(() => result.current.handleEditMessage('chat-seed', 'u1', 'edited question'));
    expect(result.current.chats[0].messages[0]).toMatchObject({ content: 'edited question', isEdited: true });
    expect(api.dbUpdateMessage).toHaveBeenCalledWith('chat-seed', 'u1', expect.objectContaining({ content: 'edited question', isEdited: true }));

    act(() => result.current.handleDeleteMessage('chat-seed', 'a2'));
    expect(result.current.chats[0].messages.map((m) => m.id)).toEqual(['u1', 'a1', 'u2']);
    expect(api.dbDeleteMessage).toHaveBeenCalledWith('chat-seed', 'a2');
  });
});
