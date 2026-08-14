-- Infinity Interns Portal :: SQLite schema
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  phone         TEXT,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'intern' CHECK (role IN ('intern','admin')),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Internship programs offered (domains)
CREATE TABLE IF NOT EXISTS programs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT    NOT NULL,
  slug         TEXT    NOT NULL UNIQUE,
  summary      TEXT    NOT NULL DEFAULT '',
  description  TEXT    NOT NULL DEFAULT '',
  duration     TEXT    NOT NULL DEFAULT '4 Weeks',
  mode         TEXT    NOT NULL DEFAULT 'Online',
  stipend      TEXT    NOT NULL DEFAULT 'Unpaid / Certificate based',
  skills       TEXT    NOT NULL DEFAULT '[]',
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- An intern's application to a program. Becomes eligible for a certificate on approval.
CREATE TABLE IF NOT EXISTS applications (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id     INTEGER NOT NULL REFERENCES programs(id) ON DELETE RESTRICT,
  full_name      TEXT    NOT NULL,
  salutation     TEXT    NOT NULL DEFAULT 'Mr.',
  gender         TEXT    NOT NULL DEFAULT 'other' CHECK (gender IN ('male','female','other')),
  college        TEXT    NOT NULL,
  course         TEXT    NOT NULL DEFAULT '',
  email          TEXT    NOT NULL,
  phone          TEXT    NOT NULL DEFAULT '',
  duration       TEXT    NOT NULL DEFAULT '4 Weeks',
  mode           TEXT    NOT NULL DEFAULT 'Online',
  domain         TEXT    NOT NULL,
  start_date     TEXT,
  end_date       TEXT,
  attendance     INTEGER,
  marks          INTEGER,
  project_title  TEXT    NOT NULL DEFAULT '',
  mentor_name    TEXT    NOT NULL DEFAULT '',
  extra          TEXT    NOT NULL DEFAULT '{}',
  status         TEXT    NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','under_review','approved','rejected','completed')),
  admin_note     TEXT    NOT NULL DEFAULT '',
  reviewed_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at    TEXT,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_app_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_app_user   ON applications(user_id);

-- Editable certificate templates (layout / colours / columns / body copy)
CREATE TABLE IF NOT EXISTS templates (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  config      TEXT    NOT NULL,               -- JSON TemplateConfig
  is_default  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Issued certificates. `data` snapshots the values at issue-time so later edits to
-- the application never silently mutate an already-issued certificate.
CREATE TABLE IF NOT EXISTS certificates (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  cert_no        TEXT    NOT NULL UNIQUE,
  application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
  user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  template_id    INTEGER NOT NULL REFERENCES templates(id) ON DELETE RESTRICT,
  data           TEXT    NOT NULL,            -- JSON snapshot of field values
  status         TEXT    NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','revoked')),
  revoke_reason  TEXT    NOT NULL DEFAULT '',
  issued_on      TEXT    NOT NULL DEFAULT (date('now')),
  issued_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  verify_count   INTEGER NOT NULL DEFAULT 0,
  last_verified  TEXT,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cert_no   ON certificates(cert_no);
CREATE INDEX IF NOT EXISTS idx_cert_user ON certificates(user_id);

CREATE TABLE IF NOT EXISTS verification_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  cert_no    TEXT NOT NULL,
  found      INTEGER NOT NULL DEFAULT 0,
  source     TEXT NOT NULL DEFAULT 'web',     -- web | qr | api
  ip         TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL DEFAULT '',
  entity_id  TEXT NOT NULL DEFAULT '',
  detail     TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
