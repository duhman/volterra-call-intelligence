SET search_path TO call_intelligence;

-- Create users table
create table if not exists call_intelligence.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create conversations table
create table if not exists call_intelligence.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references call_intelligence.users(id) on delete cascade,
  agent_id text not null,
  conversation_id text unique not null,
  status text default 'active'::text,
  transcript text,
  summary text,
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create insights table
create table if not exists call_intelligence.insights (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null,
  sentiment text default 'neutral'::text,
  key_points text[],
  deal_stage text,
  competitor_mentions text[],
  next_steps text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  foreign key (conversation_id) references call_intelligence.conversations(conversation_id) on delete cascade
);

-- Create sync_queue table
create table if not exists call_intelligence.sync_queue (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null,
  sync_type text not null,
  data jsonb not null,
  status text default 'pending'::text,
  error_message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  foreign key (conversation_id) references call_intelligence.conversations(conversation_id) on delete cascade
);

-- Create sync_history table
create table if not exists call_intelligence.sync_history (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null,
  sync_type text not null,
  hubspot_id text,
  data jsonb not null,
  status text not null,
  error_message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  foreign key (conversation_id) references call_intelligence.conversations(conversation_id) on delete cascade
);

-- Create indexes for better performance
create index if not exists conversations_user_id_idx on call_intelligence.conversations(user_id);
create index if not exists conversations_agent_id_idx on call_intelligence.conversations(agent_id);
create index if not exists conversations_status_idx on call_intelligence.conversations(status);
create index if not exists insights_conversation_id_idx on call_intelligence.insights(conversation_id);
create index if not exists sync_queue_conversation_id_idx on call_intelligence.sync_queue(conversation_id);
create index if not exists sync_queue_status_idx on call_intelligence.sync_queue(status);
create index if not exists sync_history_conversation_id_idx on call_intelligence.sync_history(conversation_id);

-- Enable RLS
alter table call_intelligence.users enable row level security;
alter table call_intelligence.conversations enable row level security;
alter table call_intelligence.insights enable row level security;
alter table call_intelligence.sync_queue enable row level security;
alter table call_intelligence.sync_history enable row level security;

-- RLS Policies for users table
create policy "Users can only view their own data" on call_intelligence.users
  for select using (auth.uid() = id);

-- RLS Policies for conversations table
create policy "Users can only view their own conversations" on call_intelligence.conversations
  for select using (auth.uid() = user_id);

create policy "Users can insert their own conversations" on call_intelligence.conversations
  for insert with check (auth.uid() = user_id);

-- RLS Policies for insights table
create policy "Users can view insights for their conversations" on call_intelligence.insights
  for select using (
    conversation_id in (
      select conversation_id from call_intelligence.conversations where user_id = auth.uid()
    )
  );

-- RLS Policies for sync_queue table
create policy "Users can view sync queue for their conversations" on call_intelligence.sync_queue
  for select using (
    conversation_id in (
      select conversation_id from call_intelligence.conversations where user_id = auth.uid()
    )
  );

create policy "Users can manage sync queue for their conversations" on call_intelligence.sync_queue
  for update using (
    conversation_id in (
      select conversation_id from call_intelligence.conversations where user_id = auth.uid()
    )
  );

-- RLS Policies for sync_history table
create policy "Users can view sync history for their conversations" on call_intelligence.sync_history
  for select using (
    conversation_id in (
      select conversation_id from call_intelligence.conversations where user_id = auth.uid()
    )
  );

-- Storage bucket and policies are now configured in 000_create_schema.sql
