-- ==========================================
-- SUPABASE SCHEMA INITIALIZATION FOR DOCUFORGE
-- ==========================================

-- Bật extension pgcrypto để tạo ID ngẫu nhiên nếu cần
create extension if not exists "pgcrypto";

-- Migration: Add note and is_adjustment columns to invoices table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'note') THEN
        ALTER TABLE public.invoices ADD COLUMN note text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'is_adjustment') THEN
        ALTER TABLE public.invoices ADD COLUMN is_adjustment boolean DEFAULT false;
    END IF;
END $$;

-- 1. BẢNG ĐỐI TÁC (partners)
create table if not exists public.partners (
    id text primary key default gen_random_uuid()::text,
    name text not null,
    tax_code text not null,
    address text not null,
    address_post_merger text,
    account_number text,
    bank_name text,
    representative text,
    position text,
    gender text,
    owner_id text not null, -- ID người dùng (hỗ trợ cả Firebase UID dạng chuỗi và Supabase UUID)
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. BẢNG HÓA ĐƠN (invoices)
create table if not exists public.invoices (
    id text primary key default gen_random_uuid()::text,
    file_name text not null,
    file_type text not null, -- 'pdf' | 'xml'
    status text not null,    -- 'pending' | 'processing' | 'completed' | 'error'
    contract_number text,
    contract_date text,
    seller_name text,
    buyer_name text,
    seller_tax_code text,
    buyer_tax_code text,
    type text,
    category text,
    total_amount numeric,
    extracted_data jsonb,   -- Dữ liệu trích xuất dạng JSON linh hoạt
    line_items jsonb,       -- Danh sách mặt hàng chi tiết dạng mảng JSON
    owner_id text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. BẢNG BIÊN BẢN ĐÃ TẠO (generated_docs)
create table if not exists public.generated_docs (
    id text primary key default gen_random_uuid()::text,
    invoice_id text references public.invoices(id) on delete cascade,
    template_type text not null,
    file_name text not null,
    download_url text,
    owner_id text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. BẢNG HỢP ĐỒNG THÔNG MINH (contracts)
create table if not exists public.contracts (
    id text primary key default gen_random_uuid()::text,
    template_id text not null,
    party_a_id text references public.partners(id) on delete set null,
    party_b_id text references public.partners(id) on delete set null,
    form_data jsonb not null,
    file_name text not null,
    owner_id text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tự động cập nhật cột updatedAt bằng Trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql
set search_path = public;

create trigger update_partners_updated_at before update on public.partners for each row execute procedure update_updated_at_column();
create trigger update_invoices_updated_at before update on public.invoices for each row execute procedure update_updated_at_column();
create trigger update_generated_docs_updated_at before update on public.generated_docs for each row execute procedure update_updated_at_column();
create trigger update_contracts_updated_at before update on public.contracts for each row execute procedure update_updated_at_column();

-- 1. Hàm helper lấy custom user id an toàn tuyệt đối
CREATE OR REPLACE FUNCTION public.get_custom_user_id()
RETURNS text AS $$
DECLARE
  headers_text text;
BEGIN
  SELECT current_setting('request.headers', true) INTO headers_text;
  IF headers_text IS NOT NULL AND headers_text <> '' THEN
    RETURN (headers_text::json ->> 'x-custom-user-id');
  END IF;
  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = public;

-- ==========================================
-- BẢO MẬT HÀNG CƠ SỞ DỮ LIỆU (Row-Level Security - RLS)
-- ==========================================

-- Kích hoạt RLS cho tất cả các bảng
alter table public.partners enable row level security;
alter table public.invoices enable row level security;
alter table public.generated_docs enable row level security;
alter table public.contracts enable row level security;

-- Chính sách cho bảng partners
CREATE POLICY "Users can manage their own partners"
ON public.partners FOR ALL
TO public
USING (
  COALESCE(
    (SELECT public.get_custom_user_id()),
    (SELECT auth.uid())::text
  ) = owner_id
)
WITH CHECK (
  COALESCE(
    (SELECT public.get_custom_user_id()),
    (SELECT auth.uid())::text
  ) = owner_id
);

-- Chính sách cho bảng invoices
CREATE POLICY "Users can manage their own invoices"
ON public.invoices FOR ALL
TO public
USING (
  COALESCE(
    (SELECT public.get_custom_user_id()),
    (SELECT auth.uid())::text
  ) = owner_id
)
WITH CHECK (
  COALESCE(
    (SELECT public.get_custom_user_id()),
    (SELECT auth.uid())::text
  ) = owner_id
);

-- Chính sách cho bảng generated_docs
CREATE POLICY "Users can manage their own generated_docs"
ON public.generated_docs FOR ALL
TO public
USING (
  COALESCE(
    (SELECT public.get_custom_user_id()),
    (SELECT auth.uid())::text
  ) = owner_id
)
WITH CHECK (
  COALESCE(
    (SELECT public.get_custom_user_id()),
    (SELECT auth.uid())::text
  ) = owner_id
);

-- Chính sách cho bảng contracts
CREATE POLICY "Users can manage their own contracts"
ON public.contracts FOR ALL
TO public
USING (
  COALESCE(
    (SELECT public.get_custom_user_id()),
    (SELECT auth.uid())::text
  ) = owner_id
)
WITH CHECK (
  COALESCE(
    (SELECT public.get_custom_user_id()),
    (SELECT auth.uid())::text
  ) = owner_id
);

-- ==========================================
-- KHỞI TẠO STORAGE BUCKETS VÀ RLS CHO STORAGE
-- ==========================================

-- Tạo các bucket lưu trữ (Invoices và Generated Docs)
insert into storage.buckets (id, name, public) 
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) 
values ('generated_docs', 'generated_docs', false)
on conflict (id) do nothing;

-- RLS cho Buckets Storage: Người dùng chỉ có quyền quản lý file trong thư mục mang ID của họ (owner_id)
create policy "Users can access their own storage folder in invoices"
on storage.objects for all
using (bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can access their own storage folder in generated_docs"
on storage.objects for all
using (bucket_id = 'generated_docs' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'generated_docs' and (storage.foldername(name))[1] = auth.uid()::text);

-- ==========================================
-- CHỈ MỤC BAO PHỦ KHÓA NGOẠI (Foreign Key Covering Indexes)
-- ==========================================
create index if not exists contracts_party_a_id_idx on public.contracts(party_a_id);
create index if not exists contracts_party_b_id_idx on public.contracts(party_b_id);
create index if not exists generated_docs_invoice_id_idx on public.generated_docs(invoice_id);
