-- =========================================================================
-- DATABASE STORAGE MONITORING RPCs FOR DOCUFORGE
-- =========================================================================

-- 1. RPC lấy tổng dung lượng database và phần trăm sử dụng so với 500MB
CREATE OR REPLACE FUNCTION public.get_supabase_usage()
RETURNS TABLE (
  total_bytes bigint,
  total_mb numeric,
  usage_percentage numeric
) AS $$
DECLARE
  db_size bigint;
  limit_mb numeric := 500.00;
  db_size_mb numeric;
BEGIN
  -- Lấy tổng dung lượng database bằng bytes
  SELECT pg_database_size(current_database()) INTO db_size;
  
  -- Quy đổi sang MB
  db_size_mb := round((db_size::numeric / 1024 / 1024), 2);
  
  RETURN QUERY 
  SELECT 
    db_size,
    db_size_mb,
    round(((db_size_mb / limit_mb) * 100), 2);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public;

-- 2. RPC lấy chi tiết dung lượng lưu trữ của từng bảng trong schema public
CREATE OR REPLACE FUNCTION public.get_table_storage_details()
RETURNS TABLE (
  table_name text,
  estimated_rows bigint,
  data_size_mb numeric,
  index_size_mb numeric,
  total_size_mb numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.relname::text AS table_name,
    CASE WHEN t.reltuples < 0 THEN 0 ELSE t.reltuples::bigint END AS estimated_rows,
    round((pg_relation_size(t.oid)::numeric / 1024 / 1024), 2) AS data_size_mb,
    round((pg_indexes_size(t.oid)::numeric / 1024 / 1024), 2) AS index_size_mb,
    round((pg_total_relation_size(t.oid)::numeric / 1024 / 1024), 2) AS total_size_mb
  FROM 
    pg_class t
  JOIN 
    pg_namespace n ON n.oid = t.relnamespace
  WHERE 
    n.nspname = 'public' 
    AND t.relkind = 'r'
  ORDER BY 
    pg_total_relation_size(t.oid) DESC;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public;
