SET search_path TO call_intelligence;

-- 007_rls_policy_optimizations.sql
-- Purpose: Optimize RLS policies to avoid per-row re-evaluation of auth.uid()
--          and lock function search_path for security.
-- Changes:
--   * ALTER FUNCTION cleanup_expired_oauth_states search_path
--   * Recreate all auth.uid() dependent policies using (SELECT auth.uid()) pattern
--   * Preserve original semantics
--   * Do NOT modify insertion policy on call_sessions (remains permissive)

BEGIN;

-- Secure function search_path
ALTER FUNCTION call_intelligence.cleanup_expired_oauth_states() SET search_path = public;

-- Users table policies
DROP POLICY IF EXISTS "Users can only view their own data" ON call_intelligence.users;
CREATE POLICY "Users can only view their own data" ON call_intelligence.users
  FOR SELECT USING ((SELECT auth.uid()) = id);

-- Conversations table policies
DROP POLICY IF EXISTS "Users can only view their own conversations" ON call_intelligence.conversations;
CREATE POLICY "Users can only view their own conversations" ON call_intelligence.conversations
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own conversations" ON call_intelligence.conversations;
CREATE POLICY "Users can insert their own conversations" ON call_intelligence.conversations
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- Insights table policies
DROP POLICY IF EXISTS "Users can view insights for their conversations" ON call_intelligence.insights;
CREATE POLICY "Users can view insights for their conversations" ON call_intelligence.insights
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM call_intelligence.conversations WHERE user_id = (SELECT auth.uid())
    )
  );

-- Sync Queue table policies
DROP POLICY IF EXISTS "Users can view sync queue for their conversations" ON call_intelligence.sync_queue;
CREATE POLICY "Users can view sync queue for their conversations" ON call_intelligence.sync_queue
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM call_intelligence.conversations WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage sync queue for their conversations" ON call_intelligence.sync_queue;
CREATE POLICY "Users can manage sync queue for their conversations" ON call_intelligence.sync_queue
  FOR UPDATE USING (
    conversation_id IN (
      SELECT conversation_id FROM call_intelligence.conversations WHERE user_id = (SELECT auth.uid())
    )
  );

-- Sync History table policies
DROP POLICY IF EXISTS "Users can view sync history for their conversations" ON call_intelligence.sync_history;
CREATE POLICY "Users can view sync history for their conversations" ON call_intelligence.sync_history
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM call_intelligence.conversations WHERE user_id = (SELECT auth.uid())
    )
  );

-- HubSpot Tokens table policies
DROP POLICY IF EXISTS "Users can view their own HubSpot tokens" ON call_intelligence.hubspot_tokens;
CREATE POLICY "Users can view their own HubSpot tokens" ON call_intelligence.hubspot_tokens
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own HubSpot tokens" ON call_intelligence.hubspot_tokens;
CREATE POLICY "Users can update their own HubSpot tokens" ON call_intelligence.hubspot_tokens
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own HubSpot tokens" ON call_intelligence.hubspot_tokens;
CREATE POLICY "Users can insert their own HubSpot tokens" ON call_intelligence.hubspot_tokens
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own HubSpot tokens" ON call_intelligence.hubspot_tokens;
CREATE POLICY "Users can delete their own HubSpot tokens" ON call_intelligence.hubspot_tokens
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- Call Sessions table policies (insertion policy unchanged)
DROP POLICY IF EXISTS "Users can view call sessions for their conversations" ON call_intelligence.call_sessions;
CREATE POLICY "Users can view call sessions for their conversations" ON call_intelligence.call_sessions
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM call_intelligence.conversations WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update call sessions for their conversations" ON call_intelligence.call_sessions;
CREATE POLICY "Users can update call sessions for their conversations" ON call_intelligence.call_sessions
  FOR UPDATE USING (
    conversation_id IN (
      SELECT conversation_id FROM call_intelligence.conversations WHERE user_id = (SELECT auth.uid())
    )
  );

-- Conversation HubSpot Associations table policies
DROP POLICY IF EXISTS "Users can view associations for their conversations" ON call_intelligence.conversation_hubspot_associations;
CREATE POLICY "Users can view associations for their conversations" ON call_intelligence.conversation_hubspot_associations
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM call_intelligence.conversations WHERE user_id = (SELECT auth.uid())
    )
  );

COMMIT;

-- End of migration 007