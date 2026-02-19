SET search_path TO call_intelligence;

-- 009_retention_and_cleanup_jobs.sql
-- Purpose: Implement automated cleanup jobs for old data using pg_cron and supporting functions.
-- Requirements: pg_cron extension (Supabase standard). Adjust retention periods as needed.
-- Retention policy:
--   * call_sessions: remove rows where status IN ('complete','failed') AND completed_at < now() - interval '30 days'
--   * sync_history: remove rows older than 90 days
--   * conversations & insights: optional soft retention (keep indefinitely for analytics) - not deleted here
--   * expired OAuth states already removed in 008

BEGIN;

-- Ensure pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function: cleanup_call_sessions
CREATE OR REPLACE FUNCTION call_intelligence.cleanup_call_sessions()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM call_intelligence.call_sessions
  WHERE status IN ('complete','failed')
    AND completed_at IS NOT NULL
    AND completed_at < now() - interval '30 days';
END;$$;

-- Function: cleanup_sync_history
CREATE OR REPLACE FUNCTION call_intelligence.cleanup_sync_history()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM call_intelligence.sync_history
  WHERE created_at < now() - interval '90 days';
END;$$;

-- Attempt to schedule jobs only if they do not already exist.
DO $$
DECLARE
  call_job_exists BOOLEAN;
  sync_job_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM cron.job WHERE jobname = 'daily_cleanup_call_sessions'
  ) INTO call_job_exists;
  IF NOT call_job_exists THEN
    PERFORM cron.schedule('daily_cleanup_call_sessions', '15 2 * * *', 'SELECT call_intelligence.cleanup_call_sessions();');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM cron.job WHERE jobname = 'daily_cleanup_sync_history'
  ) INTO sync_job_exists;
  IF NOT sync_job_exists THEN
    PERFORM cron.schedule('daily_cleanup_sync_history', '20 2 * * *', 'SELECT call_intelligence.cleanup_sync_history();');
  END IF;
END$$;

COMMIT;

-- End migration 009