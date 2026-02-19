SET search_path TO call_intelligence;

-- Fix function search path security issue
CREATE OR REPLACE FUNCTION call_intelligence.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;