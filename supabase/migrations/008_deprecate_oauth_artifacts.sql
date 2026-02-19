SET search_path TO call_intelligence;

-- 008_deprecate_oauth_artifacts.sql
-- Purpose: Remove deprecated OAuth-related tables and policies now that the app uses a single private access token.
-- Objects removed:
--   * call_intelligence.hubspot_tokens
--   * call_intelligence.oauth_states
--   * RLS policies tied to these tables
-- Safety: Tables are assumed deprecated; data not needed for private app usage.

BEGIN;

-- Drop hubspot_tokens (if exists)
DROP TABLE IF EXISTS call_intelligence.hubspot_tokens CASCADE;

-- Drop oauth_states (if exists)
DROP TABLE IF EXISTS call_intelligence.oauth_states CASCADE;

COMMIT;

-- End migration 008