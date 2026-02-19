SET search_path TO call_intelligence;

-- Telavox job queue: durable background jobs for recording lookup, transcription, and HubSpot sync

create table if not exists call_intelligence.telavox_job_queue (
  id uuid primary key default gen_random_uuid(),
  job_type text not null check (job_type in ('recording.lookup', 'stt.request', 'hubspot.sync')),
  telavox_call_id text not null,
  telavox_org_id text not null,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'failed')),
  attempts int not null default 0,
  max_attempts int not null default 3,
  error_message text,
  job_data jsonb,
  scheduled_at timestamptz not null default timezone('utc', now()),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists telavox_job_queue_type_status_idx on call_intelligence.telavox_job_queue(job_type, status);
create index if not exists telavox_job_queue_call_id_idx on call_intelligence.telavox_job_queue(telavox_call_id);
create index if not exists telavox_job_queue_scheduled_at_idx on call_intelligence.telavox_job_queue(scheduled_at);
create index if not exists telavox_job_queue_status_created_idx on call_intelligence.telavox_job_queue(status, created_at);

alter table call_intelligence.telavox_job_queue enable row level security;

create policy "Service role can manage telavox_job_queue"
on call_intelligence.telavox_job_queue
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

