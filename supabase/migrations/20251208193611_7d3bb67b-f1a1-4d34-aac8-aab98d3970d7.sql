SET search_path TO call_intelligence;

-- Add HubSpot tracking columns to calls table
ALTER TABLE call_intelligence.calls ADD COLUMN IF NOT EXISTS hubspot_contact_id text;
ALTER TABLE call_intelligence.calls ADD COLUMN IF NOT EXISTS hubspot_call_id text;
ALTER TABLE call_intelligence.calls ADD COLUMN IF NOT EXISTS hubspot_synced_at timestamp with time zone;