create table if not exists phone_verifications (
  id uuid primary key,
  phone_number text not null,
  purpose text not null,
  verification_code_hash text not null,
  verification_token text,
  attempt_count integer not null default 0,
  request_count integer not null default 1,
  verified_at timestamptz,
  expires_at timestamptz not null,
  device_id text,
  request_ip inet,
  requested_at timestamptz not null default now(),
  sms_provider text,
  sms_message_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_phone_verifications_phone_number on phone_verifications(phone_number);
create index if not exists idx_phone_verifications_device_id on phone_verifications(device_id);
create index if not exists idx_phone_verifications_requested_at on phone_verifications(requested_at desc);
