SET search_path TO call_intelligence;

-- Add performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_calls_status ON call_intelligence.calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_webhook_timestamp ON call_intelligence.calls(webhook_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_calls_agent_email ON call_intelligence.calls(agent_email);
CREATE INDEX IF NOT EXISTS idx_transcriptions_call_id ON call_intelligence.transcriptions(call_id);