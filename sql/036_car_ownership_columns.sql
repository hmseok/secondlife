-- ============================================
-- 036: 차량 소유 구분 및 지입 관리 컬럼 추가
-- 자사/지입/임차 차량 구분 + 지입주 정보 + 계약서 첨부
-- ============================================

-- 소유 구분: company(자사), consignment(지입), leased_in(임차)
ALTER TABLE cars ADD COLUMN IF NOT EXISTS ownership_type TEXT DEFAULT 'company'
  CHECK (ownership_type IN ('company', 'consignment', 'leased_in'));

-- 지입주(실소유자) 정보
ALTER TABLE cars ADD COLUMN IF NOT EXISTS owner_name TEXT;           -- 지입주 이름
ALTER TABLE cars ADD COLUMN IF NOT EXISTS owner_phone TEXT;          -- 지입주 연락처
ALTER TABLE cars ADD COLUMN IF NOT EXISTS owner_bank TEXT;           -- 정산 은행명
ALTER TABLE cars ADD COLUMN IF NOT EXISTS owner_account TEXT;        -- 정산 계좌번호
ALTER TABLE cars ADD COLUMN IF NOT EXISTS owner_account_holder TEXT; -- 예금주

-- 지입 계약 조건
ALTER TABLE cars ADD COLUMN IF NOT EXISTS consignment_fee NUMERIC DEFAULT 0;  -- 월 지입료
ALTER TABLE cars ADD COLUMN IF NOT EXISTS consignment_start DATE;             -- 지입 계약 시작일
ALTER TABLE cars ADD COLUMN IF NOT EXISTS consignment_end DATE;               -- 지입 계약 종료일
ALTER TABLE cars ADD COLUMN IF NOT EXISTS insurance_by TEXT DEFAULT 'company'  -- 보험 주체
  CHECK (insurance_by IN ('company', 'owner'));

-- 계약서 첨부
ALTER TABLE cars ADD COLUMN IF NOT EXISTS consignment_contract_url TEXT;  -- 지입 계약서 PDF URL
ALTER TABLE cars ADD COLUMN IF NOT EXISTS owner_memo TEXT;               -- 지입 관련 메모/특약
