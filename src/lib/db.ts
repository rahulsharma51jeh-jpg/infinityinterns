import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Single shared SQLite handle. Cached on `globalThis` so Next's dev-mode module
 * reloading doesn't open a new file handle on every hot reload.
 */
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'portal.db');

declare global {
  var __iiDb: Database.Database | undefined;
}

function init(): Database.Database {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schemaPath = path.join(process.cwd(), 'src', 'lib', 'schema.sql');
  db.exec(fs.readFileSync(schemaPath, 'utf8'));
  return db;
}

export const db: Database.Database = globalThis.__iiDb ?? (globalThis.__iiDb = init());

/* ------------------------------------------------------------------ */
/* Settings helpers                                                    */
/* ------------------------------------------------------------------ */

export function getSetting(key: string, fallback = ''): string {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? fallback;
}

export function setSetting(key: string, value: string): void {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run(key, value);
}

export function audit(
  actorId: number | null,
  action: string,
  entity = '',
  entityId: string | number = '',
  detail = '',
): void {
  db.prepare(
    'INSERT INTO audit_log (actor_id, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?)',
  ).run(actorId, action, entity, String(entityId), detail);
}
