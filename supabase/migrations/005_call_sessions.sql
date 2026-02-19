SET search_path TO call_intelligence;

-- Create call_sessions table for tracking call sessions
-- Links HubSpot context to ElevenLabs conversations

create table if not exists call_intelligence.call_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id text unique not null,
  hubspot_contact_id text,
  hubspot_deal_id text,
  conversation_id text,
  status text default 'initiated'::text check (status in ('initiated', 'active', 'completed')),
  initiated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for better performance
create index if not exists call_sessions_session_id_idx on call_intelligence.call_sessions(session_id);
create index if not exists call_sessions_contact_id_idx on call_intelligence.call_sessions(hubspot_contact_id);
create index if not exists call_sessions_deal_id_idx on call_intelligence.call_sessions(hubspot_deal_id);
create index if not exists call_sessions_conversation_id_idx on call_intelligence.call_sessions(conversation_id);
create index if not exists call_sessions_status_idx on call_intelligence.call_sessions(status);

-- Enable RLS
alter table call_intelligence.call_sessions enable row level security;

-- RLS Policies for call_sessions table
-- Users can view their own call sessions (via conversations)
create policy "Users can view call sessions for their conversations" on call_intelligence.call_sessions
  for select using (
    conversation_id in (
      select conversation_id from call_intelligence.conversations where user_id = auth.uid()
    )
  );

create policy "Users can insert their own call sessions" on call_intelligence.call_sessions
  for insert with check (true); -- Allow insertion, will be linked via conversation later

create policy "Users can update call sessions for their conversations" on call_intelligence.call_sessions
  for update using (
    conversation_id in (
      select conversation_id from call_intelligence.conversations where user_id = auth.uid()
    )
  );

