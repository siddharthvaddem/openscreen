create table if not exists users (
  id uuid primary key,
  username text not null unique,
  email text not null unique,
  family_name text not null,
  given_name text not null,
  display_name text not null,
  phone_number text not null unique,
  phone_verified_at timestamptz not null,
  password_salt text not null,
  password_hash text not null,
  signup_device_id text,
  signup_ip inet,
  plan text not null default 'free',
  subscription_status text not null default 'trial',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

create index if not exists idx_users_signup_device_id on users(signup_device_id);
