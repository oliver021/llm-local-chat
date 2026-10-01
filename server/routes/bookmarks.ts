import { Router } from 'express';
import { z } from 'zod';
import type { Bookmark } from '../../types.js';
import type { Db } from '../db.js';
import { HttpError, parseBody, wrap } from '../http.js';

interface BookmarkRow {
  id: string;
  message_id: string;
  chat_id: string;
  title: string;
  note: string | null;
  created_at: number;
}

const createBookmarkSchema = z.object({
  id: z.string().min(1).max(200),
  messageId: z.string().min(1).max(200),
  chatId: z.string().min(1).max(200),
  title: z.string().max(500),
  note: z.string().max(5000).nullish(),
  createdAt: z.number().int().nonnegative(),
});

const updateBookmarkSchema = z.object({
  title: z.string().max(500).optional(),
  note: z.string().max(5000).nullish(),
});

function toBookmark(row: BookmarkRow): Bookmark {
  return {
    id: row.id,
    messageId: row.message_id,
    chatId: row.chat_id,
    title: row.title,
    note: row.note ?? undefined,
    createdAt: row.created_at,
  };
}

export function createBookmarksRouter(db: Db): Router {
  const router = Router();

  // GET /api/bookmarks — all bookmarks, newest first
  router.get(
    '/',
    wrap((_req, res) => {
      const rows = db
        .prepare('SELECT * FROM bookmarks ORDER BY created_at DESC')
        .all() as BookmarkRow[];
      res.json(rows.map(toBookmark));
    })
  );

  // GET /api/bookmarks/:id
  router.get(
    '/:id',
    wrap((req, res) => {
      const row = db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(req.params.id) as
        | BookmarkRow
        | undefined;
      if (!row) throw new HttpError(404, 'Bookmark not found', 'not_found');
      res.json(toBookmark(row));
    })
  );

  // POST /api/bookmarks
  router.post(
    '/',
    wrap((req, res) => {
      const body = parseBody(createBookmarkSchema, req.body);
      db.prepare(
        `INSERT INTO bookmarks (id, message_id, chat_id, title, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(body.id, body.messageId, body.chatId, body.title, body.note ?? null, body.createdAt);
      res.status(201).json({ id: body.id });
    })
  );

  // PATCH /api/bookmarks/:id — update title and/or note
  router.patch(
    '/:id',
    wrap((req, res) => {
      const body = parseBody(updateBookmarkSchema, req.body);
      const sets: string[] = [];
      const values: unknown[] = [];
      if (body.title !== undefined) {
        sets.push('title = ?');
        values.push(body.title);
      }
      if (body.note !== undefined) {
        sets.push('note = ?');
        values.push(body.note);
      }
      if (sets.length === 0) throw new HttpError(400, 'Nothing to update', 'invalid_request');
      const result = db
        .prepare(`UPDATE bookmarks SET ${sets.join(', ')} WHERE id = ?`)
        .run(...values, req.params.id);
      if (result.changes === 0) throw new HttpError(404, 'Bookmark not found', 'not_found');
      res.json({ ok: true });
    })
  );

  // DELETE /api/bookmarks/:id
  router.delete(
    '/:id',
    wrap((req, res) => {
      db.prepare('DELETE FROM bookmarks WHERE id = ?').run(req.params.id);
      res.json({ ok: true });
    })
  );

  return router;
}
