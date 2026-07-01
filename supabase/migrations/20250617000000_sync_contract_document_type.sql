-- ==========================================
-- Đồng bộ document_type cho bảng contracts
-- dựa trên liên kết với incoming_documents/outgoing_documents
-- ==========================================

-- Đảm bảo cột contract_id tồn tại trước khi dùng
ALTER TABLE public.incoming_documents
ADD COLUMN IF NOT EXISTS contract_id text REFERENCES public.contracts(id) ON DELETE SET NULL;

ALTER TABLE public.outgoing_documents
ADD COLUMN IF NOT EXISTS contract_id text REFERENCES public.contracts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS incoming_documents_contract_id_idx ON public.incoming_documents(contract_id);
CREATE INDEX IF NOT EXISTS outgoing_documents_contract_id_idx ON public.outgoing_documents(contract_id);

UPDATE public.contracts
SET document_type = 'incoming'
WHERE id IN (
  SELECT DISTINCT contract_id
  FROM public.incoming_documents
  WHERE contract_id IS NOT NULL
)
AND (document_type IS NULL OR document_type = '' OR document_type = 'contract');

UPDATE public.contracts
SET document_type = 'outgoing'
WHERE id IN (
  SELECT DISTINCT contract_id
  FROM public.outgoing_documents
  WHERE contract_id IS NOT NULL
)
AND (document_type IS NULL OR document_type = '' OR document_type = 'contract');

CREATE INDEX IF NOT EXISTS idx_contracts_document_type_incoming ON public.contracts(document_type) WHERE document_type = 'incoming';
CREATE INDEX IF NOT EXISTS idx_contracts_document_type_outgoing ON public.contracts(document_type) WHERE document_type = 'outgoing';
