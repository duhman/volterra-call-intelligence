-- Create call_intelligence schema
-- This migration must run first (000_ prefix) to ensure schema exists before any tables are created
CREATE SCHEMA IF NOT EXISTS call_intelligence;

-- Grant schema permissions
GRANT ALL ON SCHEMA call_intelligence TO postgres;
GRANT ALL ON SCHEMA call_intelligence TO authenticated;
GRANT ALL ON SCHEMA call_intelligence TO service_role;
GRANT USAGE ON SCHEMA call_intelligence TO anon;

-- Set default privileges for future objects
-- These ensure that any tables, sequences, or functions created in the schema
-- automatically get the correct permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA call_intelligence GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA call_intelligence GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA call_intelligence GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA call_intelligence GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA call_intelligence GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA call_intelligence GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA call_intelligence GRANT ALL ON FUNCTIONS TO service_role;

-- Create storage bucket for call recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('call_intelligence_call_recordings', 'call_intelligence_call_recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for call recordings
-- Users can upload their own recordings
CREATE POLICY "Users can upload recordings" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'call_intelligence_call_recordings'
    AND auth.role() = 'authenticated'
);

-- Users can read recordings
CREATE POLICY "Users can read recordings" ON storage.objects
FOR SELECT USING (
    bucket_id = 'call_intelligence_call_recordings'
    AND auth.role() = 'authenticated'
);

-- Users can delete their recordings
CREATE POLICY "Users can delete recordings" ON storage.objects
FOR DELETE USING (
    bucket_id = 'call_intelligence_call_recordings'
    AND auth.role() = 'authenticated'
);

-- Service role has full access for edge functions
CREATE POLICY "Service role full access on recordings" ON storage.objects
FOR ALL USING (
    bucket_id = 'call_intelligence_call_recordings'
    AND auth.role() = 'service_role'
);
