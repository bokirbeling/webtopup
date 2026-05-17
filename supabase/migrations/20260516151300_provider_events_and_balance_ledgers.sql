-- S4: Provider Response History and Balance Ledgers

-- Table: provider_events
CREATE TABLE IF NOT EXISTS public.provider_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    fulfillment_id UUID REFERENCES public.fulfillments(id) ON DELETE SET NULL,
    provider TEXT NOT NULL CHECK (provider IN ('midtrans', 'digiflazz')),
    event_type TEXT NOT NULL, -- e.g., 'webhook', 'api_response', 'callback'
    provider_reference TEXT, -- ref_id, trx_id, transaction_id
    provider_status TEXT,
    provider_code TEXT, -- rc, transaction_status
    provider_message TEXT,
    amount_minor BIGINT,
    sku_digiflazz TEXT,
    customer_no_masked TEXT,
    serial_number TEXT,
    signature_verified BOOLEAN DEFAULT FALSE,
    amount_matched BOOLEAN DEFAULT FALSE,
    idempotency_key TEXT,
    raw_payload JSONB,
    safe_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: balance_ledgers
CREATE TABLE IF NOT EXISTS public.balance_ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL CHECK (provider IN ('midtrans', 'digiflazz')),
    source TEXT NOT NULL CHECK (source IN ('api', 'manual', 'calculated')),
    amount_minor BIGINT NOT NULL,
    balance_after_minor BIGINT,
    note TEXT,
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indices
CREATE INDEX IF NOT EXISTS provider_events_order_id_idx ON public.provider_events(order_id);
CREATE INDEX IF NOT EXISTS provider_events_created_at_idx ON public.provider_events(created_at DESC);
CREATE INDEX IF NOT EXISTS balance_ledgers_provider_created_idx ON public.balance_ledgers(provider, created_at DESC);

-- Demo equivalents
CREATE TABLE IF NOT EXISTS public.demo_provider_events (LIKE public.provider_events INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.demo_balance_ledgers (LIKE public.balance_ledgers INCLUDING ALL);

-- RLS & Grants
ALTER TABLE public.provider_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_provider_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_balance_ledgers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.provider_events FROM anon, authenticated;
REVOKE ALL ON public.balance_ledgers FROM anon, authenticated;
REVOKE ALL ON public.demo_provider_events FROM anon, authenticated;
REVOKE ALL ON public.demo_balance_ledgers FROM anon, authenticated;

GRANT ALL ON public.provider_events TO service_role;
GRANT ALL ON public.balance_ledgers TO service_role;
GRANT ALL ON public.demo_provider_events TO service_role;
GRANT ALL ON public.demo_balance_ledgers TO service_role;

-- Force RLS for service_role access only
CREATE POLICY service_role_all_provider_events ON public.provider_events FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY service_role_all_balance_ledgers ON public.balance_ledgers FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY service_role_all_demo_provider_events ON public.demo_provider_events FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY service_role_all_demo_balance_ledgers ON public.demo_balance_ledgers FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
