create table if not exists signup_audit_logs (
  id uuid primary key,
  username text,
  email text,
  phone_number text,
  device_id text,
  signup_ip inet,
  outcome text not null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists user_agreements (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  marketing_opt_in boolean not null default false,
  accepted_terms_at timestamptz not null,
  accepted_privacy_at timestamptz not null,
  accepted_marketing_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists free_trial_grants (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  phone_number text not null,
  device_id text,
  granted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  source text not null default 'signup'
);

create unique index if not exists uniq_free_trial_phone on free_trial_grants(phone_number);
create unique index if not exists uniq_free_trial_device on free_trial_grants(device_id) where device_id is not null;
