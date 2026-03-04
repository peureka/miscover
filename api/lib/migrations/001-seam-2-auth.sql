-- Seam 2: Users, magic links, saved decodes

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS magic_links (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  decode_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_decodes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  input_1 TEXT NOT NULL,
  input_2 TEXT NOT NULL,
  input_3 TEXT NOT NULL,
  decode_text TEXT NOT NULL,
  world_items TEXT[] NOT NULL,
  brief_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_decodes_user_id ON saved_decodes(user_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
