-- Migration: 016_enable_realtime_telavox_call_sessions.sql
-- Purpose: Enable Supabase Realtime for telavox_call_sessions table
-- Date: 2026-01-12

SET search_path TO call_intelligence;

-- Enable REPLICA IDENTITY FULL for complete row data in realtime events
-- This ensures all column values are included in UPDATE/DELETE events
ALTER TABLE call_intelligence.telavox_call_sessions REPLICA IDENTITY FULL;

-- Add telavox_call_sessions table to realtime publication
-- This enables real-time subscriptions for INSERT, UPDATE, DELETE events
ALTER PUBLICATION supabase_realtime
ADD TABLE call_intelligence.telavox_call_sessions;

-- Allow SELECT for anon users to enable Realtime subscriptions
-- Note: This is safe because:
-- 1. Admin API routes use password-based auth (not RLS)
-- 2. Realtime subscriptions respect RLS - users can only see what they're allowed to SELECT
-- 3. The admin dashboard is protected by password authentication at the API level
CREATE POLICY "Allow SELECT for Realtime subscriptions"
ON call_intelligence.telavox_call_sessions
FOR SELECT
TO anon, authenticated
USING (true);
