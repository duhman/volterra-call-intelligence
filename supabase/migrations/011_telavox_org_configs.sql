SET search_path TO call_intelligence;

-- Telavox org configs: map Telavox orgs to HubSpot portals and store credentials/secrets

create table if not exists call_intelligence.telavox_org_configs (
  id uuid primary key default gen_random_uuid(),
  telavox_org_id text unique not null,
  hubspot_portal_id text not null,
  webhook_secret text not null,
  api_client_id text,
  api_client_secret text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists telavox_org_configs_org_id_idx on call_intelligence.telavox_org_configs(telavox_org_id);
create index if not exists telavox_org_configs_portal_id_idx on call_intelligence.telavox_org_configs(hubspot_portal_id);

alter table call_intelligence.telavox_org_configs enable row level security;

-- Backend-only access: allow service role; block anon/user roles.
-- Adjust to match your existing RLS pattern for privileged tables.

create policy "Service role can manage telavox_org_configs"
on call_intelligence.telavox_org_configs
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
