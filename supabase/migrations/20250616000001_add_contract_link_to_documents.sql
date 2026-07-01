-- ==========================================
-- THÊM LIÊN KẾT CONTRACT VỚI DOCUMENTS
-- ==========================================

-- Thêm cột contract_id vào bảng văn bản đến
ALTER TABLE public.incoming_documents 
ADD COLUMN IF NOT EXISTS contract_id text REFERENCES public.contracts(id) ON DELETE SET NULL;

-- Thêm cột contract_id vào bảng văn bản đi
ALTER TABLE public.outgoing_documents 
ADD COLUMN IF NOT EXISTS contract_id text REFERENCES public.contracts(id) ON DELETE SET NULL;

-- Tạo index cho contract_id để tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS incoming_documents_contract_id_idx ON public.incoming_documents(contract_id);
CREATE INDEX IF NOT EXISTS outgoing_documents_contract_id_idx ON public.outgoing_documents(contract_id);

-- Comment
COMMENT ON COLUMN public.incoming_documents.contract_id IS 'Liên kết đến hợp đồng gốc (nếu có)';
COMMENT ON COLUMN public.outgoing_documents.contract_id IS 'Liên kết đến hợp đồng gốc (nếu có)';
