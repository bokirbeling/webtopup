create extension if not exists pgcrypto with schema extensions;

create table if not exists public.postpaid_inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  ref_id text not null check (char_length(btrim(ref_id)) > 0),
  buyer_sku_code text not null check (char_length(btrim(buyer_sku_code)) > 0),
  customer_no text not null check (char_length(btrim(customer_no)) > 0),
  customer_name text,
  admin_minor bigint check (admin_minor is null or admin_minor >= 0),
  price_minor bigint check (price_minor is null or price_minor >= 0),
  selling_price_minor bigint check (selling_price_minor is null or selling_price_minor >= 0),
  status text,
  rc text,
  message text,
  inquiry_status text,
  inquiry_rc text,
  inquiry_message text,
  serial_number text,
  metadata jsonb not null default '{}'::jsonb,
  raw_response jsonb not null default '{}'::jsonb,
  payment_raw_response jsonb,
  status_raw_response jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint postpaid_inquiries_ref_id_unique unique (ref_id)
);

create index if not exists postpaid_inquiries_user_created_at_idx
  on public.postpaid_inquiries (user_id, created_at desc);

create index if not exists postpaid_inquiries_status_updated_at_idx
  on public.postpaid_inquiries (status, updated_at desc);

create table if not exists public.pln_inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  customer_no text not null check (char_length(btrim(customer_no)) > 0),
  meter_no text,
  subscriber_id text,
  customer_name text,
  segment_power text,
  status text,
  rc text,
  message text,
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists pln_inquiries_user_created_at_idx
  on public.pln_inquiries (user_id, created_at desc);

create table if not exists public.demo_postpaid_inquiries (like public.postpaid_inquiries including defaults including constraints including indexes);
create table if not exists public.demo_pln_inquiries (like public.pln_inquiries including defaults including constraints including indexes);

alter table public.demo_postpaid_inquiries
  drop constraint if exists postpaid_inquiries_user_id_fkey,
  drop constraint if exists demo_postpaid_inquiries_user_id_fkey;
alter table public.demo_postpaid_inquiries
  add constraint demo_postpaid_inquiries_user_id_fkey foreign key (user_id) references public.demo_users (id) on delete cascade;

alter table public.demo_pln_inquiries
  drop constraint if exists pln_inquiries_user_id_fkey,
  drop constraint if exists demo_pln_inquiries_user_id_fkey;
alter table public.demo_pln_inquiries
  add constraint demo_pln_inquiries_user_id_fkey foreign key (user_id) references public.demo_users (id) on delete cascade;

revoke all on table
  public.postpaid_inquiries,
  public.pln_inquiries,
  public.demo_postpaid_inquiries,
  public.demo_pln_inquiries
from anon, authenticated;

grant all on table
  public.postpaid_inquiries,
  public.pln_inquiries,
  public.demo_postpaid_inquiries,
  public.demo_pln_inquiries
 to service_role;

alter table public.postpaid_inquiries enable row level security;
alter table public.postpaid_inquiries force row level security;
alter table public.pln_inquiries enable row level security;
alter table public.pln_inquiries force row level security;
alter table public.demo_postpaid_inquiries enable row level security;
alter table public.demo_postpaid_inquiries force row level security;
alter table public.demo_pln_inquiries enable row level security;
alter table public.demo_pln_inquiries force row level security;

drop policy if exists service_role_manage_postpaid_inquiries on public.postpaid_inquiries;
drop policy if exists service_role_manage_pln_inquiries on public.pln_inquiries;
drop policy if exists service_role_manage_demo_postpaid_inquiries on public.demo_postpaid_inquiries;
drop policy if exists service_role_manage_demo_pln_inquiries on public.demo_pln_inquiries;

create policy service_role_manage_postpaid_inquiries
  on public.postpaid_inquiries
  for all
  to service_role
  using (true)
  with check (true);

create policy service_role_manage_pln_inquiries
  on public.pln_inquiries
  for all
  to service_role
  using (true)
  with check (true);

create policy service_role_manage_demo_postpaid_inquiries
  on public.demo_postpaid_inquiries
  for all
  to service_role
  using (true)
  with check (true);

create policy service_role_manage_demo_pln_inquiries
  on public.demo_pln_inquiries
  for all
  to service_role
  using (true)
  with check (true);
