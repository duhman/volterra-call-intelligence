SET search_path TO call_intelligence;

-- Telavox call sessions: track Telavox calls, recordings, transcripts, and HubSpot sync state

create table if not exists call_intelligence.telavox_call_sessions (
  id uuid primary key default gen_random_uuid(),
  telavox_call_id text unique not null,
  telavox_org_id text not null,
  hubspot_portal_id text,
  direction text check (direction in ('INBOUND','OUTBOUND')),
  from_number text,
  to_number text,
  agent_user_id text,
  hubspot_contact_id text,
  hubspot_deal_id text,
  started_at timestamptz,
  answered_at timestamptz,
  ended_at timestamptz,
  recording_url text,
  recording_status text not null default 'pending' check (recording_status in ('pending','available','failed')),
  transcription_status text not null default 'pending' check (transcription_status in ('pending','in_progress','completed','failed')),
  elevenlabs_job_id text,
  transcript text,
  summary text,
  sentiment text,
  insights_json jsonb,
  hubspot_engagement_id text,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists telavox_call_sessions_call_id_idx on call_intelligence.telavox_call_sessions(telavox_call_id);
create index if not exists telavox_call_sessions_org_id_idx on call_intelligence.telavox_call_sessions(telavox_org_id);
create index if not exists telavox_call_sessions_portal_id_idx on call_intelligence.telavox_call_sessions(hubspot_portal_id);
create index if not exists telavox_call_sessions_contact_id_idx on call_intelligence.telavox_call_sessions(hubspot_contact_id);
create index if not exists telavox_call_sessions_deal_id_idx on call_intelligence.telavox_call_sessions(hubspot_deal_id);
create index if not exists telavox_call_sessions_transcription_status_idx on call_intelligence.telavox_call_sessions(transcription_status);
create index if not exists telavox_call_sessions_created_at_idx on call_intelligence.telavox_call_sessions(created_at);
create index if not exists telavox_call_sessions_ended_at_idx on call_intelligence.telavox_call_sessions(ended_at);

alter table call_intelligence.telavox_call_sessions enable row level security;

-- Backend-only access: allow service role; block anon/user roles.
-- Adjust to match your existing RLS pattern for privileged tables.

create policy "Service role can manage telavox_call_sessions"
on call_intelligence.telavox_call_sessions
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
