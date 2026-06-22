-- ==============================================
-- MIGRATION: Bank Email Agent Integration - Bank Accounts & Transactions
-- Ngay tao: 2026-06-21
-- ==============================================

-- --------------------------------------------------
-- 1. BANG LIEN KET TAI KHOAN NGAN HANG (bank_accounts)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    owner_id      text NOT NULL,                 -- Firebase UID cua nguoi dung
    bank_code     text NOT NULL,                 -- ACB, VCB, BIDV...
    account_number text NOT NULL,                -- So tai khoan ngan hang
    account_name  text NOT NULL,                 -- Ten chu tai khoan
    email_account text NOT NULL,                 -- Email dung de dong bo
    is_active     boolean DEFAULT true NOT NULL, -- Trang thai hoat dong
    created_at    timestamptz DEFAULT now() NOT NULL,
    updated_at    timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT bank_accounts_owner_acc_unique UNIQUE (owner_id, bank_code, account_number)
);

-- --------------------------------------------------
-- 2. BANG LICH SU GIAO DICH NGAN HANG TU EMAIL (bank_transactions)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bank_transactions (
    id                  text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    owner_id            text NOT NULL,              -- Firebase UID
    bank_account_id     text REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
    bank_code           text NOT NULL,              -- ACB, VCB...
    account_number      text NOT NULL,              -- So tai khoan
    transaction_date    timestamptz NOT NULL,       -- Thoi gian phat sinh giao dich
    amount              numeric NOT NULL DEFAULT 0,  -- So tien giao dich
    transaction_type    text NOT NULL,              -- CREDIT hoac DEBIT
    balance             numeric NOT NULL DEFAULT 0,  -- So du sau giao dich
    description         text NOT NULL,              -- Noi dung giao dich
    gmail_message_id    text NOT NULL,              -- ID cua email (de-duplicate)
    email_uid           bigint,                     -- UID cua email trong hop thu IMAP
    imported_at         timestamptz DEFAULT now() NOT NULL,
    created_at          timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT bank_transactions_gmail_msg_unique UNIQUE (gmail_message_id)
);

-- --------------------------------------------------
-- 3. INDEX UNIQUE DEDUP THEO (account_number, email_uid) NEU CO UID
-- --------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS bank_tx_acc_uid_idx 
    ON public.bank_transactions (account_number, email_uid) 
    WHERE email_uid IS NOT NULL;

-- --------------------------------------------------
-- 4. KICH HOAT ROW LEVEL SECURITY (RLS)
-- --------------------------------------------------
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------
-- 5. RLS POLICIES (Bao mat theo owner_id)
-- --------------------------------------------------

-- Policy cho bank_accounts
DROP POLICY IF EXISTS "Users can manage their own bank_accounts" ON public.bank_accounts;
CREATE POLICY "Users can manage their own bank_accounts"
ON public.bank_accounts FOR ALL TO public
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

-- Policy cho bank_transactions
DROP POLICY IF EXISTS "Users can manage their own bank_transactions" ON public.bank_transactions;
CREATE POLICY "Users can manage their own bank_transactions"
ON public.bank_transactions FOR ALL TO public
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
CREATE INDEX IF NOT EXISTS bank_accounts_owner_idx ON public.bank_accounts(owner_id);
CREATE INDEX IF NOT EXISTS bank_accounts_num_idx ON public.bank_accounts(account_number);

CREATE INDEX IF NOT EXISTS bank_tx_owner_idx ON public.bank_transactions(owner_id);
CREATE INDEX IF NOT EXISTS bank_tx_acc_num_idx ON public.bank_transactions(account_number);
CREATE INDEX IF NOT EXISTS bank_tx_date_idx ON public.bank_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS bank_tx_msg_id_idx ON public.bank_transactions(gmail_message_id);
CREATE INDEX IF NOT EXISTS bank_tx_acc_id_idx ON public.bank_transactions(bank_account_id);
