import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

export const DATA_DIR = process.env.THINK_DATA_DIR || path.join(process.cwd(), 'data');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
export const THUMBNAILS_DIR = path.join(DATA_DIR, 'thumbnails');

let _db: BetterSQLite3Database<typeof schema> | null = null;

function initDb(): BetterSQLite3Database<typeof schema> {
  if (_db) return _db;

  for (const dir of [DATA_DIR, UPLOADS_DIR, THUMBNAILS_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const sqlite = new Database(path.join(DATA_DIR, 'think.db'));
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('wal_checkpoint(TRUNCATE)');

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      position_x REAL NOT NULL DEFAULT 0,
      position_y REAL NOT NULL DEFAULT 0,
      width REAL DEFAULT 280,
      height REAL DEFAULT 200,
      source_path TEXT,
      thumbnail_path TEXT,
      source_card_id TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      search_text TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS edges (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      source_card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      target_card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      label TEXT NOT NULL DEFAULT '',
      edge_type TEXT NOT NULL DEFAULT 'relation',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_cards_workspace ON cards(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_cards_source ON cards(source_card_id);
    CREATE TABLE IF NOT EXISTS drawings (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      path_data TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#000000',
      stroke_width REAL NOT NULL DEFAULT 2,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_drawings_workspace ON drawings(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_edges_workspace ON edges(workspace_id);
  `);

  // Migrations
  try { sqlite.exec(`ALTER TABLE cards ADD COLUMN source_card_id TEXT`); } catch {}
  try { sqlite.exec(`ALTER TABLE workspaces ADD COLUMN icon TEXT`); } catch {}
  try { sqlite.exec(`ALTER TABLE workspaces ADD COLUMN pinned REAL DEFAULT 0`); } catch {}

  _db = drizzle(sqlite, { schema });
  return _db;
}

export const db = new Proxy({} as BetterSQLite3Database<typeof schema>, {
  get(_target, prop) {
    const instance = initDb();
    return (instance as any)[prop];
  },
});
