SET search_path TO call_intelligence;

-- Create oauth_states table for secure OAuth state management
-- Stores temporary state values used during OAuth authorization flow
-- States automatically expire after 10 minutes for security

CREATE TABLE oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '10 minutes'
);

-- Index for fast state lookups
CREATE INDEX idx_oauth_states_state ON oauth_states(state);

-- Index for cleanup queries (find expired states)
CREATE INDEX idx_oauth_states_expires_at ON oauth_states(expires_at);

-- Enable RLS (Row Level Security)
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

-- Allow all operations on oauth_states (state is temporary, not sensitive)
-- Anyone can read/write/delete since it's just temporary OAuth state
CREATE POLICY "allow_all_operations" ON oauth_states
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to clean up expired OAuth states
-- Can be called manually or via a cron job
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_states
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

