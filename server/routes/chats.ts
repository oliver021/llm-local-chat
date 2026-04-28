import { Router, Request, Response, NextFunction } from 'express';
import db from '../db.js';
import type { ChatSession, Message } from '../../types.js';

const router = Router();

type Handler = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;
function wrap(fn: Handler): Handler {
  return (req, res, next) => {
    try {
      const r = fn(req, res, next);
      if (r instanceof Promise) r.catch(next);
    } catch (err) { next(err); }
  };
}

// ── Row mappers ────────────────────────────────────────────────────────────────

interface SessionRow {
  id: string;
  title: string;
  is_pinned: number;
  is_archived: number;
  created_at: number;
  updated_at: number;
}

interface MessageRow {
  id: string;
  chat_id: string;
  role: string;
  content: string;
  timestamp: number;
  is_edited: number;
  edited_at: number | null;
}

function toSession(row: SessionRow, messages: Message[]): ChatSession {
  return {
    id: row.id,
    title: row.title,
    isPinned: row.is_pinned === 1,
    isArchived: row.is_archived === 1,
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at,
    messages,
  };
}

function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    role: row.role as 'user' | 'ai',
    content: row.content,
    timestamp: row.timestamp,
    isEdited: row.is_edited === 1,
    ...(row.edited_at !== null && { editedAt: row.edited_at }),
  };
}

function loadMessages(): Map<string, Message[]> {
  const allMessages = db
    .prepare('SELECT * FROM messages ORDER BY timestamp ASC')
    .all() as MessageRow[];
  const byChat = new Map<string, Message[]>();
  for (const row of allMessages) {
    const list = byChat.get(row.chat_id) ?? [];
    list.push(toMessage(row));
    byChat.set(row.chat_id, list);
  }
  return byChat;
}

// ── Routes ─────────────────────────────────────────────────────────────────────

// GET /api/chats — active (non-archived) sessions with messages
router.get('/', wrap((_req: Request, res: Response) => {
  const sessions = db
    .prepare('SELECT * FROM chat_sessions WHERE is_archived = 0 ORDER BY updated_at DESC')
    .all() as SessionRow[];
  const byChat = loadMessages();
  res.json(sessions.map(s => toSession(s, byChat.get(s.id) ?? [])));
}));

// GET /api/chats/archived — archived sessions with messages
router.get('/archived', wrap((_req: Request, res: Response) => {
  const sessions = db
    .prepare('SELECT * FROM chat_sessions WHERE is_archived = 1 ORDER BY updated_at DESC')
    .all() as SessionRow[];
  const byChat = loadMessages();
  res.json(sessions.map(s => toSession(s, byChat.get(s.id) ?? [])));
}));

// POST /api/chats — create a new session
router.post('/', wrap((req: Request, res: Response) => {
  const { id, title, isPinned, isArchived, createdAt, updatedAt } = req.body as ChatSession;
  const now = Date.now();
  db.prepare(
    `INSERT INTO chat_sessions (id, title, is_pinned, is_archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, title, isPinned ? 1 : 0, isArchived ? 1 : 0, createdAt ?? now, updatedAt);
  res.status(201).json({ id });
}));

// PATCH /api/chats/:id — update any combination of session fields
router.patch('/:id', wrap((req: Request, res: Response) => {
  const { title, isPinned, isArchived, updatedAt } = req.body as Partial<ChatSession>;
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (title      !== undefined) { sets.push('title = ?');       vals.push(title); }
  if (isPinned   !== undefined) { sets.push('is_pinned = ?');   vals.push(isPinned ? 1 : 0); }
  if (isArchived !== undefined) { sets.push('is_archived = ?'); vals.push(isArchived ? 1 : 0); }
  if (updatedAt  !== undefined) { sets.push('updated_at = ?');  vals.push(updatedAt); }
  if (!sets.length) { res.status(400).json({ error: 'nothing to update' }); return; }
  vals.push(req.params.id);
  db.prepare(`UPDATE chat_sessions SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  res.json({ ok: true });
}));

// DELETE /api/chats/:id — delete session (cascades to messages via FK)
router.delete('/:id', wrap((req: Request, res: Response) => {
  db.prepare('DELETE FROM chat_sessions WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
}));

// DELETE /api/chats — wipe all sessions
router.delete('/', wrap((_req: Request, res: Response) => {
  db.prepare('DELETE FROM chat_sessions').run();
  res.json({ ok: true });
}));

// POST /api/chats/:id/messages — append a message
router.post('/:id/messages', wrap((req: Request, res: Response) => {
  const { id, role, content, timestamp, isEdited, editedAt } = req.body as Message;
  db.prepare(
    `INSERT INTO messages (id, chat_id, role, content, timestamp, is_edited, edited_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, req.params.id, role, content, timestamp, isEdited ? 1 : 0, editedAt ?? null);
  res.status(201).json({ id });
}));

// PATCH /api/chats/:id/messages/:mid — edit message content / mark edited
router.patch('/:id/messages/:mid', wrap((req: Request, res: Response) => {
  const { content, isEdited, editedAt } = req.body as Partial<Message>;
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (content  !== undefined) { sets.push('content = ?');   vals.push(content); }
  if (isEdited !== undefined) { sets.push('is_edited = ?'); vals.push(isEdited ? 1 : 0); }
  if (editedAt !== undefined) { sets.push('edited_at = ?'); vals.push(editedAt); }
  if (!sets.length) { res.status(400).json({ error: 'nothing to update' }); return; }
  vals.push(req.params.mid);
  db.prepare(`UPDATE messages SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  res.json({ ok: true });
}));

// DELETE /api/chats/:id/messages/:mid — delete a single message
router.delete('/:id/messages/:mid', wrap((req: Request, res: Response) => {
  db.prepare('DELETE FROM messages WHERE id = ?').run(req.params.mid);
  res.json({ ok: true });
}));

export default router;
