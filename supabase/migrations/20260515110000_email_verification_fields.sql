alter table public.users
  add column if not exists email_verified_at timestamptz,
  add column if not exists email_verification_token_hash text,
  add column if not exists email_verification_expires_at timestamptz,
  add column if not exists email_verification_sent_at timestamptz,
  add column if not exists email_verification_resend_count integer not null default 0;

alter table public.demo_users
  add column if not exists email_verified_at timestamptz,
  add column if not exists email_verification_token_hash text,
  add column if not exists email_verification_expires_at timestamptz,
  add column if not exists email_verification_sent_at timestamptz,
  add column if not exists email_verification_resend_count integer not null default 0;

create index if not exists users_email_verification_token_hash_idx
  on public.users (email_verification_token_hash)
  where email_verification_token_hash is not null;

create index if not exists demo_users_email_verification_token_hash_idx
  on public.demo_users (email_verification_token_hash)
  where email_verification_token_hash is not null;
