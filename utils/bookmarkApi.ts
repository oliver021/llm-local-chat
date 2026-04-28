import type { Bookmark } from '../types';

const BASE = '/api/bookmarks';

async function req<T = { ok: boolean }>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`API ${options?.method ?? 'GET'} ${url} → ${res.status}`);
  return res.json() as Promise<T>;
}

function json(body: unknown): RequestInit {
  return {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export function dbGetBookmarks(): Promise<Bookmark[]> {
  return req<Bookmark[]>(BASE);
}

export function dbCreateBookmark(bookmark: Bookmark): Promise<void> {
  return req(BASE, { method: 'POST', ...json(bookmark) }).then(() => undefined);
}

export function dbUpdateBookmark(
  id: string,
  patch: Partial<Pick<Bookmark, 'title' | 'note'>>
): Promise<void> {
  return req(`${BASE}/${id}`, { method: 'PATCH', ...json(patch) }).then(() => undefined);
}

export function dbDeleteBookmark(id: string): Promise<void> {
  return req(`${BASE}/${id}`, { method: 'DELETE' }).then(() => undefined);
}
