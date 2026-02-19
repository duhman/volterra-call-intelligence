-- Migration: 017_readd_slack_consent_system.sql
-- Purpose: Reintroduce Slack-based transcription consent workflow
-- Date: 2026-01-26
SET
  search_path TO call_intelligence;

-- ==========================================
-- 1. Agent-to-Slack User Mapping Table
-- ==========================================
CREATE TABLE IF NOT EXISTS call_intelligence.agent_slack_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_user_id text UNIQUE NOT NULL,
  slack_user_id text NOT NULL,
  slack_display_name text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone ('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone ('utc', now())
);

CREATE INDEX IF NOT EXISTS agent_slack_mappings_agent_user_id_idx ON call_intelligence.agent_slack_mappings (agent_user_id);

CREATE INDEX IF NOT EXISTS agent_slack_mappings_slack_user_id_idx ON call_intelligence.agent_slack_mappings (slack_user_id);

ALTER TABLE call_intelligence.agent_slack_mappings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'call_intelligence'
      AND tablename = 'agent_slack_mappings'
      AND policyname = 'Service role only on agent_slack_mappings'
  ) THEN
    CREATE POLICY "Service role only on agent_slack_mappings"
      ON call_intelligence.agent_slack_mappings FOR ALL TO authenticated, anon
      USING (auth.role () = 'service_role')
      WITH CHECK (auth.role () = 'service_role');
  END IF;
END $$;

-- ==========================================
-- 2. Transcription Consent Requests Table
-- ==========================================
CREATE TABLE IF NOT EXISTS call_intelligence.transcription_consent_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telavox_call_id text NOT NULL,
  agent_user_id text NOT NULL,
  slack_user_id text NOT NULL,
  slack_channel_id text,
  slack_message_ts text,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN (
      'pending',
      'approved',
      'declined',
      'expired',
      'auto_approved'
    )
  ),
  sent_at timestamptz,
  reminder_sent_at timestamptz,
  responded_at timestamptz,
  expires_at timestamptz NOT NULL,
  response_source text,
  response_metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone ('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone ('utc', now())
);

CREATE INDEX IF NOT EXISTS consent_requests_call_id_idx ON call_intelligence.transcription_consent_requests (telavox_call_id);

CREATE INDEX IF NOT EXISTS consent_requests_status_idx ON call_intelligence.transcription_consent_requests (status);

CREATE INDEX IF NOT EXISTS consent_requests_expires_at_idx ON call_intelligence.transcription_consent_requests (expires_at)
WHERE
  status = 'pending';

CREATE INDEX IF NOT EXISTS consent_requests_slack_message_idx ON call_intelligence.transcription_consent_requests (slack_channel_id, slack_message_ts);

ALTER TABLE call_intelligence.transcription_consent_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'call_intelligence'
      AND tablename = 'transcription_consent_requests'
      AND policyname = 'Service role only on transcription_consent_requests'
  ) THEN
    CREATE POLICY "Service role only on transcription_consent_requests"
      ON call_intelligence.transcription_consent_requests FOR ALL TO authenticated, anon
      USING (auth.role () = 'service_role')
      WITH CHECK (auth.role () = 'service_role');
  END IF;
END $$;

-- ==========================================
-- 3. Consent Status on Call Sessions
-- ==========================================
ALTER TABLE call_intelligence.telavox_call_sessions
ADD COLUMN IF NOT EXISTS consent_status text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'telavox_call_sessions_consent_status_check'
  ) THEN
    ALTER TABLE call_intelligence.telavox_call_sessions
      ADD CONSTRAINT telavox_call_sessions_consent_status_check
      CHECK (consent_status IN ('pending','approved','declined','expired','not_required'));
  END IF;
END $$;

ALTER TABLE call_intelligence.telavox_call_sessions
ALTER COLUMN consent_status
SET DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS telavox_call_sessions_consent_status_idx ON call_intelligence.telavox_call_sessions (consent_status);

-- ==========================================
-- 4. Update Job Queue for Consent Job Types
-- ==========================================
ALTER TABLE call_intelligence.telavox_job_queue
DROP CONSTRAINT IF EXISTS telavox_job_queue_job_type_check;

ALTER TABLE call_intelligence.telavox_job_queue
ADD CONSTRAINT telavox_job_queue_job_type_check CHECK (
  job_type IN (
    'recording.lookup',
    'stt.request',
    'hubspot.sync',
    'consent.request',
    'consent.reminder',
    'consent.expire'
  )
);

-- ==========================================
-- 5. Settings Keys for Consent + Slack
-- ==========================================
CREATE TABLE IF NOT EXISTS call_intelligence.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE call_intelligence.settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'call_intelligence'
      AND tablename = 'settings'
      AND policyname = 'Service role full access on settings'
  ) THEN
    CREATE POLICY "Service role full access on settings"
      ON call_intelligence.settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION call_intelligence.update_updated_at_column () RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_settings_updated_at ON call_intelligence.settings;

CREATE TRIGGER update_settings_updated_at BEFORE
UPDATE ON call_intelligence.settings FOR EACH ROW
EXECUTE FUNCTION call_intelligence.update_updated_at_column ();

INSERT INTO
  call_intelligence.settings (key, value)
VALUES
  ('consent_enabled', 'true'),
  ('consent_timeout_hours', '24'),
  ('consent_reminder_hours', '2'),
  ('consent_auto_approve_known_contacts', 'false'),
  ('slack_bot_token', ''),
  ('slack_signing_secret', '')
ON CONFLICT (key) DO NOTHING;

-- ==========================================
-- 6. Updated_at Triggers for Consent Tables
-- ==========================================
DROP TRIGGER IF EXISTS update_agent_slack_mappings_updated_at ON call_intelligence.agent_slack_mappings;

CREATE TRIGGER update_agent_slack_mappings_updated_at BEFORE
UPDATE ON call_intelligence.agent_slack_mappings FOR EACH ROW
EXECUTE FUNCTION call_intelligence.update_updated_at_column ();

DROP TRIGGER IF EXISTS update_transcription_consent_requests_updated_at ON call_intelligence.transcription_consent_requests;

CREATE TRIGGER update_transcription_consent_requests_updated_at BEFORE
UPDATE ON call_intelligence.transcription_consent_requests FOR EACH ROW
EXECUTE FUNCTION call_intelligence.update_updated_at_column ();
