-- ================================================
-- 006: 렌트가 산출 빌더를 위한 테이블 및 설정
-- Self-Disruption ERP
-- ================================================

-- 1. 비즈니스 규칙 추가 (기존 business_rules 테이블에 데이터 추가)
-- ※ 이미 존재하면 무시
INSERT INTO business_rules (key, value) VALUES
  ('LOAN_INTEREST_RATE', 4.5),           -- 대출 이자율 (연 %)
  ('INVESTMENT_RETURN_RATE', 6.0),       -- 투자 수익률 / 기회비용 (연 %)
  ('MONTHLY_MAINTENANCE_BASE', 50000),   -- 기본 월 정비예비비 (원)
  ('DEDUCTIBLE_AMOUNT', 500000),         -- 사고 자기부담금/면책금 (원)
  ('RISK_RESERVE_RATE', 0.5),            -- 월 사고위험 적립률 (차량가의 %)
  ('DEPOSIT_DISCOUNT_RATE', 0.4),        -- 보증금 월 할인률 (보증금의 %)
  ('PREPAYMENT_DISCOUNT_RATE', 0.5),     -- 선납금 월 할인률 (%)
  ('DEP_YEAR_1', 15),                    -- 1년차 감가율 (%)
  ('DEP_YEAR_2PLUS', 8),                 -- 2년차~ 연간 감가율 (%)
  ('CAR_TAX_RATE', 2.0),                 -- 자동차세율 (배기량 기준 %)
  ('INSURANCE_LOADING', 10)              -- 보험 할증률 (%)
ON CONFLICT (key) DO NOTHING;

-- 2. 시장 비교 테이블 (시중 동일유형 렌트가 비교)
CREATE TABLE IF NOT EXISTS market_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  car_id UUID REFERENCES cars(id) ON DELETE CASCADE,
  competitor_name TEXT NOT NULL,
  vehicle_info TEXT,              -- 비교 차량 정보 (예: "2024 그랜저 IG")
  monthly_rent NUMERIC NOT NULL DEFAULT 0,
  deposit NUMERIC DEFAULT 0,
  term_months INT DEFAULT 36,
  source TEXT,                    -- 출처 (예: "SKR", "롯데렌터카")
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 가격 산출 워크시트 (차량별 렌트가 분석 저장)
CREATE TABLE IF NOT EXISTS pricing_worksheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  car_id UUID REFERENCES cars(id) ON DELETE CASCADE,

  -- 가격 정보
  factory_price NUMERIC DEFAULT 0,         -- 출고가 (신차가)
  purchase_price NUMERIC DEFAULT 0,        -- 매입가
  current_market_value NUMERIC DEFAULT 0,  -- 현재 시세

  -- 감가 분석
  total_depreciation_rate NUMERIC DEFAULT 0,  -- 총 감가율 (%)
  monthly_depreciation NUMERIC DEFAULT 0,     -- 월 감가비용

  -- 금융비용
  loan_amount NUMERIC DEFAULT 0,           -- 대출 원금
  loan_interest_rate NUMERIC DEFAULT 0,    -- 대출 이자율
  monthly_loan_interest NUMERIC DEFAULT 0, -- 월 이자비용
  equity_amount NUMERIC DEFAULT 0,         -- 자기자본
  investment_rate NUMERIC DEFAULT 0,       -- 기회비용률
  monthly_opportunity_cost NUMERIC DEFAULT 0, -- 월 기회비용

  -- 운영비용
  monthly_insurance NUMERIC DEFAULT 0,     -- 월 보험료
  monthly_maintenance NUMERIC DEFAULT 0,   -- 월 정비비
  monthly_tax NUMERIC DEFAULT 0,           -- 월 세금

  -- 리스크
  deductible NUMERIC DEFAULT 0,            -- 면책금
  monthly_risk_reserve NUMERIC DEFAULT 0,  -- 월 리스크 적립

  -- 보증금/선납금
  deposit_amount NUMERIC DEFAULT 0,        -- 보증금
  prepayment_amount NUMERIC DEFAULT 0,     -- 선납금
  monthly_deposit_discount NUMERIC DEFAULT 0, -- 보증금 할인
  monthly_prepayment_discount NUMERIC DEFAULT 0, -- 선납금 할인

  -- 최종 산출
  total_monthly_cost NUMERIC DEFAULT 0,    -- 총 월 원가
  target_margin NUMERIC DEFAULT 0,         -- 목표 마진
  suggested_rent NUMERIC DEFAULT 0,        -- 추천 렌트가 (VAT 별도)

  -- 시장 비교
  market_avg_rent NUMERIC DEFAULT 0,       -- 시장 평균가
  market_position TEXT DEFAULT 'average',  -- 시장 포지션 (low/average/high/premium)

  -- 메타
  term_months INT DEFAULT 36,
  status TEXT DEFAULT 'draft',             -- draft, confirmed, archived
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(company_id, car_id)
);

-- 4. RLS 정책
ALTER TABLE market_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_worksheets ENABLE ROW LEVEL SECURITY;

-- market_comparisons RLS
CREATE POLICY "market_comparisons_select" ON market_comparisons
  FOR SELECT USING (
    company_id = get_my_company_id()
    OR is_platform_admin()
  );
CREATE POLICY "market_comparisons_insert" ON market_comparisons
  FOR INSERT WITH CHECK (
    company_id = get_my_company_id()
    OR is_platform_admin()
  );
CREATE POLICY "market_comparisons_update" ON market_comparisons
  FOR UPDATE USING (
    company_id = get_my_company_id()
    OR is_platform_admin()
  );
CREATE POLICY "market_comparisons_delete" ON market_comparisons
  FOR DELETE USING (
    company_id = get_my_company_id()
    OR is_platform_admin()
  );

-- pricing_worksheets RLS
CREATE POLICY "pricing_worksheets_select" ON pricing_worksheets
  FOR SELECT USING (
    company_id = get_my_company_id()
    OR is_platform_admin()
  );
CREATE POLICY "pricing_worksheets_insert" ON pricing_worksheets
  FOR INSERT WITH CHECK (
    company_id = get_my_company_id()
    OR is_platform_admin()
  );
CREATE POLICY "pricing_worksheets_update" ON pricing_worksheets
  FOR UPDATE USING (
    company_id = get_my_company_id()
    OR is_platform_admin()
  );
CREATE POLICY "pricing_worksheets_delete" ON pricing_worksheets
  FOR DELETE USING (
    company_id = get_my_company_id()
    OR is_platform_admin()
  );

-- 5. cars 테이블에 factory_price 컬럼 추가 (없으면)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cars' AND column_name = 'factory_price'
  ) THEN
    ALTER TABLE cars ADD COLUMN factory_price NUMERIC DEFAULT 0;
  END IF;

  -- 배기량 컬럼 추가 (세금 계산용)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cars' AND column_name = 'engine_cc'
  ) THEN
    ALTER TABLE cars ADD COLUMN engine_cc INT DEFAULT 0;
  END IF;
END
$$;
