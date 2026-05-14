create extension if not exists pgcrypto with schema extensions;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_ref text,
  product_code text not null,
  provider text not null check (char_length(btrim(provider)) > 0),
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null default 'IDR' check (char_length(btrim(currency)) > 0),
  status text not null default 'created' check (
    status in ('created', 'pending_payment', 'paid', 'fulfillment_pending', 'success', 'failed', 'expired')
  ),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists orders_status_created_at_idx
  on public.orders (status, created_at desc);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null check (char_length(btrim(provider)) > 0),
  idempotency_key text not null check (char_length(btrim(idempotency_key)) > 0),
  provider_payment_id text,
  provider_reference text,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null default 'IDR' check (char_length(btrim(currency)) > 0),
  status text not null default 'pending' check (
    status in ('pending', 'paid', 'failed', 'expired', 'cancelled', 'refunded')
  ),
  paid_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint payments_provider_idempotency_key_unique unique (provider, idempotency_key)
);

create unique index if not exists payments_provider_payment_id_unique
  on public.payments (provider, provider_payment_id)
  where provider_payment_id is not null;

create unique index if not exists payments_provider_reference_unique
  on public.payments (provider, provider_reference)
  where provider_reference is not null;

create index if not exists payments_order_id_created_at_idx
  on public.payments (order_id, created_at desc);

create table if not exists public.fulfillments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null check (char_length(btrim(provider)) > 0),
  attempt_no integer not null check (attempt_no > 0),
  provider_fulfillment_id text,
  provider_reference text,
  status text not null default 'queued' check (
    status in ('queued', 'processing', 'success', 'failed')
  ),
  serial_number text,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint fulfillments_order_attempt_unique unique (order_id, attempt_no)
);

create unique index if not exists fulfillments_provider_fulfillment_id_unique
  on public.fulfillments (provider, provider_fulfillment_id)
  where provider_fulfillment_id is not null;

create unique index if not exists fulfillments_provider_reference_unique
  on public.fulfillments (provider, provider_reference)
  where provider_reference is not null;

create index if not exists fulfillments_order_created_at_idx
  on public.fulfillments (order_id, created_at desc);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (char_length(btrim(provider)) > 0),
  event_key text not null check (char_length(btrim(event_key)) > 0),
  event_type text not null check (char_length(btrim(event_type)) > 0),
  order_id uuid references public.orders (id) on delete set null,
  payment_id uuid references public.payments (id) on delete set null,
  fulfillment_id uuid references public.fulfillments (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  processing_state text not null default 'pending' check (
    processing_state in ('pending', 'processed', 'ignored', 'failed')
  ),
  received_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz,
  error_message text,
  constraint webhook_events_provider_event_key_unique unique (provider, event_key)
);

create index if not exists webhook_events_order_id_received_at_idx
  on public.webhook_events (order_id, received_at desc);

create index if not exists webhook_events_received_at_idx
  on public.webhook_events (received_at desc);

create table if not exists public.status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  payment_id uuid references public.payments (id) on delete set null,
  fulfillment_id uuid references public.fulfillments (id) on delete set null,
  webhook_event_id uuid references public.webhook_events (id) on delete set null,
  from_status text,
  to_status text not null,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_by text not null default 'system',
  created_at timestamptz not null default timezone('utc', now()),
  constraint status_history_from_status_allowed check (
    from_status is null
    or from_status in ('created', 'pending_payment', 'paid', 'fulfillment_pending', 'success', 'failed', 'expired')
  ),
  constraint status_history_to_status_allowed check (
    to_status in ('created', 'pending_payment', 'paid', 'fulfillment_pending', 'success', 'failed', 'expired')
  ),
  constraint status_history_non_terminal_transition check (
    from_status is null
    or from_status in ('success', 'failed', 'expired')
    or from_status <> to_status
  ),
  constraint status_history_monotonic_safe check (
    from_status is null
    or case from_status
      when 'created' then 1
      when 'pending_payment' then 2
      when 'paid' then 3
      when 'fulfillment_pending' then 4
      when 'success' then 5
      when 'failed' then 5
      when 'expired' then 5
      else 0
    end <= case to_status
      when 'created' then 1
      when 'pending_payment' then 2
      when 'paid' then 3
      when 'fulfillment_pending' then 4
      when 'success' then 5
      when 'failed' then 5
      when 'expired' then 5
      else 0
    end
  ),
  constraint status_history_terminal_state_lock check (
    from_status is null
    or from_status not in ('success', 'failed', 'expired')
    or from_status = to_status
  )
);

create index if not exists status_history_order_id_created_at_idx
  on public.status_history (order_id, created_at desc);

revoke all on table
  public.orders,
  public.payments,
  public.fulfillments,
  public.webhook_events,
  public.status_history
from anon, authenticated;

revoke all on sequence public.status_history_id_seq from anon, authenticated;

grant all on table
  public.orders,
  public.payments,
  public.fulfillments,
  public.webhook_events,
  public.status_history
to service_role;

grant usage, select, update on sequence public.status_history_id_seq to service_role;

alter table public.orders enable row level security;
alter table public.orders force row level security;

alter table public.payments enable row level security;
alter table public.payments force row level security;

alter table public.fulfillments enable row level security;
alter table public.fulfillments force row level security;

alter table public.webhook_events enable row level security;
alter table public.webhook_events force row level security;

alter table public.status_history enable row level security;
alter table public.status_history force row level security;

drop policy if exists service_role_manage_orders on public.orders;
drop policy if exists service_role_manage_payments on public.payments;
drop policy if exists service_role_manage_fulfillments on public.fulfillments;
drop policy if exists service_role_manage_webhook_events on public.webhook_events;
drop policy if exists service_role_manage_status_history on public.status_history;

create policy service_role_manage_orders
  on public.orders
  for all
  to service_role
  using (true)
  with check (true);

create policy service_role_manage_payments
  on public.payments
  for all
  to service_role
  using (true)
  with check (true);

create policy service_role_manage_fulfillments
  on public.fulfillments
  for all
  to service_role
  using (true)
  with check (true);

create policy service_role_manage_webhook_events
  on public.webhook_events
  for all
  to service_role
  using (true)
  with check (true);

create policy service_role_manage_status_history
  on public.status_history
  for all
  to service_role
  using (true)
  with check (true);
