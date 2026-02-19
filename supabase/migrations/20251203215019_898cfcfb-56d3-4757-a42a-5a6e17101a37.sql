SET search_path TO call_intelligence;

-- Enable REPLICA IDENTITY FULL for complete row data in realtime events
ALTER TABLE call_intelligence.calls REPLICA IDENTITY FULL;

-- Add calls table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE call_intelligence.calls;