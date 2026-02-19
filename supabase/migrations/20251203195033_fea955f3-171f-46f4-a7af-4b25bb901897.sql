SET search_path TO call_intelligence;

-- Create enum for call status
CREATE TYPE call_intelligence.call_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Create calls table
CREATE TABLE call_intelligence.calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  agent_email TEXT,
  direction TEXT NOT NULL,
  duration_seconds INTEGER,
  telavox_recording_id TEXT,
  status call_intelligence.call_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  webhook_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transcriptions table
CREATE TABLE call_intelligence.transcriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES call_intelligence.calls(id) ON DELETE CASCADE,
  full_text TEXT NOT NULL,
  speaker_labels JSONB,
  elevenlabs_request_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create webhook_logs table for debugging
CREATE TABLE call_intelligence.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  source_ip TEXT,
  processed BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create settings table for API keys and config
CREATE TABLE IF NOT EXISTS call_intelligence.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_calls_webhook_timestamp ON call_intelligence.calls(webhook_timestamp);
CREATE INDEX idx_calls_from_to ON call_intelligence.calls(from_number, to_number);
CREATE INDEX idx_calls_status ON call_intelligence.calls(status);
CREATE INDEX idx_webhook_logs_event_type ON call_intelligence.webhook_logs(event_type);
CREATE INDEX idx_webhook_logs_created_at ON call_intelligence.webhook_logs(created_at);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION call_intelligence.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_calls_updated_at
BEFORE UPDATE ON call_intelligence.calls
FOR EACH ROW
EXECUTE FUNCTION call_intelligence.update_updated_at_column();

DROP TRIGGER IF EXISTS update_settings_updated_at ON call_intelligence.settings;
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON call_intelligence.settings
FOR EACH ROW
EXECUTE FUNCTION call_intelligence.update_updated_at_column();

-- Enable RLS but allow public access (admin password protects frontend)
ALTER TABLE call_intelligence.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_intelligence.transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_intelligence.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_intelligence.settings ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access (edge functions use service role)
DROP POLICY IF EXISTS "Service role full access on calls" ON call_intelligence.calls;
CREATE POLICY "Service role full access on calls" ON call_intelligence.calls FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access on transcriptions" ON call_intelligence.transcriptions;
CREATE POLICY "Service role full access on transcriptions" ON call_intelligence.transcriptions FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access on webhook_logs" ON call_intelligence.webhook_logs;
CREATE POLICY "Service role full access on webhook_logs" ON call_intelligence.webhook_logs FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access on settings" ON call_intelligence.settings;
CREATE POLICY "Service role full access on settings" ON call_intelligence.settings FOR ALL USING (true) WITH CHECK (true);
