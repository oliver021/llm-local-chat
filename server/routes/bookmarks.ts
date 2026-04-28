import { Router, Request, Response, NextFunction } from 'express';
import db from '../db.js';
import type { Bookmark } from '../../types.js';

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

interface BookmarkRow {
  id: string;
  message_id: string;
  chat_id: string;
  title: string;
  note: string | null;
  created_at: number;
}

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

// GET /api/bookmarks — all bookmarks
router.get('/', wrap((_req: Request, res: Response) => {
  const rows = db
    .prepare('SELECT * FROM bookmarks ORDER BY created_at DESC')
    .all() as BookmarkRow[];
  res.json(rows.map(toBookmark));
}));

// GET /api/bookmarks/:id — single bookmark
router.get('/:id', wrap((req: Request, res: Response) => {
  const row = db
    .prepare('SELECT * FROM bookmarks WHERE id = ?')
    .get(req.params.id) as BookmarkRow | undefined;
  if (!row) { res.status(404).json({ error: 'not found' }); return; }
  res.json(toBookmark(row));
}));

// POST /api/bookmarks — create bookmark
router.post('/', wrap((req: Request, res: Response) => {
  const { id, messageId, chatId, title, note, createdAt } = req.body as Bookmark;
  db.prepare(
    `INSERT INTO bookmarks (id, message_id, chat_id, title, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, messageId, chatId, title, note ?? null, createdAt);
  res.status(201).json({ id });
}));

// PATCH /api/bookmarks/:id — update title/note
router.patch('/:id', wrap((req: Request, res: Response) => {
  const { title, note } = req.body as Partial<Bookmark>;
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (title !== undefined) { sets.push('title = ?'); vals.push(title); }
  if (note !== undefined) { sets.push('note = ?'); vals.push(note ?? null); }
  if (!sets.length) { res.status(400).json({ error: 'nothing to update' }); return; }
  vals.push(req.params.id);
  db.prepare(`UPDATE bookmarks SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  res.json({ ok: true });
}));

// DELETE /api/bookmarks/:id — delete bookmark
router.delete('/:id', wrap((req: Request, res: Response) => {
  db.prepare('DELETE FROM bookmarks WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
}));

export default router;
