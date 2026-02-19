SET search_path TO call_intelligence;

-- Add HubSpot ID tracking columns to conversations table
ALTER TABLE call_intelligence.conversations
ADD COLUMN IF NOT EXISTS hubspot_contact_id text,
ADD COLUMN IF NOT EXISTS hubspot_deal_id text;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS conversations_hubspot_contact_id_idx ON call_intelligence.conversations(hubspot_contact_id);
CREATE INDEX IF NOT EXISTS conversations_hubspot_deal_id_idx ON call_intelligence.conversations(hubspot_deal_id);

-- Create conversation_hubspot_associations table for many-to-many relationships
CREATE TABLE IF NOT EXISTS call_intelligence.conversation_hubspot_associations (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null,
  hubspot_object_type text not null,
  hubspot_object_id text not null,
  association_type text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  foreign key (conversation_id) references call_intelligence.conversations(conversation_id) on delete cascade
);

-- Create indexes for associations table
CREATE INDEX IF NOT EXISTS conv_hubspot_assoc_conversation_id_idx ON call_intelligence.conversation_hubspot_associations(conversation_id);
CREATE INDEX IF NOT EXISTS conv_hubspot_assoc_object_id_idx ON call_intelligence.conversation_hubspot_associations(hubspot_object_id);
CREATE INDEX IF NOT EXISTS conv_hubspot_assoc_object_type_idx ON call_intelligence.conversation_hubspot_associations(hubspot_object_type);

-- Add RLS policy for associations table
ALTER TABLE call_intelligence.conversation_hubspot_associations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view associations for their conversations" ON call_intelligence.conversation_hubspot_associations
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM call_intelligence.conversations WHERE user_id = auth.uid()
    )
  );

-- Add comments for documentation
COMMENT ON COLUMN call_intelligence.conversations.hubspot_contact_id IS 'HubSpot contact ID associated with this conversation';
COMMENT ON COLUMN call_intelligence.conversations.hubspot_deal_id IS 'HubSpot deal ID associated with this conversation';
COMMENT ON TABLE call_intelligence.conversation_hubspot_associations IS 'Tracks associations between conversations and HubSpot objects';

