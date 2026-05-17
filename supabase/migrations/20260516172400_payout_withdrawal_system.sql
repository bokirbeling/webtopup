-- S6: Manual Payout Withdrawal System with Encrypted Identity Data

-- Table: payout_requests
CREATE TABLE IF NOT EXISTS public.payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    bank_fee_minor BIGINT DEFAULT 0,
    net_amount_minor BIGINT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'processing', 'paid', 'rejected', 'cancelled')),
    
    -- Encrypted identity/bank data (encrypted at rest)
    encrypted_legal_name TEXT NOT NULL,
    encrypted_nik TEXT NOT NULL,
    encrypted_address TEXT NOT NULL,
    encrypted_bank_name TEXT NOT NULL,
    encrypted_account_number TEXT NOT NULL,
    encrypted_account_holder TEXT NOT NULL,
    encrypted_phone TEXT,
    encrypted_email TEXT,
    
    -- Fingerprint/hash for verification (not for decryption)
    identity_fingerprint TEXT NOT NULL,
    
    -- Admin processing fields
    admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    admin_note TEXT,
    proof_reference TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: payout_balance_ledgers
CREATE TABLE IF NOT EXISTS public.payout_balance_ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    payout_request_id UUID REFERENCES public.payout_requests(id) ON DELETE SET NULL,
    commission_id UUID REFERENCES public.commissions(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('commission_earned', 'payout_reserved', 'payout_released', 'payout_paid')),
    amount_minor BIGINT NOT NULL,
    balance_after_minor BIGINT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: payout_decrypt_audit_log
CREATE TABLE IF NOT EXISTS public.payout_decrypt_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_request_id UUID NOT NULL REFERENCES public.payout_requests(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    decrypted_fields TEXT[] NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indices
CREATE INDEX IF NOT EXISTS payout_requests_user_idx ON public.payout_requests(user_id);
CREATE INDEX IF NOT EXISTS payout_requests_status_idx ON public.payout_requests(status);
CREATE INDEX IF NOT EXISTS payout_requests_created_idx ON public.payout_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS payout_balance_ledgers_user_idx ON public.payout_balance_ledgers(user_id);
CREATE INDEX IF NOT EXISTS payout_balance_ledgers_created_idx ON public.payout_balance_ledgers(created_at DESC);
CREATE INDEX IF NOT EXISTS payout_decrypt_audit_admin_idx ON public.payout_decrypt_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS payout_decrypt_audit_created_idx ON public.payout_decrypt_audit_log(created_at DESC);

-- RLS Policies
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_balance_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_decrypt_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own payout requests
CREATE POLICY payout_requests_user_select ON public.payout_requests
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own payout requests
CREATE POLICY payout_requests_user_insert ON public.payout_requests
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can view their own balance ledgers
CREATE POLICY payout_balance_ledgers_user_select ON public.payout_balance_ledgers
    FOR SELECT
    USING (auth.uid() = user_id);

-- Admin full access to payout requests (role check required in backend)
CREATE POLICY payout_requests_admin_all ON public.payout_requests
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    ));

-- Admin full access to balance ledgers
CREATE POLICY payout_balance_ledgers_admin_all ON public.payout_balance_ledgers
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    ));

-- Admin can view decrypt audit logs
CREATE POLICY payout_decrypt_audit_admin_select ON public.payout_decrypt_audit_log
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    ));

-- System can insert decrypt audit logs
CREATE POLICY payout_decrypt_audit_system_insert ON public.payout_decrypt_audit_log
    FOR INSERT
    WITH CHECK (true);
