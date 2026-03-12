-- Version History
CREATE TABLE IF NOT EXISTS vp_pitch_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id UUID REFERENCES vp_pitches(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  html_content TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_versions_pitch ON vp_pitch_versions(pitch_id, version_number DESC);

-- Share Links
CREATE TABLE IF NOT EXISTS vp_pitch_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id UUID REFERENCES vp_pitches(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  password TEXT,
  expires_at TIMESTAMPTZ,
  allow_download BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shares_token ON vp_pitch_shares(token);

-- View Analytics
CREATE TABLE IF NOT EXISTS vp_pitch_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id UUID REFERENCES vp_pitches(id) ON DELETE CASCADE,
  share_id UUID REFERENCES vp_pitch_shares(id),
  viewer_ip TEXT,
  viewer_ua TEXT,
  duration_seconds INT DEFAULT 0,
  scroll_depth FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_views_pitch ON vp_pitch_views(pitch_id, created_at DESC);

-- Uploaded Assets
CREATE TABLE IF NOT EXISTS vp_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id UUID REFERENCES vp_pitches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES vp_users(id),
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  file_type TEXT,
  file_size INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_assets_pitch ON vp_assets(pitch_id);
