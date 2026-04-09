create table if not exists desktop_login_codes (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  code text not null unique,
  used_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
