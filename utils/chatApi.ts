import type { ChatSession, Message } from '../types';

const BASE = '/api/chats';

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

// ── Sessions ───────────────────────────────────────────────────────────────────

export function dbGetChats(): Promise<ChatSession[]> {
  return req<ChatSession[]>(BASE);
}

export function dbCreateChat(chat: ChatSession): Promise<void> {
  return req(BASE, { method: 'POST', ...json(chat) }).then(() => undefined);
}

export function dbUpdateChat(
  id: string,
  patch: Partial<Pick<ChatSession, 'title' | 'isPinned' | 'isArchived' | 'updatedAt'>>
): Promise<void> {
  return req(`${BASE}/${id}`, { method: 'PATCH', ...json(patch) }).then(() => undefined);
}

export function dbArchiveChat(id: string): Promise<void> {
  return dbUpdateChat(id, { isArchived: true });
}

export function dbUnarchiveChat(id: string): Promise<void> {
  return dbUpdateChat(id, { isArchived: false });
}

export function dbGetArchivedChats(): Promise<ChatSession[]> {
  return req<ChatSession[]>(`${BASE}/archived`);
}

export function dbDeleteChat(id: string): Promise<void> {
  return req(`${BASE}/${id}`, { method: 'DELETE' }).then(() => undefined);
}

export function dbDeleteAllChats(): Promise<void> {
  return req(BASE, { method: 'DELETE' }).then(() => undefined);
}

// ── Messages ───────────────────────────────────────────────────────────────────

export function dbAddMessage(chatId: string, message: Message): Promise<void> {
  return req(`${BASE}/${chatId}/messages`, { method: 'POST', ...json(message) }).then(
    () => undefined
  );
}

export function dbUpdateMessage(
  chatId: string,
  messageId: string,
  patch: Partial<Pick<Message, 'content' | 'isEdited' | 'editedAt'>>
): Promise<void> {
  return req(`${BASE}/${chatId}/messages/${messageId}`, {
    method: 'PATCH',
    ...json(patch),
  }).then(() => undefined);
}

export function dbDeleteMessage(chatId: string, messageId: string): Promise<void> {
  return req(`${BASE}/${chatId}/messages/${messageId}`, { method: 'DELETE' }).then(
    () => undefined
  );
}
