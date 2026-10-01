import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  dbAddMessage,
  dbCopyChat,
  dbGetChats,
  dbUpdateChat,
} from '../../../utils/chatApi';
import type { AppError, Message } from '../../../types';
import { jsonResponse, mockFetch } from '../services/helpers';

afterEach(() => vi.unstubAllGlobals());

describe('chat API client', () => {
  it('sends JSON and parses the response', async () => {
    const fetchMock = mockFetch().mockResolvedValue(jsonResponse({ ok: true }));
    await dbUpdateChat('c1', { title: 'New', isPinned: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/chats/c1');
    expect(init).toMatchObject({ method: 'PATCH', headers: { 'Content-Type': 'application/json' } });
    expect(JSON.parse(init!.body as string)).toEqual({ title: 'New', isPinned: true });
  });

  it('turns a refused connection into an actionable error', async () => {
    mockFetch().mockRejectedValue(new TypeError('Failed to fetch'));
    const err = (await dbGetChats().catch((e) => e)) as AppError;
    expect(err.code).toBe('NETWORK_UNREACHABLE');
    expect(err.retryable).toBe(true);
    expect(err.userMessage).toMatch(/server is running/);
  });

  it('uses the server’s message for failed requests', async () => {
    mockFetch().mockResolvedValue(jsonResponse({ error: 'invalid_request', message: 'Invalid request — id: Required' }, 400));
    const err = (await dbAddMessage('c1', {} as Message).catch((e) => e)) as AppError;
    expect(err.message).toBe('Invalid request — id: Required');
    expect(err.retryable).toBe(false);
  });

  it('flags 5xx as retryable and 401 as an auth problem', async () => {
    mockFetch().mockResolvedValueOnce(jsonResponse({}, 500));
    expect(((await dbGetChats().catch((e) => e)) as AppError).retryable).toBe(true);

    mockFetch().mockResolvedValueOnce(jsonResponse({}, 401));
    expect(((await dbGetChats().catch((e) => e)) as AppError).code).toBe('AUTH_INVALID');
  });
});

describe('dbCopyChat', () => {
  it('creates the chat first, then adds the messages in order', async () => {
    const fetchMock = mockFetch().mockImplementation(async () => jsonResponse({ ok: true }, 201));
    const messages: Message[] = [
      { id: 'n1', role: 'user', content: 'q', timestamp: 1 },
      { id: 'n2', role: 'ai', content: 'a', timestamp: 2 },
    ];

    await dbCopyChat('copy-1', 'My copy', messages);

    const calls = fetchMock.mock.calls.map(([url, init]) => `${init?.method} ${url}`);
    expect(calls).toEqual([
      'POST /api/chats',
      'POST /api/chats/copy-1/messages',
      'POST /api/chats/copy-1/messages',
    ]);
    const created = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    expect(created).toMatchObject({ id: 'copy-1', title: 'My copy', isPinned: false, messages: [] });
    const sentIds = fetchMock.mock.calls.slice(1).map(([, init]) => JSON.parse(init!.body as string).id);
    expect(sentIds).toEqual(['n1', 'n2']);
  });
});
