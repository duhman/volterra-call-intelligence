SET search_path TO call_intelligence;

-- Create table to store Telavox API keys per agent
CREATE TABLE call_intelligence.telavox_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_email TEXT UNIQUE NOT NULL,
  api_key TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS with service-role-only access
ALTER TABLE call_intelligence.telavox_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on telavox_api_keys" 
  ON call_intelligence.telavox_api_keys 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_telavox_api_keys_updated_at
  BEFORE UPDATE ON call_intelligence.telavox_api_keys
  FOR EACH ROW EXECUTE FUNCTION call_intelligence.update_updated_at_column();