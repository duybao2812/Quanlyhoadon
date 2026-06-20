-- ==============================================
-- MIGRATION: Tich hop Casso - Lich su giao dich ngan hang
-- Ngay tao: 2026-06-20
-- ==============================================

-- --------------------------------------------------
-- 1. BANG KET NOI TAI KHOAN NGAN HANG (casso_connections)
--    Luu access_token vinh vien cho moi nguoi dung
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.casso_connections (
    id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    owner_id      text NOT NULL,           -- Firebase UID cua nguoi dung so huu ket noi
    grant_id      text,                    -- Grant ID tra ve tu Casso khi doi publicToken
    access_token  text NOT NULL,           -- Access Token vinh vien tu Casso de goi API
    bank_name     text,                    -- Ten ngan hang da lien ket (neu Casso tra ve)
    account_no    text,                    -- So tai khoan da lien ket
    status        text DEFAULT 'active',   -- Trang thai: 'active' | 'revoked'
    created_at    timestamptz DEFAULT now() NOT NULL,
    updated_at    timestamptz DEFAULT now() NOT NULL
);

-- --------------------------------------------------
-- 2. BANG LICH SU GIAO DICH (casso_transactions)
--    Luu toan bo giao dich tu Casso (ca Webhook lan Polling)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.casso_transactions (
    id                  text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    owner_id            text NOT NULL,             -- Firebase UID cua nguoi dung so huu
    casso_id            bigint UNIQUE,             -- ID giao dich goc cua Casso (tranh luu trung)
    tid                 text,                      -- Ma giao dich ngan hang (vi du: TF2104152395814062)
    amount              numeric NOT NULL,           -- So tien (am: chi, duong: thu vao)
    description         text,                      -- Noi dung chuyen khoan
    when_date           timestamptz,               -- Thoi diem phat sinh giao dich
    bank_sub_acc_id     text,                      -- So tai khoan ngan hang phu
    bank_code_name      text,                      -- Ma ngan hang (vd: vcb, acb_digi)
    -- Ket qua doi soat voi hoa don
    matched_invoice_id  text REFERENCES public.invoices(id) ON DELETE SET NULL,
    match_status        text DEFAULT 'unmatched',  -- 'matched' | 'unmatched'
    created_at          timestamptz DEFAULT now() NOT NULL
);

-- --------------------------------------------------
-- 3. THEM COT PAYMENT_STATUS VAO BANG INVOICES
--    Trang thai thanh toan doc lap voi trang thai xu ly OCR
-- --------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invoices' AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE public.invoices
        ADD COLUMN payment_status text DEFAULT 'unpaid';
        -- Gia tri: 'unpaid' (chua thanh toan) | 'paid' (da thanh toan) | 'partial' (thanh toan mot phan)
    END IF;
END $$;

-- --------------------------------------------------
-- 4. BAT ROW LEVEL SECURITY
-- --------------------------------------------------
ALTER TABLE public.casso_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casso_transactions ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------
-- 5. ROW LEVEL SECURITY POLICIES
--    Nguoi dung chi xem duoc du lieu cua chinh ho
-- --------------------------------------------------

-- Policy cho casso_connections
DROP POLICY IF EXISTS "Users can manage their own casso_connections" ON public.casso_connections;
CREATE POLICY "Users can manage their own casso_connections"
ON public.casso_connections FOR ALL TO public
USING (
    owner_id = COALESCE(
        (SELECT public.get_custom_user_id()),
        (SELECT auth.uid())::text
    )
)
WITH CHECK (
    owner_id = COALESCE(
        (SELECT public.get_custom_user_id()),
        (SELECT auth.uid())::text
    )
);

-- Policy cho casso_transactions
DROP POLICY IF EXISTS "Users can manage their own casso_transactions" ON public.casso_transactions;
CREATE POLICY "Users can manage their own casso_transactions"
ON public.casso_transactions FOR ALL TO public
USING (
    owner_id = COALESCE(
        (SELECT public.get_custom_user_id()),
        (SELECT auth.uid())::text
    )
)
WITH CHECK (
    owner_id = COALESCE(
        (SELECT public.get_custom_user_id()),
        (SELECT auth.uid())::text
    )
);

-- --------------------------------------------------
-- 6. TRIGGER TU DONG CAP NHAT updated_at
-- --------------------------------------------------
DROP TRIGGER IF EXISTS update_casso_connections_updated_at ON public.casso_connections;
CREATE TRIGGER update_casso_connections_updated_at
BEFORE UPDATE ON public.casso_connections
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- --------------------------------------------------
-- 7. INDEX TANG TOC TRUY VAN
-- --------------------------------------------------
CREATE INDEX IF NOT EXISTS casso_connections_owner_idx
    ON public.casso_connections(owner_id);

CREATE INDEX IF NOT EXISTS casso_transactions_owner_idx
    ON public.casso_transactions(owner_id);

CREATE INDEX IF NOT EXISTS casso_transactions_when_date_idx
    ON public.casso_transactions(when_date DESC);

CREATE INDEX IF NOT EXISTS casso_transactions_match_status_idx
    ON public.casso_transactions(owner_id, match_status);
