-- ==========================================
-- SUPABASE SCHEMA INITIALIZATION FOR DOCUFORGE
-- ==========================================

-- Bật extension pgcrypto để tạo ID ngẫu nhiên nếu cần
create extension if not exists "pgcrypto";

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
$$ language plpgsql;

create trigger update_partners_updated_at before update on public.partners for each row execute procedure update_updated_at_column();
create trigger update_invoices_updated_at before update on public.invoices for each row execute procedure update_updated_at_column();
create trigger update_generated_docs_updated_at before update on public.generated_docs for each row execute procedure update_updated_at_column();
create trigger update_contracts_updated_at before update on public.contracts for each row execute procedure update_updated_at_column();

-- ==========================================
-- BẢO MẬT HÀNG CƠ SỞ DỮ LIỆU (Row-Level Security - RLS)
-- ==========================================

-- Kích hoạt RLS cho tất cả các bảng
alter table public.partners enable row level security;
alter table public.invoices enable row level security;
alter table public.generated_docs enable row level security;
alter table public.contracts enable row level security;

-- Chính sách cho bảng partners
create policy "Users can perform all operations on their own partners"
on public.partners for all
using (auth.uid()::text = owner_id)
with check (auth.uid()::text = owner_id);

-- Chính sách cho bảng invoices
create policy "Users can perform all operations on their own invoices"
on public.invoices for all
using (auth.uid()::text = owner_id)
with check (auth.uid()::text = owner_id);

-- Chính sách cho bảng generated_docs
create policy "Users can perform all operations on their own generated_docs"
on public.generated_docs for all
using (auth.uid()::text = owner_id)
with check (auth.uid()::text = owner_id);

-- Chính sách cho bảng contracts
create policy "Users can perform all operations on their own contracts"
on public.contracts for all
using (auth.uid()::text = owner_id)
with check (auth.uid()::text = owner_id);

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
