-- ==========================================
-- MODULE: QUẢN LÝ VĂN BẢN VÀ HỒ SƠ LƯU TRỮ
-- ==========================================

-- 1. BẢNG VĂN BẢN ĐẾN (incoming_documents)
CREATE TABLE IF NOT EXISTS public.incoming_documents (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    incoming_number text NOT NULL,
    document_number text,
    received_date date NOT NULL,
    issue_date date,
    sender text NOT NULL,
    signer text,
    summary text,
    field text,
    security_level text DEFAULT 'normal',
    urgency_level text DEFAULT 'normal',
    note text,
    file_id text,
    storage_path text,
    storage_provider text,
    owner_id text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. BẢNG VĂN BẢN ĐI (outgoing_documents)
CREATE TABLE IF NOT EXISTS public.outgoing_documents (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    outgoing_number text NOT NULL,
    document_number text,
    issue_date date NOT NULL,
    receiver text NOT NULL,
    signer text,
    summary text,
    field text,
    security_level text DEFAULT 'normal',
    urgency_level text DEFAULT 'normal',
    note text,
    file_id text,
    storage_path text,
    storage_provider text,
    owner_id text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. BẢNG HỒ SƠ LƯU TRỮ (archives)
CREATE TABLE IF NOT EXISTS public.archives (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    archive_code text NOT NULL UNIQUE,
    archive_name text NOT NULL,
    field text,
    year integer,
    description text,
    owner_id text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. BẢNG LIÊN KẾT HỒ SƠ - VĂN BẢN (archive_documents)
CREATE TABLE IF NOT EXISTS public.archive_documents (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    archive_id text REFERENCES public.archives(id) ON DELETE CASCADE,
    document_type text NOT NULL CHECK (document_type IN ('incoming', 'outgoing')),
    document_id text NOT NULL,
    owner_id text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(archive_id, document_type, document_id)
);

-- Tự động cập nhật cột updated_at cho các bảng mới
CREATE TRIGGER update_incoming_documents_updated_at
    BEFORE UPDATE ON public.incoming_documents
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_outgoing_documents_updated_at
    BEFORE UPDATE ON public.outgoing_documents
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_archives_updated_at
    BEFORE UPDATE ON public.archives
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Kích hoạt RLS cho các bảng mới
ALTER TABLE public.incoming_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outgoing_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archive_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policy cho incoming_documents
CREATE POLICY "Users can manage their own incoming_documents"
ON public.incoming_documents FOR ALL
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

-- RLS Policy cho outgoing_documents
CREATE POLICY "Users can manage their own outgoing_documents"
ON public.outgoing_documents FOR ALL
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

-- RLS Policy cho archives
CREATE POLICY "Users can manage their own archives"
ON public.archives FOR ALL
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

-- RLS Policy cho archive_documents
CREATE POLICY "Users can manage their own archive_documents"
ON public.archive_documents FOR ALL
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
-- INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS incoming_documents_incoming_number_idx ON public.incoming_documents(incoming_number);
CREATE INDEX IF NOT EXISTS incoming_documents_received_date_idx ON public.incoming_documents(received_date);
CREATE INDEX IF NOT EXISTS incoming_documents_field_idx ON public.incoming_documents(field);
CREATE INDEX IF NOT EXISTS incoming_documents_sender_idx ON public.incoming_documents(sender);

CREATE INDEX IF NOT EXISTS outgoing_documents_outgoing_number_idx ON public.outgoing_documents(outgoing_number);
CREATE INDEX IF NOT EXISTS outgoing_documents_issue_date_idx ON public.outgoing_documents(issue_date);
CREATE INDEX IF NOT EXISTS outgoing_documents_field_idx ON public.outgoing_documents(field);
CREATE INDEX IF NOT EXISTS outgoing_documents_receiver_idx ON public.outgoing_documents(receiver);

CREATE INDEX IF NOT EXISTS archives_archive_code_idx ON public.archives(archive_code);
CREATE INDEX IF NOT EXISTS archives_year_idx ON public.archives(year);
CREATE INDEX IF NOT EXISTS archives_field_idx ON public.archives(field);

CREATE INDEX IF NOT EXISTS archive_documents_archive_id_idx ON public.archive_documents(archive_id);
CREATE INDEX IF NOT EXISTS archive_documents_document_type_idx ON public.archive_documents(document_type);

-- ==========================================
-- COMMENTS
-- ==========================================

COMMENT ON TABLE public.incoming_documents IS 'Văn bản đến';
COMMENT ON TABLE public.outgoing_documents IS 'Văn bản đi';
COMMENT ON TABLE public.archives IS 'Hồ sơ lưu trữ';
COMMENT ON TABLE public.archive_documents IS 'Liên kết hồ sơ với văn bản';

COMMENT ON COLUMN public.incoming_documents.security_level IS 'normal | internal | confidential | secret';
COMMENT ON COLUMN public.incoming_documents.urgency_level IS 'normal | urgent | very_urgent';
COMMENT ON COLUMN public.outgoing_documents.security_level IS 'normal | internal | confidential | secret';
COMMENT ON COLUMN public.outgoing_documents.urgency_level IS 'normal | urgent | very_urgent';
COMMENT ON COLUMN public.archive_documents.document_type IS 'incoming | outgoing';
