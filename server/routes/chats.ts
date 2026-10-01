import { Router } from 'express';
import { z } from 'zod';
import type { ChatSession, Message } from '../../types.js';
import type { Db } from '../db.js';
import { HttpError, parseBody, wrap } from '../http.js';

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

const id = z.string().min(1).max(200);
const timestamp = z.number().int().nonnegative();

const createSessionSchema = z.object({
  id,
  title: z.string().max(500),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  createdAt: timestamp.optional(),
  updatedAt: timestamp,
});

const updateSessionSchema = z.object({
  title: z.string().max(500).optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  updatedAt: timestamp.optional(),
});

const createMessageSchema = z.object({
  id,
  role: z.enum(['user', 'ai']),
  content: z.string(),
  timestamp,
  isEdited: z.boolean().optional(),
  editedAt: timestamp.optional(),
});

const updateMessageSchema = z.object({
  content: z.string().optional(),
  isEdited: z.boolean().optional(),
  editedAt: timestamp.optional(),
});

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

/** Build a `SET a = ?, b = ?` clause from the fields that were actually sent. */
function buildUpdate(fields: Array<[column: string, value: unknown]>) {
  const present = fields.filter(([, value]) => value !== undefined);
  if (present.length === 0) throw new HttpError(400, 'Nothing to update', 'invalid_request');
  return {
    set: present.map(([column]) => `${column} = ?`).join(', '),
    values: present.map(([, value]) => value),
  };
}

export function createChatsRouter(db: Db): Router {
  const router = Router();

  const listSessions = (archived: 0 | 1) => {
    const sessions = db
      .prepare('SELECT * FROM chat_sessions WHERE is_archived = ? ORDER BY updated_at DESC')
      .all(archived) as SessionRow[];
    const messages = db
      .prepare(
        `SELECT m.* FROM messages m
         JOIN chat_sessions s ON s.id = m.chat_id
         WHERE s.is_archived = ?
         ORDER BY m.timestamp ASC, m.rowid ASC`
      )
      .all(archived) as MessageRow[];

    const byChat = new Map<string, Message[]>();
    for (const row of messages) {
      const list = byChat.get(row.chat_id) ?? [];
      list.push(toMessage(row));
      byChat.set(row.chat_id, list);
    }
    return sessions.map((s) => toSession(s, byChat.get(s.id) ?? []));
  };

  // GET /api/chats — active (non-archived) sessions with their messages
  router.get(
    '/',
    wrap((_req, res) => {
      res.json(listSessions(0));
    })
  );

  // GET /api/chats/archived — archived sessions with their messages
  router.get(
    '/archived',
    wrap((_req, res) => {
      res.json(listSessions(1));
    })
  );

  // POST /api/chats — create a session
  router.post(
    '/',
    wrap((req, res) => {
      const body = parseBody(createSessionSchema, req.body);
      db.prepare(
        `INSERT INTO chat_sessions (id, title, is_pinned, is_archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        body.id,
        body.title,
        body.isPinned ? 1 : 0,
        body.isArchived ? 1 : 0,
        body.createdAt ?? Date.now(),
        body.updatedAt
      );
      res.status(201).json({ id: body.id });
    })
  );

  // PATCH /api/chats/:id — update any combination of session fields
  router.patch(
    '/:id',
    wrap((req, res) => {
      const body = parseBody(updateSessionSchema, req.body);
      const { set, values } = buildUpdate([
        ['title', body.title],
        ['is_pinned', body.isPinned === undefined ? undefined : Number(body.isPinned)],
        ['is_archived', body.isArchived === undefined ? undefined : Number(body.isArchived)],
        ['updated_at', body.updatedAt],
      ]);
      const result = db
        .prepare(`UPDATE chat_sessions SET ${set} WHERE id = ?`)
        .run(...values, req.params.id);
      if (result.changes === 0) throw new HttpError(404, 'Chat not found', 'not_found');
      res.json({ ok: true });
    })
  );

  // DELETE /api/chats/:id — delete a session (messages and bookmarks cascade)
  router.delete(
    '/:id',
    wrap((req, res) => {
      db.prepare('DELETE FROM chat_sessions WHERE id = ?').run(req.params.id);
      res.json({ ok: true });
    })
  );

  // DELETE /api/chats — wipe everything
  router.delete(
    '/',
    wrap((_req, res) => {
      db.prepare('DELETE FROM chat_sessions').run();
      res.json({ ok: true });
    })
  );

  // POST /api/chats/:id/messages — append a message
  router.post(
    '/:id/messages',
    wrap((req, res) => {
      const body = parseBody(createMessageSchema, req.body);
      db.prepare(
        `INSERT INTO messages (id, chat_id, role, content, timestamp, is_edited, edited_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        body.id,
        req.params.id,
        body.role,
        body.content,
        body.timestamp,
        body.isEdited ? 1 : 0,
        body.editedAt ?? null
      );
      res.status(201).json({ id: body.id });
    })
  );

  // PATCH /api/chats/:id/messages/:mid — edit content / mark as edited
  router.patch(
    '/:id/messages/:mid',
    wrap((req, res) => {
      const body = parseBody(updateMessageSchema, req.body);
      const { set, values } = buildUpdate([
        ['content', body.content],
        ['is_edited', body.isEdited === undefined ? undefined : Number(body.isEdited)],
        ['edited_at', body.editedAt],
      ]);
      const result = db
        .prepare(`UPDATE messages SET ${set} WHERE id = ? AND chat_id = ?`)
        .run(...values, req.params.mid, req.params.id);
      if (result.changes === 0) throw new HttpError(404, 'Message not found', 'not_found');
      res.json({ ok: true });
    })
  );

  // DELETE /api/chats/:id/messages/:mid — delete one message
  router.delete(
    '/:id/messages/:mid',
    wrap((req, res) => {
      db.prepare('DELETE FROM messages WHERE id = ? AND chat_id = ?').run(
        req.params.mid,
        req.params.id
      );
      res.json({ ok: true });
    })
  );

  return router;
}
