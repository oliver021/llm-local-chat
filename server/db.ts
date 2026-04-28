import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

let db: Database.Database;

try {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  db = new Database(path.join(dataDir, 'chat.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id          TEXT    PRIMARY KEY,
      title       TEXT    NOT NULL,
      is_pinned   INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL DEFAULT 0,
      updated_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id        TEXT    PRIMARY KEY,
      chat_id   TEXT    NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role      TEXT    NOT NULL,
      content   TEXT    NOT NULL,
      timestamp INTEGER NOT NULL,
      is_edited INTEGER NOT NULL DEFAULT 0,
      edited_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id         TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      chat_id    TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      title      TEXT NOT NULL,
      note       TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  // ── Incremental migrations — each ALTER runs independently so one failure
  //    does not block the rest ───────────────────────────────────────────────

  const chatCols = (db.prepare(`PRAGMA table_info(chat_sessions)`).all() as { name: string }[])
    .map(r => r.name);

  if (!chatCols.includes('is_archived')) {
    try { db.exec(`ALTER TABLE chat_sessions ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0`); }
    catch (e) { console.warn('[db] migration is_archived failed:', e); }
  }
  if (!chatCols.includes('created_at')) {
    try { db.exec(`ALTER TABLE chat_sessions ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0`); }
    catch (e) { console.warn('[db] migration created_at failed:', e); }
  }

  const bmCols = (db.prepare(`PRAGMA table_info(bookmarks)`).all() as { name: string }[])
    .map(r => r.name);

  if (!bmCols.includes('note')) {
    try { db.exec(`ALTER TABLE bookmarks ADD COLUMN note TEXT`); }
    catch (e) { console.warn('[db] migration bookmarks.note failed:', e); }
  }
} catch (err) {
  console.error('[db] Fatal: failed to initialise database:', err);
  process.exit(1);
}

export default db!;
