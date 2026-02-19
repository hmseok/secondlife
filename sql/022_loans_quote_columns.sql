-- 022: 대출 견적서 상세 컬럼 추가
-- 할부 견적서(수입차/국산차) 필드를 loans 테이블에 반영

-- 견적 헤더
ALTER TABLE loans ADD COLUMN IF NOT EXISTS quote_number text;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS quote_date date;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS valid_date date;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS dealer_name text;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS dealer_location text;

-- 차량 정보 (견적서)
ALTER TABLE loans ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS sale_price numeric DEFAULT 0;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS option_amount numeric DEFAULT 0;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS displacement text;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS fuel_type text;

-- 견적 조건
ALTER TABLE loans ADD COLUMN IF NOT EXISTS advance_rate numeric DEFAULT 0;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS grace_rate numeric DEFAULT 0;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS grace_amount numeric DEFAULT 0;

-- 세금 및 부대비용
ALTER TABLE loans ADD COLUMN IF NOT EXISTS bond_cost numeric DEFAULT 0;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS misc_fees numeric DEFAULT 0;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS stamp_duty numeric DEFAULT 0;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS customer_initial_payment numeric DEFAULT 0;
