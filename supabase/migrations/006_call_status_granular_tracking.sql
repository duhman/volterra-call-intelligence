SET search_path TO call_intelligence;

-- Migration: Extend call_sessions with granular status tracking
-- Created: 2025-11-10
-- Purpose: Add detailed status transitions for live call polling

-- Add new status values to call_sessions
ALTER TABLE call_sessions
DROP CONSTRAINT IF EXISTS call_sessions_status_check;

ALTER TABLE call_sessions
ALTER COLUMN status TYPE TEXT;

ALTER TABLE call_sessions
ADD CONSTRAINT call_sessions_status_check
CHECK (status IN ('queued', 'connecting', 'active', 'wrap_up', 'analyzing', 'complete', 'failed'));

-- Update existing records to map old statuses to new ones
UPDATE call_sessions
SET status = CASE
  WHEN status = 'initiated' THEN 'queued'
  WHEN status = 'active' THEN 'active'
  WHEN status = 'completed' THEN 'complete'
  ELSE status
END
WHERE status IN ('initiated', 'completed');

-- Ensure initiated_at exists (should already exist from 005_call_sessions.sql)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'call_sessions' AND column_name = 'initiated_at'
  ) THEN
    ALTER TABLE call_sessions 
    ADD COLUMN initiated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;
  END IF;
END $$;

-- Ensure completed_at exists (should already exist from 005_call_sessions.sql)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'call_sessions' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE call_sessions 
    ADD COLUMN completed_at timestamp with time zone;
  END IF;
END $$;

-- Add index for efficient status queries
CREATE INDEX IF NOT EXISTS idx_call_sessions_status ON call_sessions(status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_session_id ON call_sessions(session_id);

-- Add updated_at trigger for automatic timestamp management
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_call_sessions_updated_at ON call_sessions;

CREATE TRIGGER update_call_sessions_updated_at
BEFORE UPDATE ON call_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON COLUMN call_sessions.status IS 'Call lifecycle status: queued (initiated) → connecting → active (in progress) → wrap_up (ending) → analyzing (AI processing) → complete (finished) | failed (error)';
