-- S5: Referral, Discount, and Commission System

-- Table: referral_codes
CREATE TABLE IF NOT EXISTS public.referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reseller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: discount_codes
CREATE TABLE IF NOT EXISTS public.discount_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('fixed', 'percentage')),
    value_minor BIGINT NOT NULL,
    max_discount_minor BIGINT,
    min_order_minor BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    starts_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: commissions
CREATE TABLE IF NOT EXISTS public.commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    reseller_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    referral_code_id UUID REFERENCES public.referral_codes(id) ON DELETE SET NULL,
    discount_code_id UUID REFERENCES public.discount_codes(id) ON DELETE SET NULL,
    gross_sale_minor BIGINT NOT NULL,
    discount_amount_minor BIGINT DEFAULT 0,
    net_sale_minor BIGINT NOT NULL,
    commission_percentage NUMERIC(5,2),
    commission_amount_minor BIGINT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'payable', 'paid', 'cancelled', 'reversed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add referral/discount to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount_minor BIGINT DEFAULT 0;

-- Indices
CREATE INDEX IF NOT EXISTS commissions_reseller_idx ON public.commissions(reseller_id);
CREATE INDEX IF NOT EXISTS commissions_status_idx ON public.commissions(status);
CREATE INDEX IF NOT EXISTS referral_codes_code_idx ON public.referral_codes(code);

-- Demo equivalents
CREATE TABLE IF NOT EXISTS public.demo_referral_codes (LIKE public.referral_codes INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.demo_discount_codes (LIKE public.discount_codes INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.demo_commissions (LIKE public.commissions INCLUDING ALL);
ALTER TABLE public.demo_orders ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.demo_orders ADD COLUMN IF NOT EXISTS discount_code TEXT;
ALTER TABLE public.demo_orders ADD COLUMN IF NOT EXISTS discount_amount_minor BIGINT DEFAULT 0;

-- RLS & Grants
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_commissions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.referral_codes FROM anon, authenticated;
REVOKE ALL ON public.discount_codes FROM anon, authenticated;
REVOKE ALL ON public.commissions FROM anon, authenticated;

GRANT ALL ON public.referral_codes TO service_role;
GRANT ALL ON public.discount_codes TO service_role;
GRANT ALL ON public.commissions TO service_role;

-- Policies
CREATE POLICY service_role_all_referral_codes ON public.referral_codes FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY service_role_all_discount_codes ON public.discount_codes FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY service_role_all_commissions ON public.commissions FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
