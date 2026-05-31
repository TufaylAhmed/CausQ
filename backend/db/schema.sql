-- ============================================================================
-- CausQ — SQLite schema
-- Applied automatically on server start (see src/db.rs). Idempotent.
-- ============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------- leads
-- Inbound briefing / contact requests from contact.html
CREATE TABLE IF NOT EXISTS leads (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    email       TEXT    NOT NULL,
    company     TEXT,
    region      TEXT,
    interest    TEXT,
    message     TEXT,
    source      TEXT    DEFAULT 'contact',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);

-- ---------------------------------------------------------------- subscribers
-- "The Brief" newsletter signups from what-we-think.html
CREATE TABLE IF NOT EXISTS subscribers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT,
    email       TEXT    NOT NULL UNIQUE,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------- applications
-- Job applications from careers.html
CREATE TABLE IF NOT EXISTS applications (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    email       TEXT    NOT NULL,
    role        TEXT,
    region      TEXT,
    link        TEXT,
    message     TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_apps_created ON applications(created_at);

-- ---------------------------------------------------------------- roles
-- Open positions rendered on careers.html (GET /api/roles)
CREATE TABLE IF NOT EXISTS roles (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    team        TEXT    NOT NULL,
    location    TEXT    NOT NULL,
    is_open     INTEGER NOT NULL DEFAULT 1,
    sort        INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------- insights
-- Thought-leadership entries rendered on what-we-think.html (GET /api/insights)
CREATE TABLE IF NOT EXISTS insights (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    slug        TEXT    NOT NULL UNIQUE,
    title       TEXT    NOT NULL,
    excerpt     TEXT,
    category    TEXT,
    read_min    INTEGER DEFAULT 5,
    image       TEXT,
    published   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------- seed data
INSERT OR IGNORE INTO roles (id, title, team, location, sort) VALUES
  (1, 'Principal AI Engineer',              'AI & Intelligent Ops',  'US · Remote',   10),
  (2, 'Network Architect — AI Fabric',      'Network Modernization', 'EMEA · Hybrid', 20),
  (3, 'Post-Quantum Security Consultant',   'Quantum-era Security',  'US · Remote',   30),
  (4, 'Cloud & Edge Platform Engineer',     'Cloud & Edge',          'EMEA · Remote', 40),
  (5, 'Engagement Lead — Enterprise',       'Delivery',              'US · Hybrid',   50);

INSERT OR IGNORE INTO insights (id, slug, title, excerpt, category, read_min, image) VALUES
  (1, 'harvest-now-decrypt-later',
      'Harvest now, decrypt later: the breach you won''t see for a decade',
      'A pragmatic plan to become crypto-agile before the quantum deadline finds you.',
      'Quantum', 10, 'assets/img/think-feature.jpg'),
  (2, 'network-ai-workload',
      'The network is becoming AI''s most demanding customer',
      'What GPU-scale traffic patterns mean for the fabric beneath them.',
      'AI', 6, 'assets/img/think-1.jpg'),
  (3, 'zero-trust-operating-model',
      'Zero Trust isn''t a product. It''s a way of running the network',
      'How to operationalize identity-first security without halting the business.',
      'Security', 7, 'assets/img/think-2.jpg');
