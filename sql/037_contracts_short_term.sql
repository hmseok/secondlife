-- ============================================
-- 037: contracts 테이블에 단기 계약 지원 컬럼 추가
-- short_term 계약 유형 + 일일요금 + 단기견적 연동
-- ============================================

-- 단기 계약 관련 컬럼
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS term_months INTEGER;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS daily_rate NUMERIC DEFAULT 0;        -- 단기: 일일 요금
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;      -- 총 계약금액
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS short_term_quote_id UUID;            -- 단기견적 연동
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS dispatch_type TEXT DEFAULT 'long_term'  -- 배차 유형
  CHECK (dispatch_type IN ('long_term', 'short_term', 'replacement'));
