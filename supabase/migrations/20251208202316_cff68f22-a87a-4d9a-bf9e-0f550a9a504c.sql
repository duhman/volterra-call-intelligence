SET search_path TO call_intelligence;

-- Create blocked_numbers table for personal number blocklist
CREATE TABLE call_intelligence.blocked_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  reason TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create unique index on normalized phone number
CREATE UNIQUE INDEX blocked_numbers_phone_idx ON call_intelligence.blocked_numbers (phone_number);

-- Enable RLS
ALTER TABLE call_intelligence.blocked_numbers ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access on blocked_numbers"
ON call_intelligence.blocked_numbers
AS RESTRICTIVE
FOR ALL
USING (true)
WITH CHECK (true);

-- Add transcribe_unknown_numbers setting (default: only transcribe HubSpot contacts)
INSERT INTO call_intelligence.settings (key, value) 
VALUES ('transcribe_unknown_numbers', 'false')
ON CONFLICT (key) DO NOTHING;

-- Add is_hubspot_contact column to calls table for tracking
ALTER TABLE call_intelligence.calls ADD COLUMN IF NOT EXISTS is_hubspot_contact BOOLEAN DEFAULT NULL;

-- Add skip_reason column to track why calls were skipped
ALTER TABLE call_intelligence.calls ADD COLUMN IF NOT EXISTS skip_reason TEXT DEFAULT NULL;