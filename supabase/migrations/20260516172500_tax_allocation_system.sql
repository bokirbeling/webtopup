-- S7: Internal PPh Final 0.5% Tax Allocation and Reporting

-- Table: tax_allocations
CREATE TABLE IF NOT EXISTS public.tax_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Snapshot values in minor units
    modal_price_minor BIGINT NOT NULL,
    selling_price_minor BIGINT NOT NULL,
    gross_commission_minor BIGINT NOT NULL,
    
    -- Tax calculation
    tax_rate NUMERIC(5,4) DEFAULT 0.0050 NOT NULL, -- 0.5%
    tax_allocation_minor BIGINT NOT NULL,
    
    -- Status tracking
    status TEXT NOT NULL CHECK (status IN ('pending', 'allocated', 'reported', 'cancelled')),
    
    -- Allocation only after both payment and fulfillment success
    payment_verified_at TIMESTAMP WITH TIME ZONE,
    fulfillment_verified_at TIMESTAMP WITH TIME ZONE,
    allocated_at TIMESTAMP WITH TIME ZONE,
    
    -- Reporting period
    reporting_period TEXT, -- Format: YYYY-MM
    reported_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: tax_reports
CREATE TABLE IF NOT EXISTS public.tax_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporting_period TEXT NOT NULL UNIQUE, -- Format: YYYY-MM
    
    -- Aggregated values in minor units
    total_transactions BIGINT NOT NULL DEFAULT 0,
    total_gross_commission_minor BIGINT NOT NULL DEFAULT 0,
    total_tax_allocation_minor BIGINT NOT NULL DEFAULT 0,
    
    -- Report metadata
    generated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Export tracking
    exported_at TIMESTAMP WITH TIME ZONE,
    export_format TEXT,
    export_reference TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indices
CREATE INDEX IF NOT EXISTS tax_allocations_order_idx ON public.tax_allocations(order_id);
CREATE INDEX IF NOT EXISTS tax_allocations_user_idx ON public.tax_allocations(user_id);
CREATE INDEX IF NOT EXISTS tax_allocations_status_idx ON public.tax_allocations(status);
CREATE INDEX IF NOT EXISTS tax_allocations_period_idx ON public.tax_allocations(reporting_period);
CREATE INDEX IF NOT EXISTS tax_allocations_allocated_idx ON public.tax_allocations(allocated_at DESC);
CREATE INDEX IF NOT EXISTS tax_reports_period_idx ON public.tax_reports(reporting_period);

-- RLS Policies
ALTER TABLE public.tax_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_reports ENABLE ROW LEVEL SECURITY;

-- Admin full access to tax allocations
CREATE POLICY tax_allocations_admin_all ON public.tax_allocations
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    ));

-- Admin full access to tax reports
CREATE POLICY tax_reports_admin_all ON public.tax_reports
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    ));

-- Function: Calculate tax allocation after success
CREATE OR REPLACE FUNCTION calculate_tax_allocation(
    p_order_id UUID,
    p_modal_price_minor BIGINT,
    p_selling_price_minor BIGINT
) RETURNS BIGINT AS $$
DECLARE
    v_gross_commission_minor BIGINT;
    v_tax_allocation_minor BIGINT;
BEGIN
    -- Calculate gross commission
    v_gross_commission_minor := GREATEST(p_selling_price_minor - p_modal_price_minor, 0);
    
    -- Calculate tax allocation (0.5%)
    v_tax_allocation_minor := ROUND(v_gross_commission_minor * 0.005);
    
    RETURN v_tax_allocation_minor;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Aggregate tax report for period
CREATE OR REPLACE FUNCTION aggregate_tax_report(p_reporting_period TEXT)
RETURNS TABLE(
    total_transactions BIGINT,
    total_gross_commission_minor BIGINT,
    total_tax_allocation_minor BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT,
        COALESCE(SUM(gross_commission_minor), 0)::BIGINT,
        COALESCE(SUM(tax_allocation_minor), 0)::BIGINT
    FROM public.tax_allocations
    WHERE reporting_period = p_reporting_period
      AND status = 'allocated';
END;
$$ LANGUAGE plpgsql STABLE;
