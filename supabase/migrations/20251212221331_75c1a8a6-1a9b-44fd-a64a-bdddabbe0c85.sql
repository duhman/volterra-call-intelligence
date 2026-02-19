SET search_path TO call_intelligence;

-- Fix RLS policies to restrict database access to service_role only
-- This prevents direct database access with the anon key while allowing edge functions to work

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Service role full access on blocked_numbers" ON call_intelligence.blocked_numbers;
DROP POLICY IF EXISTS "Service role full access on calls" ON call_intelligence.calls;
DROP POLICY IF EXISTS "Service role full access on settings" ON call_intelligence.settings;
DROP POLICY IF EXISTS "Service role full access on telavox_api_keys" ON call_intelligence.telavox_api_keys;
DROP POLICY IF EXISTS "Service role full access on transcriptions" ON call_intelligence.transcriptions;
DROP POLICY IF EXISTS "Service role full access on webhook_logs" ON call_intelligence.webhook_logs;

-- Create new policies that only allow service_role access
-- Using auth.role() = 'service_role' ensures only service role key can access data

CREATE POLICY "Service role only on blocked_numbers"
ON call_intelligence.blocked_numbers
FOR ALL
TO authenticated, anon
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role only on calls"
ON call_intelligence.calls
FOR ALL
TO authenticated, anon
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role only on settings"
ON call_intelligence.settings
FOR ALL
TO authenticated, anon
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role only on telavox_api_keys"
ON call_intelligence.telavox_api_keys
FOR ALL
TO authenticated, anon
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role only on transcriptions"
ON call_intelligence.transcriptions
FOR ALL
TO authenticated, anon
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role only on webhook_logs"
ON call_intelligence.webhook_logs
FOR ALL
TO authenticated, anon
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');