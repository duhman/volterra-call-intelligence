SET search_path TO call_intelligence;

-- Add 'skipped' status to the call_status enum
ALTER TYPE call_intelligence.call_status ADD VALUE IF NOT EXISTS 'skipped';