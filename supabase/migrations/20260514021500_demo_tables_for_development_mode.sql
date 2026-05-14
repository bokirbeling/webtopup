create extension if not exists pgcrypto with schema extensions;

create table if not exists public.demo_orders (like public.orders including defaults including constraints including indexes);
create table if not exists public.demo_payments (like public.payments including defaults including constraints including indexes);
create table if not exists public.demo_fulfillments (like public.fulfillments including defaults including constraints including indexes);
create table if not exists public.demo_webhook_events (like public.webhook_events including defaults including constraints including indexes);
create table if not exists public.demo_status_history (like public.status_history including defaults including constraints including indexes);

alter table public.demo_payments
  drop constraint if exists payments_order_id_fkey,
  drop constraint if exists demo_payments_order_id_fkey;
alter table public.demo_payments
  add constraint demo_payments_order_id_fkey foreign key (order_id) references public.demo_orders (id) on delete cascade;

alter table public.demo_fulfillments
  drop constraint if exists fulfillments_order_id_fkey,
  drop constraint if exists demo_fulfillments_order_id_fkey;
alter table public.demo_fulfillments
  add constraint demo_fulfillments_order_id_fkey foreign key (order_id) references public.demo_orders (id) on delete cascade;

alter table public.demo_webhook_events
  drop constraint if exists webhook_events_order_id_fkey,
  drop constraint if exists webhook_events_payment_id_fkey,
  drop constraint if exists webhook_events_fulfillment_id_fkey,
  drop constraint if exists demo_webhook_events_order_id_fkey,
  drop constraint if exists demo_webhook_events_payment_id_fkey,
  drop constraint if exists demo_webhook_events_fulfillment_id_fkey;
alter table public.demo_webhook_events
  add constraint demo_webhook_events_order_id_fkey foreign key (order_id) references public.demo_orders (id) on delete set null,
  add constraint demo_webhook_events_payment_id_fkey foreign key (payment_id) references public.demo_payments (id) on delete set null,
  add constraint demo_webhook_events_fulfillment_id_fkey foreign key (fulfillment_id) references public.demo_fulfillments (id) on delete set null;

alter table public.demo_status_history
  drop constraint if exists status_history_order_id_fkey,
  drop constraint if exists status_history_payment_id_fkey,
  drop constraint if exists status_history_fulfillment_id_fkey,
  drop constraint if exists status_history_webhook_event_id_fkey,
  drop constraint if exists demo_status_history_order_id_fkey,
  drop constraint if exists demo_status_history_payment_id_fkey,
  drop constraint if exists demo_status_history_fulfillment_id_fkey,
  drop constraint if exists demo_status_history_webhook_event_id_fkey;
alter table public.demo_status_history
  add constraint demo_status_history_order_id_fkey foreign key (order_id) references public.demo_orders (id) on delete cascade,
  add constraint demo_status_history_payment_id_fkey foreign key (payment_id) references public.demo_payments (id) on delete set null,
  add constraint demo_status_history_fulfillment_id_fkey foreign key (fulfillment_id) references public.demo_fulfillments (id) on delete set null,
  add constraint demo_status_history_webhook_event_id_fkey foreign key (webhook_event_id) references public.demo_webhook_events (id) on delete set null;

revoke all on table public.demo_orders, public.demo_payments, public.demo_fulfillments, public.demo_webhook_events, public.demo_status_history from anon, authenticated;
revoke all on sequence public.demo_status_history_id_seq from anon, authenticated;
grant all on table public.demo_orders, public.demo_payments, public.demo_fulfillments, public.demo_webhook_events, public.demo_status_history to service_role;
grant usage, select, update on sequence public.demo_status_history_id_seq to service_role;

alter table public.demo_orders enable row level security;
alter table public.demo_payments enable row level security;
alter table public.demo_fulfillments enable row level security;
alter table public.demo_webhook_events enable row level security;
alter table public.demo_status_history enable row level security;

drop policy if exists "service_role_all_demo_orders" on public.demo_orders;
drop policy if exists "service_role_all_demo_payments" on public.demo_payments;
drop policy if exists "service_role_all_demo_fulfillments" on public.demo_fulfillments;
drop policy if exists "service_role_all_demo_webhook_events" on public.demo_webhook_events;
drop policy if exists "service_role_all_demo_status_history" on public.demo_status_history;

create policy "service_role_all_demo_orders" on public.demo_orders for all to service_role using (true) with check (true);
create policy "service_role_all_demo_payments" on public.demo_payments for all to service_role using (true) with check (true);
create policy "service_role_all_demo_fulfillments" on public.demo_fulfillments for all to service_role using (true) with check (true);
create policy "service_role_all_demo_webhook_events" on public.demo_webhook_events for all to service_role using (true) with check (true);
create policy "service_role_all_demo_status_history" on public.demo_status_history for all to service_role using (true) with check (true);
