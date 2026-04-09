create table if not exists billing_events (
  id uuid primary key,
  provider text not null,
  event_type text not null,
  event_id text,
  user_id uuid,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
