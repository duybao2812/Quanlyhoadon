-- ==========================================
-- UPDATE: Thêm cột document_type vào bảng contracts
-- Để phân loại: Văn bản đến, Văn bản đi, Hợp đồng
-- ==========================================

-- Thêm cột document_type (chỉ nếu chưa tồn tại)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contracts' AND column_name = 'document_type'
  ) THEN
    ALTER TABLE public.contracts ADD COLUMN document_type text DEFAULT 'contract';
  END IF;
END $$;

-- Cập nhật các hợp đồng hiện có dựa trên templateId
UPDATE public.contracts 
SET document_type = 'contract'
WHERE document_type IS NULL OR document_type = '';

-- Tạo index để tăng tốc truy vấn theo document_type
CREATE INDEX IF NOT EXISTS idx_contracts_document_type ON public.contracts(document_type);

-- Bổ sung comment cho cột
COMMENT ON COLUMN public.contracts.document_type IS 'Phân loại: incoming (Văn bản đến), outgoing (Văn bản đi), contract (Hợp đồng)';
