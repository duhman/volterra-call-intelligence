SET search_path TO call_intelligence;

-- Add summary column to transcriptions table for AI-generated summaries
ALTER TABLE call_intelligence.transcriptions ADD COLUMN IF NOT EXISTS summary TEXT;