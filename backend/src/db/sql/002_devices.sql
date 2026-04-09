create table if not exists devices (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  device_name text,
  platform text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);
