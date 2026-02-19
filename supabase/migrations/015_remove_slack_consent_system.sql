-- Migration: 015_remove_slack_consent_system.sql
-- Purpose: Remove Slack-based transcription consent workflow
-- Date: 2026-01-12
-- Rollback of migration 014_slack_consent_system.sql

SET search_path TO call_intelligence;

-- ==========================================
-- 1. Drop Consent Request Tables
-- ==========================================

DROP TABLE IF EXISTS call_intelligence.transcription_consent_requests;
DROP TABLE IF EXISTS call_intelligence.agent_slack_mappings;

-- ==========================================
-- 2. Remove Consent Status Column
-- ==========================================

ALTER TABLE call_intelligence.telavox_call_sessions 
DROP COLUMN IF EXISTS consent_status;

-- ==========================================
-- 3. Restore Job Queue Constraint
-- ==========================================

-- Drop existing constraint
ALTER TABLE call_intelligence.telavox_job_queue 
DROP CONSTRAINT IF EXISTS telavox_job_queue_job_type_check;

-- Restore original constraint (only recording.lookup, stt.request, hubspot.sync)
ALTER TABLE call_intelligence.telavox_job_queue 
ADD CONSTRAINT telavox_job_queue_job_type_check 
CHECK (job_type IN ('recording.lookup', 'stt.request', 'hubspot.sync'));

-- ==========================================
-- 4. Remove Slack-Related Settings
-- ==========================================

DELETE FROM call_intelligence.settings 
WHERE key IN (
  'consent_enabled',
  'consent_timeout_hours',
  'consent_reminder_hours',
  'consent_auto_approve_known_contacts',
  'slack_bot_token',
  'slack_signing_secret'
);

-- ==========================================
-- Notes
-- ==========================================
-- This migration removes all Slack consent workflow infrastructure.
-- After running this migration, the system will automatically transcribe
-- all calls without requiring Slack approval.
-- 
-- Any pending consent jobs in telavox_job_queue will fail gracefully
-- as the job types are no longer valid.
