import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { json, readJson, startApp, type TestApp } from './helpers.js';

let app: TestApp;
beforeAll(async () => {
  app = await startApp();
});
afterAll(() => app.close());
beforeEach(async () => {
  await fetch(`${app.url}/api/chats`, { method: 'DELETE' });
  await fetch(`${app.url}/api/chats`, {
    method: 'POST',
    ...json({ id: 'chat-1', title: 't', updatedAt: 1 }),
  });
});

const bookmark = (over: Record<string, unknown> = {}) => ({
  id: 'bm-1',
  messageId: 'msg-1',
  chatId: 'chat-1',
  title: 'Great answer',
  createdAt: 100,
  ...over,
});
const post = (body: unknown) => fetch(`${app.url}/api/bookmarks`, { method: 'POST', ...json(body) });
const patch = (id: string, body: unknown) =>
  fetch(`${app.url}/api/bookmarks/${id}`, { method: 'PATCH', ...json(body) });

describe('bookmarks', () => {
  it('creates, reads and lists bookmarks newest first', async () => {
    expect((await post(bookmark())).status).toBe(201);
    await post(bookmark({ id: 'bm-2', createdAt: 200, note: 'keep' }));

    const all = await readJson(await fetch(`${app.url}/api/bookmarks`));
    expect(all.map((b: { id: string }) => b.id)).toEqual(['bm-2', 'bm-1']);
    expect(all[0]).toMatchObject({ note: 'keep', chatId: 'chat-1', messageId: 'msg-1' });

    const one = await readJson(await fetch(`${app.url}/api/bookmarks/bm-1`));
    expect(one).toMatchObject({ id: 'bm-1', title: 'Great answer' });
    expect(one.note).toBeUndefined();
  });

  it('answers 404 for an unknown bookmark', async () => {
    expect((await fetch(`${app.url}/api/bookmarks/nope`)).status).toBe(404);
    expect((await patch('nope', { title: 'x' })).status).toBe(404);
  });

  it('rejects a bookmark for a chat that does not exist', async () => {
    expect((await post(bookmark({ chatId: 'ghost' }))).status).toBe(404);
  });

  it('validates the body', async () => {
    expect((await post({ id: 'x' })).status).toBe(400);
  });

  it('updates and clears the note', async () => {
    await post(bookmark());
    await patch('bm-1', { title: 'Renamed', note: 'remember this' });
    let one = await readJson(await fetch(`${app.url}/api/bookmarks/bm-1`));
    expect(one).toMatchObject({ title: 'Renamed', note: 'remember this' });

    await patch('bm-1', { note: null });
    one = await readJson(await fetch(`${app.url}/api/bookmarks/bm-1`));
    expect(one.note).toBeUndefined();

    expect((await patch('bm-1', {})).status).toBe(400);
  });

  it('deletes a bookmark', async () => {
    await post(bookmark());
    await fetch(`${app.url}/api/bookmarks/bm-1`, { method: 'DELETE' });
    expect((await fetch(`${app.url}/api/bookmarks/bm-1`)).status).toBe(404);
  });
});
