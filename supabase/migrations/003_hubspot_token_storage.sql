SET search_path TO call_intelligence;

-- Create hubspot_tokens table for secure token storage
CREATE TABLE IF NOT EXISTS call_intelligence.hubspot_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES call_intelligence.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS hubspot_tokens_user_id_idx ON call_intelligence.hubspot_tokens(user_id);
CREATE INDEX IF NOT EXISTS hubspot_tokens_expires_at_idx ON call_intelligence.hubspot_tokens(expires_at);

-- Enable RLS for hubspot_tokens table
ALTER TABLE call_intelligence.hubspot_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own tokens
CREATE POLICY "Users can view their own HubSpot tokens" ON call_intelligence.hubspot_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Users can update their own tokens
CREATE POLICY "Users can update their own HubSpot tokens" ON call_intelligence.hubspot_tokens
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own tokens
CREATE POLICY "Users can insert their own HubSpot tokens" ON call_intelligence.hubspot_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own tokens
CREATE POLICY "Users can delete their own HubSpot tokens" ON call_intelligence.hubspot_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE call_intelligence.hubspot_tokens IS 'Stores HubSpot OAuth tokens securely for each user';
COMMENT ON COLUMN call_intelligence.hubspot_tokens.access_token IS 'HubSpot OAuth access token';
COMMENT ON COLUMN call_intelligence.hubspot_tokens.refresh_token IS 'HubSpot OAuth refresh token';
COMMENT ON COLUMN call_intelligence.hubspot_tokens.expires_at IS 'When the access token expires (UTC)';

