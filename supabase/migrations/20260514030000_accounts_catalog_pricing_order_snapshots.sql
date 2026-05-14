create extension if not exists pgcrypto with schema extensions;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(btrim(email)) > 0),
  password_hash text not null check (char_length(btrim(password_hash)) > 0),
  role text not null default 'pengguna' check (role in ('admin', 'seller', 'pengguna')),
  is_reseller_active boolean not null default false,
  reseller_status text not null default 'none' check (reseller_status in ('none', 'requested', 'approved', 'rejected')),
  reseller_requested_at timestamptz,
  reseller_reviewed_at timestamptz,
  reseller_review_note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint users_reseller_active_status_check check (not is_reseller_active or reseller_status = 'approved')
);

create unique index if not exists users_email_idx
  on public.users (email);

create index if not exists users_role_reseller_status_idx
  on public.users (role, reseller_status, is_reseller_active);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku_digiflazz text not null check (char_length(btrim(sku_digiflazz)) > 0),
  name text not null check (char_length(btrim(name)) > 0),
  category text not null check (char_length(btrim(category)) > 0),
  provider text not null default 'digiflazz' check (char_length(btrim(provider)) > 0),
  base_price_minor bigint not null check (base_price_minor >= 0),
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists products_sku_digiflazz_idx
  on public.products (sku_digiflazz);

create index if not exists products_active_category_idx
  on public.products (is_active, category, name);

create table if not exists public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  scope_type text not null check (scope_type in ('global', 'category', 'product')),
  product_id uuid references public.products (id) on delete cascade,
  category text,
  role_type text not null check (role_type in ('admin', 'seller', 'pengguna')),
  markup_fixed bigint not null default 0 check (markup_fixed >= 0),
  markup_percentage numeric(8, 4) not null default 0 check (markup_percentage >= 0),
  priority integer not null default 0,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint pricing_rules_scope_target_check check (
    (scope_type = 'global' and product_id is null and category is null)
    or (scope_type = 'category' and product_id is null and category is not null and char_length(btrim(category)) > 0)
    or (scope_type = 'product' and product_id is not null and category is null)
  )
);

create index if not exists pricing_rules_lookup_idx
  on public.pricing_rules (is_active, role_type, scope_type, priority desc);

create index if not exists pricing_rules_product_lookup_idx
  on public.pricing_rules (product_id, role_type, is_active, priority desc)
  where product_id is not null;

create index if not exists pricing_rules_category_lookup_idx
  on public.pricing_rules (category, role_type, is_active, priority desc)
  where category is not null;

alter table public.orders
  add column if not exists user_id uuid,
  add column if not exists base_price_snapshot bigint,
  add column if not exists markup_snapshot bigint,
  add column if not exists role_price_snapshot bigint,
  add column if not exists pricing_rule_id_snapshot uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_user_id_fkey'
  ) then
    alter table public.orders
      add constraint orders_user_id_fkey foreign key (user_id) references public.users (id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_pricing_rule_id_snapshot_fkey'
  ) then
    alter table public.orders
      add constraint orders_pricing_rule_id_snapshot_fkey foreign key (pricing_rule_id_snapshot) references public.pricing_rules (id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_base_price_snapshot_nonnegative'
  ) then
    alter table public.orders
      add constraint orders_base_price_snapshot_nonnegative check (base_price_snapshot is null or base_price_snapshot >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_markup_snapshot_nonnegative'
  ) then
    alter table public.orders
      add constraint orders_markup_snapshot_nonnegative check (markup_snapshot is null or markup_snapshot >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_role_price_snapshot_nonnegative'
  ) then
    alter table public.orders
      add constraint orders_role_price_snapshot_nonnegative check (role_price_snapshot is null or role_price_snapshot >= 0);
  end if;
end $$;

create index if not exists orders_user_id_created_at_idx
  on public.orders (user_id, created_at desc)
  where user_id is not null;

create index if not exists orders_pricing_rule_id_snapshot_idx
  on public.orders (pricing_rule_id_snapshot)
  where pricing_rule_id_snapshot is not null;

create table if not exists public.demo_users (like public.users including defaults including constraints including indexes);
create table if not exists public.demo_products (like public.products including defaults including constraints including indexes);
create table if not exists public.demo_pricing_rules (like public.pricing_rules including defaults including constraints including indexes);

alter table public.demo_pricing_rules
  drop constraint if exists pricing_rules_product_id_fkey,
  drop constraint if exists demo_pricing_rules_product_id_fkey;

alter table public.demo_pricing_rules
  add constraint demo_pricing_rules_product_id_fkey foreign key (product_id) references public.demo_products (id) on delete cascade;

alter table public.demo_orders
  add column if not exists user_id uuid,
  add column if not exists base_price_snapshot bigint,
  add column if not exists markup_snapshot bigint,
  add column if not exists role_price_snapshot bigint,
  add column if not exists pricing_rule_id_snapshot uuid;

alter table public.demo_orders
  drop constraint if exists orders_user_id_fkey,
  drop constraint if exists orders_pricing_rule_id_snapshot_fkey,
  drop constraint if exists demo_orders_user_id_fkey,
  drop constraint if exists demo_orders_pricing_rule_id_snapshot_fkey;

alter table public.demo_orders
  add constraint demo_orders_user_id_fkey foreign key (user_id) references public.demo_users (id) on delete set null,
  add constraint demo_orders_pricing_rule_id_snapshot_fkey foreign key (pricing_rule_id_snapshot) references public.demo_pricing_rules (id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.demo_orders'::regclass
      and conname = 'demo_orders_base_price_snapshot_nonnegative'
  ) then
    alter table public.demo_orders
      add constraint demo_orders_base_price_snapshot_nonnegative check (base_price_snapshot is null or base_price_snapshot >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.demo_orders'::regclass
      and conname = 'demo_orders_markup_snapshot_nonnegative'
  ) then
    alter table public.demo_orders
      add constraint demo_orders_markup_snapshot_nonnegative check (markup_snapshot is null or markup_snapshot >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.demo_orders'::regclass
      and conname = 'demo_orders_role_price_snapshot_nonnegative'
  ) then
    alter table public.demo_orders
      add constraint demo_orders_role_price_snapshot_nonnegative check (role_price_snapshot is null or role_price_snapshot >= 0);
  end if;
end $$;

create index if not exists demo_orders_user_id_created_at_idx
  on public.demo_orders (user_id, created_at desc)
  where user_id is not null;

create index if not exists demo_orders_pricing_rule_id_snapshot_idx
  on public.demo_orders (pricing_rule_id_snapshot)
  where pricing_rule_id_snapshot is not null;

revoke all on table
  public.users,
  public.products,
  public.pricing_rules,
  public.demo_users,
  public.demo_products,
  public.demo_pricing_rules
from anon, authenticated;

grant all on table
  public.users,
  public.products,
  public.pricing_rules,
  public.demo_users,
  public.demo_products,
  public.demo_pricing_rules
 to service_role;

alter table public.users enable row level security;
alter table public.users force row level security;

alter table public.products enable row level security;
alter table public.products force row level security;

alter table public.pricing_rules enable row level security;
alter table public.pricing_rules force row level security;

alter table public.demo_users enable row level security;
alter table public.demo_users force row level security;

alter table public.demo_products enable row level security;
alter table public.demo_products force row level security;

alter table public.demo_pricing_rules enable row level security;
alter table public.demo_pricing_rules force row level security;

alter table public.demo_orders force row level security;

drop policy if exists service_role_manage_users on public.users;
drop policy if exists service_role_manage_products on public.products;
drop policy if exists service_role_manage_pricing_rules on public.pricing_rules;
drop policy if exists service_role_manage_demo_users on public.demo_users;
drop policy if exists service_role_manage_demo_products on public.demo_products;
drop policy if exists service_role_manage_demo_pricing_rules on public.demo_pricing_rules;

create policy service_role_manage_users
  on public.users
  for all
  to service_role
  using (true)
  with check (true);

create policy service_role_manage_products
  on public.products
  for all
  to service_role
  using (true)
  with check (true);

create policy service_role_manage_pricing_rules
  on public.pricing_rules
  for all
  to service_role
  using (true)
  with check (true);

create policy service_role_manage_demo_users
  on public.demo_users
  for all
  to service_role
  using (true)
  with check (true);

create policy service_role_manage_demo_products
  on public.demo_products
  for all
  to service_role
  using (true)
  with check (true);

create policy service_role_manage_demo_pricing_rules
  on public.demo_pricing_rules
  for all
  to service_role
  using (true)
  with check (true);
