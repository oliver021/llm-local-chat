import type { AppError, AppErrorCode, ChatSession, Message } from '../types';

const BASE = '/api/chats';

function classifyNetworkError(err: unknown, _url: string): AppError {
  const base = (err instanceof Error ? err : new Error(String(err))) as AppError;
  const msg = base.message.toLowerCase();
  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('econnrefused')) {
    base.code = 'NETWORK_UNREACHABLE';
    base.userFacing = true;
    base.userMessage = 'Backend unreachable — make sure the API server is running on port 3001.';
    base.retryable = true;
  } else {
    base.code = 'UNKNOWN';
    base.userFacing = false;
    base.retryable = false;
  }
  return base;
}

async function req<T = { ok: boolean }>(
  url: string,
  options?: RequestInit
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (err) {
    throw classifyNetworkError(err, url);
  }

  if (!res.ok) {
    let body: { message?: string } = {};
    try { body = await res.json(); } catch { /* non-JSON error body */ }
    const code: AppErrorCode = (res.status === 401 || res.status === 403) ? 'AUTH_INVALID' : 'UNKNOWN';
    const appErr = new Error(body.message ?? `API ${options?.method ?? 'GET'} ${url} → ${res.status}`) as AppError;
    appErr.code = code;
    appErr.userFacing = true;
    appErr.retryable = res.status >= 500;
    throw appErr;
  }

  try {
    return await res.json() as T;
  } catch (err) {
    const appErr = new Error(`Failed to parse response from ${url}`) as AppError;
    appErr.code = 'UNKNOWN';
    appErr.userFacing = false;
    appErr.retryable = false;
    throw appErr;
  }
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

export async function dbCopyChat(chatId: string, newId: string, newTitle: string, messages: any[]): Promise<void> {
  await dbCreateChat({
    id: newId,
    title: newTitle,
    isPinned: false,
    updatedAt: Date.now(),
    messages: [],
  });
  for (const msg of messages) {
    await dbAddMessage(newId, msg);
  }
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
