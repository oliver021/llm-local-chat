import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'chat.db'));
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

  -- Reserved for future app settings (theme, provider prefs, etc.)
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// ── Incremental migrations (run safely on every startup) ──────────────────────

const existingColumns = (db.prepare(`PRAGMA table_info(chat_sessions)`).all() as { name: string }[])
  .map(r => r.name);

if (!existingColumns.includes('is_archived')) {
  db.exec(`ALTER TABLE chat_sessions ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0`);
}
if (!existingColumns.includes('created_at')) {
  db.exec(`ALTER TABLE chat_sessions ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0`);
}

export default db;
