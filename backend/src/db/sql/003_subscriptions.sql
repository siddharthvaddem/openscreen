create table if not exists subscriptions (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  provider text not null default 'toss',
  plan_code text not null default 'pro_monthly_15900_krw',
  status text not null default 'inactive',
  provider_customer_key text,
  provider_billing_key text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
