-- LooK Database Schema
-- SQLite compatible (can migrate to PostgreSQL)

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT,
  avatar_url TEXT,
  
  -- OAuth
  google_id TEXT UNIQUE,
  github_id TEXT UNIQUE,
  
  -- Subscription
  stripe_customer_id TEXT UNIQUE,
  plan TEXT DEFAULT 'free' CHECK(plan IN ('free', 'pro', 'team', 'enterprise')),
  plan_status TEXT DEFAULT 'active' CHECK(plan_status IN ('active', 'past_due', 'canceled', 'trialing')),
  plan_period_end DATETIME,
  
  -- API
  api_key TEXT UNIQUE,
  api_key_created_at DATETIME,
  
  -- Usage limits (reset monthly)
  monthly_renders INTEGER DEFAULT 0,
  monthly_api_calls INTEGER DEFAULT 0,
  monthly_storage_mb INTEGER DEFAULT 0,
  usage_reset_date DATETIME,
  
  -- Settings
  openai_api_key_encrypted TEXT,
  groq_api_key_encrypted TEXT,
  default_voice TEXT DEFAULT 'nova',
  default_style TEXT DEFAULT 'professional',
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME,
  email_verified_at DATETIME
);

-- Teams/Organizations
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id),
  
  -- Subscription (team-level)
  stripe_customer_id TEXT UNIQUE,
  plan TEXT DEFAULT 'team' CHECK(plan IN ('team', 'enterprise')),
  plan_status TEXT DEFAULT 'active',
  plan_period_end DATETIME,
  seats_limit INTEGER DEFAULT 5,
  
  -- Settings
  shared_api_keys BOOLEAN DEFAULT FALSE,
  brand_kit_enabled BOOLEAN DEFAULT FALSE,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Team memberships
CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by TEXT REFERENCES users(id),
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(team_id, user_id)
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  url TEXT,
  
  -- Project data
  settings_json TEXT, -- Full settings object
  thumbnail_path TEXT,
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'recording', 'processing', 'completed', 'failed')),
  last_error TEXT,
  
  -- Render stats
  total_renders INTEGER DEFAULT 0,
  last_render_at DATETIME,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Renders (each video generation)
CREATE TABLE IF NOT EXISTS renders (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  
  -- Output
  output_path TEXT,
  output_size_mb REAL,
  duration_seconds REAL,
  resolution TEXT,
  preset TEXT,
  
  -- Costs
  ai_tokens_used INTEGER DEFAULT 0,
  tts_characters INTEGER DEFAULT 0,
  render_time_seconds INTEGER DEFAULT 0,
  estimated_cost_usd REAL DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  progress INTEGER DEFAULT 0,
  
  -- Timestamps
  started_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Usage tracking (hourly aggregates)
CREATE TABLE IF NOT EXISTS usage_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  team_id TEXT REFERENCES teams(id),
  
  -- Action
  action TEXT NOT NULL, -- 'render', 'api_call', 'ai_analysis', 'tts', 'export'
  resource_id TEXT,     -- project_id or render_id
  
  -- Metrics
  tokens_used INTEGER DEFAULT 0,
  characters_used INTEGER DEFAULT 0,
  storage_bytes INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  
  -- Billing
  billable BOOLEAN DEFAULT TRUE,
  cost_usd REAL DEFAULT 0,
  
  -- Context
  ip_address TEXT,
  user_agent TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions (Stripe sync)
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY, -- stripe subscription id
  user_id TEXT REFERENCES users(id),
  team_id TEXT REFERENCES teams(id),
  
  stripe_customer_id TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL,
  
  status TEXT NOT NULL,
  current_period_start DATETIME,
  current_period_end DATETIME,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at DATETIME,
  
  -- Usage-based billing
  usage_limit_renders INTEGER,
  usage_limit_api_calls INTEGER,
  usage_limit_storage_mb INTEGER,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Invoices (Stripe sync)  
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY, -- stripe invoice id
  user_id TEXT REFERENCES users(id),
  team_id TEXT REFERENCES teams(id),
  subscription_id TEXT REFERENCES subscriptions(id),
  
  amount_due INTEGER NOT NULL, -- cents
  amount_paid INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL,
  
  invoice_pdf_url TEXT,
  hosted_invoice_url TEXT,
  
  period_start DATETIME,
  period_end DATETIME,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- API Keys (for programmatic access)
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id TEXT REFERENCES teams(id),
  
  name TEXT NOT NULL,
  key_hash TEXT UNIQUE NOT NULL, -- hashed, never store plain
  key_prefix TEXT NOT NULL,      -- first 8 chars for identification
  
  -- Permissions
  scopes TEXT DEFAULT 'read,write', -- comma-separated
  
  -- Limits
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_day INTEGER DEFAULT 1000,
  
  -- Usage
  last_used_at DATETIME,
  total_requests INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  expires_at DATETIME,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sessions (for web auth)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  token_hash TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS email_verifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  verified_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Feature flags (for gradual rollout)
CREATE TABLE IF NOT EXISTS feature_flags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  
  enabled BOOLEAN DEFAULT FALSE,
  enabled_for_plans TEXT, -- comma-separated: 'pro,team,enterprise'
  enabled_for_users TEXT, -- comma-separated user IDs (for beta)
  
  percentage INTEGER DEFAULT 0, -- 0-100 for gradual rollout
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_team ON projects(team_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

CREATE INDEX IF NOT EXISTS idx_renders_project ON renders(project_id);
CREATE INDEX IF NOT EXISTS idx_renders_user ON renders(user_id);
CREATE INDEX IF NOT EXISTS idx_renders_status ON renders(status);

CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_created ON usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_action ON usage_logs(action);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Plan limits configuration (reference data)
CREATE TABLE IF NOT EXISTS plan_limits (
  plan TEXT PRIMARY KEY,
  
  -- Monthly limits
  renders_per_month INTEGER NOT NULL,
  api_calls_per_month INTEGER NOT NULL,
  storage_mb INTEGER NOT NULL,
  
  -- Feature access
  max_video_duration_seconds INTEGER NOT NULL,
  max_resolution TEXT NOT NULL,
  
  -- Features (JSON for flexibility)
  features_json TEXT NOT NULL,
  
  -- Pricing (for display, actual in Stripe)
  price_monthly_usd INTEGER,
  price_yearly_usd INTEGER
);

-- Insert default plan limits
INSERT OR REPLACE INTO plan_limits (plan, renders_per_month, api_calls_per_month, storage_mb, max_video_duration_seconds, max_resolution, features_json, price_monthly_usd, price_yearly_usd) VALUES
('free', 3, 100, 500, 60, '1080p', '{"voiceover":false,"smartZoom":false,"customCursor":false,"batchExport":false,"multiPage":false,"mobile":false,"apiAccess":false,"priorityRender":false,"brandKit":false,"removeWatermark":false}', 0, 0),
('pro', 50, 5000, 10000, 300, '4k', '{"voiceover":true,"smartZoom":true,"customCursor":true,"batchExport":true,"multiPage":true,"mobile":false,"apiAccess":true,"priorityRender":false,"brandKit":false,"removeWatermark":true}', 2900, 29000),
('team', 200, 20000, 50000, 600, '4k', '{"voiceover":true,"smartZoom":true,"customCursor":true,"batchExport":true,"multiPage":true,"mobile":true,"apiAccess":true,"priorityRender":true,"brandKit":true,"removeWatermark":true}', 9900, 99000),
('enterprise', -1, -1, -1, -1, '4k', '{"voiceover":true,"smartZoom":true,"customCursor":true,"batchExport":true,"multiPage":true,"mobile":true,"apiAccess":true,"priorityRender":true,"brandKit":true,"removeWatermark":true,"sso":true,"audit":true,"sla":true}', NULL, NULL);
