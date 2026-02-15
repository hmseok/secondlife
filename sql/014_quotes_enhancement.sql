-- =============================================
-- 014: quotes 테이블 확장 (견적서 v2)
-- =============================================

-- 기존 컬럼 확인 후 추가
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS margin NUMERIC DEFAULT 0;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS quote_detail JSONB;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS rental_type TEXT DEFAULT '월렌트';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- 검증
SELECT
  (SELECT count(*) FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'margin') AS has_margin,
  (SELECT count(*) FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'quote_detail') AS has_quote_detail,
  (SELECT count(*) FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'rental_type') AS has_rental_type,
  (SELECT count(*) FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'customer_name') AS has_customer_name;
