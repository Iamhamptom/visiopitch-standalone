-- VisioPitch Database Schema
-- Run this against your Supabase project SQL editor

-- Users
CREATE TABLE IF NOT EXISTS vp_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pitches
CREATE TABLE IF NOT EXISTS vp_pitches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES vp_users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'Untitled Pitch',
  description TEXT,
  industry TEXT DEFAULT 'general',
  status TEXT DEFAULT 'draft',
  client_name TEXT,
  client_company TEXT,
  accent_color TEXT DEFAULT '#6366F1',
  blocks JSONB DEFAULT '[]'::jsonb,
  html_content TEXT,
  style_seed TEXT,
  thumbnail_url TEXT,
  brand_config JSONB DEFAULT '{}'::jsonb,
  facts JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pitches_user_updated ON vp_pitches(user_id, updated_at DESC);

-- Conversations
CREATE TABLE IF NOT EXISTS vp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id UUID REFERENCES vp_pitches(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_conv_pitch ON vp_conversations(pitch_id);
