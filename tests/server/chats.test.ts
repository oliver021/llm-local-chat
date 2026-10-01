import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { json, readJson, startApp, type TestApp } from './helpers.js';

let app: TestApp;
beforeAll(async () => {
  app = await startApp();
});
afterAll(() => app.close());
beforeEach(async () => {
  await fetch(`${app.url}/api/chats`, { method: 'DELETE' });
});

const chat = (over: Record<string, unknown> = {}) => ({
  id: 'chat-1',
  title: 'Hello',
  isPinned: false,
  updatedAt: 1000,
  ...over,
});
const message = (over: Record<string, unknown> = {}) => ({
  id: 'msg-1',
  role: 'user',
  content: 'hi',
  timestamp: 1000,
  ...over,
});

const post = (path: string, body: unknown) =>
  fetch(`${app.url}${path}`, { method: 'POST', ...json(body) });
const patch = (path: string, body: unknown) =>
  fetch(`${app.url}${path}`, { method: 'PATCH', ...json(body) });
const list = async (path = '/api/chats') => readJson(await fetch(`${app.url}${path}`));

describe('chat sessions', () => {
  it('creates a session and lists it with its messages in order', async () => {
    expect((await post('/api/chats', chat())).status).toBe(201);
    await post('/api/chats/chat-1/messages', message({ id: 'a', timestamp: 2000, content: 'second' }));
    await post('/api/chats/chat-1/messages', message({ id: 'b', timestamp: 1000, content: 'first' }));

    const [session] = await list();
    expect(session).toMatchObject({ id: 'chat-1', title: 'Hello', isPinned: false, isArchived: false });
    expect(session.messages.map((m: { content: string }) => m.content)).toEqual(['first', 'second']);
  });

  it('keeps insertion order when timestamps are identical', async () => {
    await post('/api/chats', chat());
    for (const [id, content] of [['m1', 'question'], ['m2', 'answer'], ['m3', 'follow-up']]) {
      await post('/api/chats/chat-1/messages', message({ id, content, timestamp: 5000 }));
    }
    const [session] = await list();
    expect(session.messages.map((m: { content: string }) => m.content)).toEqual([
      'question',
      'answer',
      'follow-up',
    ]);
  });

  it('lists newest-updated sessions first', async () => {
    await post('/api/chats', chat({ id: 'old', updatedAt: 1 }));
    await post('/api/chats', chat({ id: 'new', updatedAt: 99 }));
    expect((await list()).map((c: { id: string }) => c.id)).toEqual(['new', 'old']);
  });

  it('rejects invalid bodies with a 400 that names the field', async () => {
    const res = await post('/api/chats', { title: 'no id', updatedAt: 1 });
    expect(res.status).toBe(400);
    const body = await readJson(res);
    expect(body.error).toBe('invalid_request');
    expect(body.message).toContain('id');
  });

  it('rejects malformed JSON with a 400', async () => {
    const res = await fetch(`${app.url}/api/chats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not json',
    });
    expect(res.status).toBe(400);
  });

  it('rejects oversized bodies with a 413', async () => {
    const res = await post('/api/chats', chat({ title: 'x'.repeat(6 * 1024 * 1024) }));
    expect(res.status).toBe(413);
  });

  it('answers 409 for a duplicate id instead of crashing', async () => {
    await post('/api/chats', chat());
    const res = await post('/api/chats', chat());
    expect(res.status).toBe(409);
  });

  it('updates title, pin and timestamp', async () => {
    await post('/api/chats', chat());
    expect((await patch('/api/chats/chat-1', { title: 'Renamed', isPinned: true, updatedAt: 5 })).status).toBe(200);
    const [session] = await list();
    expect(session).toMatchObject({ title: 'Renamed', isPinned: true, updatedAt: 5 });
  });

  it('answers 404 when patching an unknown chat and 400 for an empty patch', async () => {
    expect((await patch('/api/chats/ghost', { title: 'x' })).status).toBe(404);
    await post('/api/chats', chat());
    expect((await patch('/api/chats/chat-1', {})).status).toBe(400);
  });

  it('moves archived chats to /archived and back', async () => {
    await post('/api/chats', chat());
    await patch('/api/chats/chat-1', { isArchived: true });
    expect(await list()).toHaveLength(0);
    expect((await list('/api/chats/archived')).map((c: { id: string }) => c.id)).toEqual(['chat-1']);

    await patch('/api/chats/chat-1', { isArchived: false });
    expect(await list()).toHaveLength(1);
    expect(await list('/api/chats/archived')).toHaveLength(0);
  });

  it('deletes a session together with its messages and bookmarks', async () => {
    await post('/api/chats', chat());
    await post('/api/chats/chat-1/messages', message());
    await post('/api/bookmarks', { id: 'bm', messageId: 'msg-1', chatId: 'chat-1', title: 't', createdAt: 1 });

    expect((await fetch(`${app.url}/api/chats/chat-1`, { method: 'DELETE' })).status).toBe(200);
    expect(await list()).toHaveLength(0);
    expect(app.db.prepare('SELECT COUNT(*) AS n FROM messages').get()).toEqual({ n: 0 });
    expect(await list('/api/bookmarks')).toHaveLength(0);
  });

  it('wipes everything with DELETE /api/chats', async () => {
    await post('/api/chats', chat({ id: 'a' }));
    await post('/api/chats', chat({ id: 'b' }));
    await fetch(`${app.url}/api/chats`, { method: 'DELETE' });
    expect(await list()).toHaveLength(0);
  });
});

describe('messages', () => {
  beforeEach(async () => {
    await post('/api/chats', chat());
  });

  it('rejects a message for a chat that does not exist', async () => {
    const res = await post('/api/chats/ghost/messages', message());
    expect(res.status).toBe(404);
  });

  it('rejects an unknown role', async () => {
    const res = await post('/api/chats/chat-1/messages', message({ role: 'system' }));
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate message id (ids are global primary keys)', async () => {
    await post('/api/chats/chat-1/messages', message());
    await post('/api/chats', chat({ id: 'chat-2' }));
    const res = await post('/api/chats/chat-2/messages', message());
    expect(res.status).toBe(409);
  });

  it('edits a message and records the edit', async () => {
    await post('/api/chats/chat-1/messages', message());
    const res = await patch('/api/chats/chat-1/messages/msg-1', { content: 'edited', isEdited: true, editedAt: 9 });
    expect(res.status).toBe(200);
    const [session] = await list();
    expect(session.messages[0]).toMatchObject({ content: 'edited', isEdited: true, editedAt: 9 });
  });

  it('does not let one chat edit or delete another chat’s message', async () => {
    await post('/api/chats', chat({ id: 'chat-2' }));
    await post('/api/chats/chat-1/messages', message());

    expect((await patch('/api/chats/chat-2/messages/msg-1', { content: 'hijack' })).status).toBe(404);
    await fetch(`${app.url}/api/chats/chat-2/messages/msg-1`, { method: 'DELETE' });

    const [first] = (await list()).filter((c: { id: string }) => c.id === 'chat-1');
    expect(first.messages).toHaveLength(1);
    expect(first.messages[0].content).toBe('hi');
  });

  it('deletes a single message', async () => {
    await post('/api/chats/chat-1/messages', message());
    await fetch(`${app.url}/api/chats/chat-1/messages/msg-1`, { method: 'DELETE' });
    const [session] = await list();
    expect(session.messages).toHaveLength(0);
  });

  it('supports copying a chat: same content under fresh message ids', async () => {
    await post('/api/chats/chat-1/messages', message({ id: 'orig-1', content: 'q' }));
    await post('/api/chats', chat({ id: 'copy' }));
    expect((await post('/api/chats/copy/messages', message({ id: 'copy-1', content: 'q' }))).status).toBe(201);
  });
});
