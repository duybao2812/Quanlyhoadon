-- ==============================================
-- MIGRATION: Tich hop SePay Webhook - Giao dich ngan hang tu dong
-- Ngay tao: 2026-06-20
-- ==============================================

-- --------------------------------------------------
-- 1. DON DEP CAC BANG CASSO CU
-- --------------------------------------------------
DROP TABLE IF EXISTS public.casso_transactions;
DROP TABLE IF EXISTS public.casso_connections;

-- --------------------------------------------------
-- 2. BANG LIEN KET TAI KHOAN NGAN HANG SEPAY (sepay_accounts)
--    Anh xa so tai khoan ngan hang thuc te voi owner_id (Firebase UID)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sepay_accounts (
    id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    owner_id      text NOT NULL,                 -- Firebase UID cua nguoi dung
    bank_name     text NOT NULL,                 -- Ten ngan hang (vi du: Vietcombank, MBBank)
    account_number text NOT NULL UNIQUE,         -- So tai khoan ngan hang nhan tien (UNIQUE)
    created_at    timestamptz DEFAULT now() NOT NULL
);

-- --------------------------------------------------
-- 3. BANG LICH SU GIAO DICH SEPAY (tb_transactions)
--    Luu tru giao dich tu Webhook SePay (id bang kieu text an toan)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tb_transactions (
    id                  text PRIMARY KEY,           -- ID giao dich tu SePay (tranh dung int de phong tran so)
    owner_id            text,                       -- Firebase UID (khoa ngoai, cho phep NULL luc test/local)
    gateway             text NOT NULL,              -- Ten ngan hang gateway nhan (VCB, MB...)
    transaction_date    timestamptz NOT NULL,       -- Thoi gian phat sinh giao dich
    account_number      text NOT NULL,              -- So tai khoan nhan tien
    sub_account         text,                       -- Tai khoan ao / tai khoan dinh danh (neu co)
    amount_in           numeric NOT NULL DEFAULT 0, -- So tien ghi co (tien vao)
    amount_out          numeric NOT NULL DEFAULT 0, -- So tien ghi no (tien ra)
    accumulated         numeric NOT NULL DEFAULT 0, -- So du account sau giao dich
    code                text,                       -- Ma code thanh toan tu dong duoc SePay tach
    content             text NOT NULL,              -- Noi dung chuyen khoan goc day du
    reference_number    text NOT NULL,              -- Ma tham chieu doc nhat tu ngan hang
    body                text,                       -- Mo ta/Ghi chu chi tiet tu payload
    -- Thong tin doi soat hoa don
    matched_invoice_id  text REFERENCES public.invoices(id) ON DELETE SET NULL,
    match_status        text DEFAULT 'unmatched',   -- Trang thai doi soat: 'matched' | 'unmatched'
    created_at          timestamptz DEFAULT now() NOT NULL
);

-- --------------------------------------------------
-- 4. KICH HOAT ROW LEVEL SECURITY (RLS)
-- --------------------------------------------------
ALTER TABLE public.sepay_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_transactions ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------
-- 5. RLS POLICIES (Bao mat nguoi dung chi thay du lieu cua minh)
-- --------------------------------------------------

-- Policy cho sepay_accounts
DROP POLICY IF EXISTS "Users can manage their own sepay_accounts" ON public.sepay_accounts;
CREATE POLICY "Users can manage their own sepay_accounts"
ON public.sepay_accounts FOR ALL TO public
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

-- Policy cho tb_transactions
DROP POLICY IF EXISTS "Users can manage their own tb_transactions" ON public.tb_transactions;
CREATE POLICY "Users can manage their own tb_transactions"
ON public.tb_transactions FOR ALL TO public
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
-- 6. TAO INDEX TANG TOC TRUY VAN
-- --------------------------------------------------
CREATE INDEX IF NOT EXISTS sepay_accounts_owner_idx
    ON public.sepay_accounts(owner_id);

CREATE INDEX IF NOT EXISTS sepay_accounts_acc_num_idx
    ON public.sepay_accounts(account_number);

CREATE INDEX IF NOT EXISTS tb_transactions_owner_idx
    ON public.tb_transactions(owner_id);

CREATE INDEX IF NOT EXISTS tb_transactions_acc_num_idx
    ON public.tb_transactions(account_number);

CREATE INDEX IF NOT EXISTS tb_transactions_date_idx
    ON public.tb_transactions(transaction_date DESC);

CREATE INDEX IF NOT EXISTS tb_transactions_code_idx
    ON public.tb_transactions(code);
