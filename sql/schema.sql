-- Sport Club Points - Vercel Postgres schema
-- Run once: in Vercel Postgres SQL tab, or call POST /api/init

CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT
);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  branch_id TEXT NOT NULL REFERENCES branches(id),
  email TEXT,
  password_hash TEXT,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'standard'
);

CREATE TABLE IF NOT EXISTS point_entries (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  points INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id),
  member_id TEXT NOT NULL REFERENCES members(id),
  answer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id),
  challenger_member_id TEXT NOT NULL REFERENCES members(id),
  opponent_member_id TEXT NOT NULL REFERENCES members(id),
  points_wagered INTEGER NOT NULL,
  status TEXT NOT NULL,
  winner_member_id TEXT REFERENCES members(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_role TEXT NOT NULL,
  user_email TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default branches (ignore if any exist)
INSERT INTO branches (id, name) VALUES
  ('1', 'Branch Johor'),
  ('2', 'Branch Kuala Lumpur'),
  ('3', 'Branch Kuantan')
ON CONFLICT (id) DO NOTHING;
