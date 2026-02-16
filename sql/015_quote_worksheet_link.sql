-- =============================================
-- 015: quotes ↔ pricing_worksheets 연결
-- =============================================

-- quotes 테이블에 worksheet_id FK 추가 (pricing_worksheets.id는 UUID)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS worksheet_id UUID REFERENCES pricing_worksheets(id) ON DELETE SET NULL;

-- pricing_worksheets에도 quote_id 역참조 추가 (quotes.id는 BIGINT)
ALTER TABLE pricing_worksheets ADD COLUMN IF NOT EXISTS quote_id BIGINT REFERENCES quotes(id) ON DELETE SET NULL;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_quotes_worksheet_id ON quotes(worksheet_id);
CREATE INDEX IF NOT EXISTS idx_pricing_worksheets_quote_id ON pricing_worksheets(quote_id);

-- 검증
SELECT
  (SELECT count(*) FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'worksheet_id') AS has_worksheet_id,
  (SELECT count(*) FROM information_schema.columns WHERE table_name = 'pricing_worksheets' AND column_name = 'quote_id') AS has_quote_id;
