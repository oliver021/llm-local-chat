import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export type Db = Database.Database;

function columns(db: Db, table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((r) => r.name);
}

/**
 * Open (and create / migrate) the SQLite database.
 * Pass ":memory:" for an ephemeral database, e.g. in tests.
 */
export function openDatabase(file: string): Db {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });

  const db = new Database(file);
  if (file !== ':memory:') db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

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

  // Incremental migrations for databases created by earlier versions.
  // Each ALTER runs on its own so one failure does not block the rest.
  const migrations: Array<{ table: string; column: string; ddl: string }> = [
    {
      table: 'chat_sessions',
      column: 'is_archived',
      ddl: 'ALTER TABLE chat_sessions ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0',
    },
    {
      table: 'chat_sessions',
      column: 'created_at',
      ddl: 'ALTER TABLE chat_sessions ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0',
    },
    { table: 'bookmarks', column: 'note', ddl: 'ALTER TABLE bookmarks ADD COLUMN note TEXT' },
  ];
  for (const m of migrations) {
    if (columns(db, m.table).includes(m.column)) continue;
    try {
      db.exec(m.ddl);
    } catch (err) {
      console.warn(`[db] migration ${m.table}.${m.column} failed:`, err);
    }
  }

  // Indexes after the migrations so they can reference migrated columns.
  // messages.chat_id in particular keeps ON DELETE CASCADE and chat loading fast.
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_chat_id    ON messages(chat_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_chat_id   ON bookmarks(chat_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON chat_sessions(updated_at);
  `);

  return db;
}
