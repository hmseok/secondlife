-- ================================================================
-- Self-Disruption ERP: 통합 마이그레이션 (006 ~ 009)
-- ================================================================
-- 이 파일은 006, 007, 008, 009를 하나로 합친 것입니다.
-- Supabase SQL Editor에서 한 번에 실행하세요.
--
-- 수정사항:
--   - business_rules 등 누락 테이블 사전 생성 (CREATE TABLE IF NOT EXISTS)
--   - JSONB 컬럼에 to_jsonb() 캐스팅 적용
--   - 모든 CREATE POLICY를 IF NOT EXISTS 패턴으로 감싸서 중복 실행 안전
--   - ALTER TABLE ENABLE RLS는 여러 번 실행해도 안전
-- ================================================================


-- ================================================================
-- [PRE] 누락 테이블 사전 생성
-- ================================================================

CREATE TABLE IF NOT EXISTS business_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS common_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_code TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_code, code)
);

CREATE TABLE IF NOT EXISTS saved_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT,
  quote_data JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  car_id BIGINT,
  customer_id UUID,
  contract_type TEXT DEFAULT 'rent',
  status TEXT DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  monthly_rent NUMERIC DEFAULT 0,
  deposit NUMERIC DEFAULT 0,
  memo TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  contract_id UUID,
  due_date DATE,
  amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  product_type TEXT,
  interest_rate NUMERIC DEFAULT 0,
  max_amount NUMERIC DEFAULT 0,
  term_months INT DEFAULT 36,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);


-- [PRE-2] 기존 테이블에 company_id 컬럼이 없으면 추가
DO $$
DECLARE
  _tbl TEXT;
BEGIN
  FOREACH _tbl IN ARRAY ARRAY['saved_quotes','contracts','payment_schedules','financial_products']
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = _tbl AND table_schema = 'public') THEN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = _tbl AND column_name = 'company_id') THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE', _tbl);
      END IF;
    END IF;
  END LOOP;
END $$;


-- ================================================================
-- [006] 렌트가 산출 빌더 설정
-- ================================================================

-- 1. 비즈니스 규칙 데이터 (to_jsonb로 JSONB 캐스팅)
INSERT INTO business_rules (key, value) VALUES
  ('LOAN_INTEREST_RATE', to_jsonb(4.5)),
  ('INVESTMENT_RETURN_RATE', to_jsonb(6.0)),
  ('MONTHLY_MAINTENANCE_BASE', to_jsonb(50000)),
  ('DEDUCTIBLE_AMOUNT', to_jsonb(500000)),
  ('RISK_RESERVE_RATE', to_jsonb(0.5)),
  ('DEPOSIT_DISCOUNT_RATE', to_jsonb(0.4)),
  ('PREPAYMENT_DISCOUNT_RATE', to_jsonb(0.5)),
  ('DEP_YEAR_1', to_jsonb(15)),
  ('DEP_YEAR_2PLUS', to_jsonb(8)),
  ('CAR_TAX_RATE', to_jsonb(2.0)),
  ('INSURANCE_LOADING', to_jsonb(10))
ON CONFLICT (key) DO NOTHING;

-- 2. 시장 비교 테이블
CREATE TABLE IF NOT EXISTS market_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  car_id BIGINT REFERENCES cars(id) ON DELETE CASCADE,
  competitor_name TEXT NOT NULL,
  vehicle_info TEXT,
  monthly_rent NUMERIC NOT NULL DEFAULT 0,
  deposit NUMERIC DEFAULT 0,
  term_months INT DEFAULT 36,
  source TEXT,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 가격 산출 워크시트
CREATE TABLE IF NOT EXISTS pricing_worksheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  car_id BIGINT REFERENCES cars(id) ON DELETE CASCADE,
  factory_price NUMERIC DEFAULT 0,
  purchase_price NUMERIC DEFAULT 0,
  current_market_value NUMERIC DEFAULT 0,
  total_depreciation_rate NUMERIC DEFAULT 0,
  monthly_depreciation NUMERIC DEFAULT 0,
  loan_amount NUMERIC DEFAULT 0,
  loan_interest_rate NUMERIC DEFAULT 0,
  monthly_loan_interest NUMERIC DEFAULT 0,
  equity_amount NUMERIC DEFAULT 0,
  investment_rate NUMERIC DEFAULT 0,
  monthly_opportunity_cost NUMERIC DEFAULT 0,
  monthly_insurance NUMERIC DEFAULT 0,
  monthly_maintenance NUMERIC DEFAULT 0,
  monthly_tax NUMERIC DEFAULT 0,
  deductible NUMERIC DEFAULT 0,
  monthly_risk_reserve NUMERIC DEFAULT 0,
  deposit_amount NUMERIC DEFAULT 0,
  prepayment_amount NUMERIC DEFAULT 0,
  monthly_deposit_discount NUMERIC DEFAULT 0,
  monthly_prepayment_discount NUMERIC DEFAULT 0,
  total_monthly_cost NUMERIC DEFAULT 0,
  target_margin NUMERIC DEFAULT 0,
  suggested_rent NUMERIC DEFAULT 0,
  market_avg_rent NUMERIC DEFAULT 0,
  market_position TEXT DEFAULT 'average',
  term_months INT DEFAULT 36,
  status TEXT DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, car_id)
);

-- 4. 006 자체 RLS (market_comparisons, pricing_worksheets)
ALTER TABLE market_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_worksheets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- market_comparisons
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='market_comparisons' AND policyname='market_comparisons_select') THEN
    EXECUTE $p$CREATE POLICY "market_comparisons_select" ON market_comparisons FOR SELECT USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='market_comparisons' AND policyname='market_comparisons_insert') THEN
    EXECUTE $p$CREATE POLICY "market_comparisons_insert" ON market_comparisons FOR INSERT WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='market_comparisons' AND policyname='market_comparisons_update') THEN
    EXECUTE $p$CREATE POLICY "market_comparisons_update" ON market_comparisons FOR UPDATE USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='market_comparisons' AND policyname='market_comparisons_delete') THEN
    EXECUTE $p$CREATE POLICY "market_comparisons_delete" ON market_comparisons FOR DELETE USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;

  -- pricing_worksheets
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pricing_worksheets' AND policyname='pricing_worksheets_select') THEN
    EXECUTE $p$CREATE POLICY "pricing_worksheets_select" ON pricing_worksheets FOR SELECT USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pricing_worksheets' AND policyname='pricing_worksheets_insert') THEN
    EXECUTE $p$CREATE POLICY "pricing_worksheets_insert" ON pricing_worksheets FOR INSERT WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pricing_worksheets' AND policyname='pricing_worksheets_update') THEN
    EXECUTE $p$CREATE POLICY "pricing_worksheets_update" ON pricing_worksheets FOR UPDATE USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pricing_worksheets' AND policyname='pricing_worksheets_delete') THEN
    EXECUTE $p$CREATE POLICY "pricing_worksheets_delete" ON pricing_worksheets FOR DELETE USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
END $$;

-- 5. cars 테이블에 factory_price, engine_cc 컬럼 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cars' AND column_name = 'factory_price'
  ) THEN
    ALTER TABLE cars ADD COLUMN factory_price NUMERIC DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cars' AND column_name = 'engine_cc'
  ) THEN
    ALTER TABLE cars ADD COLUMN engine_cc INT DEFAULT 0;
  END IF;
END $$;


-- ================================================================
-- [007] 매출 회계 정산 모듈 등록
-- ================================================================

INSERT INTO system_modules (name, path, icon_key, description)
SELECT '매출/정산', '/finance/settlement', 'Chart', '매출 분석, 정산 현황, 손익계산서, 정산 실행'
WHERE NOT EXISTS (
  SELECT 1 FROM system_modules WHERE path = '/finance/settlement'
);

INSERT INTO company_modules (company_id, module_id, is_active)
SELECT cm.company_id, sm.id, true
FROM company_modules cm
JOIN system_modules sm_finance ON cm.module_id = sm_finance.id AND sm_finance.path = '/finance'
CROSS JOIN system_modules sm
WHERE sm.path = '/finance/settlement'
  AND cm.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM company_modules ex
    WHERE ex.company_id = cm.company_id AND ex.module_id = sm.id
  );


-- ================================================================
-- [008] 리포트/통계 모듈 등록
-- ================================================================

INSERT INTO system_modules (name, path, icon_key, description)
SELECT '리포트/통계', '/report', 'Chart', '종합 경영 리포트: 매출/비용 분석, 차량 운용, 투자/파트너 현황'
WHERE NOT EXISTS (
  SELECT 1 FROM system_modules WHERE path = '/report'
);

INSERT INTO company_modules (company_id, module_id, is_active)
SELECT cm.company_id, sm.id, true
FROM company_modules cm
JOIN system_modules sm_finance ON cm.module_id = sm_finance.id AND sm_finance.path = '/finance'
CROSS JOIN system_modules sm
WHERE sm.path = '/report'
  AND cm.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM company_modules ex
    WHERE ex.company_id = cm.company_id AND ex.module_id = sm.id
  );


-- ================================================================
-- [009] 전체 테이블 RLS 보안 정책
-- ================================================================
-- 패턴 A: 비즈니스 테이블 (company_id 기반 격리)
-- 패턴 B: 레퍼런스 테이블 (인증 사용자 읽기 + admin 쓰기)
-- ================================================================

-- ──────────────────────────────────────────
-- A. 비즈니스 데이터 테이블
-- ──────────────────────────────────────────

-- 1. cars
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cars' AND policyname='cars_select') THEN
    EXECUTE $p$CREATE POLICY "cars_select" ON cars FOR SELECT USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cars' AND policyname='cars_insert') THEN
    EXECUTE $p$CREATE POLICY "cars_insert" ON cars FOR INSERT WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cars' AND policyname='cars_update') THEN
    EXECUTE $p$CREATE POLICY "cars_update" ON cars FOR UPDATE USING (company_id = get_my_company_id() OR is_platform_admin()) WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cars' AND policyname='cars_delete') THEN
    EXECUTE $p$CREATE POLICY "cars_delete" ON cars FOR DELETE USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
END $$;

-- 2. customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='customers' AND policyname='customers_select') THEN
    EXECUTE $p$CREATE POLICY "customers_select" ON customers FOR SELECT USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='customers' AND policyname='customers_insert') THEN
    EXECUTE $p$CREATE POLICY "customers_insert" ON customers FOR INSERT WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='customers' AND policyname='customers_update') THEN
    EXECUTE $p$CREATE POLICY "customers_update" ON customers FOR UPDATE USING (company_id = get_my_company_id() OR is_platform_admin()) WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='customers' AND policyname='customers_delete') THEN
    EXECUTE $p$CREATE POLICY "customers_delete" ON customers FOR DELETE USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
END $$;

-- 3. quotes
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='quotes' AND policyname='quotes_select') THEN
    EXECUTE $p$CREATE POLICY "quotes_select" ON quotes FOR SELECT USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='quotes' AND policyname='quotes_insert') THEN
    EXECUTE $p$CREATE POLICY "quotes_insert" ON quotes FOR INSERT WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='quotes' AND policyname='quotes_update') THEN
    EXECUTE $p$CREATE POLICY "quotes_update" ON quotes FOR UPDATE USING (company_id = get_my_company_id() OR is_platform_admin()) WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='quotes' AND policyname='quotes_delete') THEN
    EXECUTE $p$CREATE POLICY "quotes_delete" ON quotes FOR DELETE USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
END $$;

-- 4. saved_quotes
ALTER TABLE saved_quotes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_quotes' AND policyname='saved_quotes_select') THEN
    EXECUTE $p$CREATE POLICY "saved_quotes_select" ON saved_quotes FOR SELECT USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_quotes' AND policyname='saved_quotes_insert') THEN
    EXECUTE $p$CREATE POLICY "saved_quotes_insert" ON saved_quotes FOR INSERT WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_quotes' AND policyname='saved_quotes_update') THEN
    EXECUTE $p$CREATE POLICY "saved_quotes_update" ON saved_quotes FOR UPDATE USING (company_id = get_my_company_id() OR is_platform_admin()) WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_quotes' AND policyname='saved_quotes_delete') THEN
    EXECUTE $p$CREATE POLICY "saved_quotes_delete" ON saved_quotes FOR DELETE USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
END $$;

-- 5. contracts
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contracts' AND policyname='contracts_select') THEN
    EXECUTE $p$CREATE POLICY "contracts_select" ON contracts FOR SELECT USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contracts' AND policyname='contracts_insert') THEN
    EXECUTE $p$CREATE POLICY "contracts_insert" ON contracts FOR INSERT WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contracts' AND policyname='contracts_update') THEN
    EXECUTE $p$CREATE POLICY "contracts_update" ON contracts FOR UPDATE USING (company_id = get_my_company_id() OR is_platform_admin()) WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contracts' AND policyname='contracts_delete') THEN
    EXECUTE $p$CREATE POLICY "contracts_delete" ON contracts FOR DELETE USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
END $$;

-- 6. insurance_contracts
ALTER TABLE insurance_contracts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='insurance_contracts' AND policyname='insurance_contracts_select') THEN
    EXECUTE $p$CREATE POLICY "insurance_contracts_select" ON insurance_contracts FOR SELECT USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='insurance_contracts' AND policyname='insurance_contracts_insert') THEN
    EXECUTE $p$CREATE POLICY "insurance_contracts_insert" ON insurance_contracts FOR INSERT WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='insurance_contracts' AND policyname='insurance_contracts_update') THEN
    EXECUTE $p$CREATE POLICY "insurance_contracts_update" ON insurance_contracts FOR UPDATE USING (company_id = get_my_company_id() OR is_platform_admin()) WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='insurance_contracts' AND policyname='insurance_contracts_delete') THEN
    EXECUTE $p$CREATE POLICY "insurance_contracts_delete" ON insurance_contracts FOR DELETE USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
END $$;

-- 7. loans
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='loans' AND policyname='loans_select') THEN
    EXECUTE $p$CREATE POLICY "loans_select" ON loans FOR SELECT USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='loans' AND policyname='loans_insert') THEN
    EXECUTE $p$CREATE POLICY "loans_insert" ON loans FOR INSERT WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='loans' AND policyname='loans_update') THEN
    EXECUTE $p$CREATE POLICY "loans_update" ON loans FOR UPDATE USING (company_id = get_my_company_id() OR is_platform_admin()) WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='loans' AND policyname='loans_delete') THEN
    EXECUTE $p$CREATE POLICY "loans_delete" ON loans FOR DELETE USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
END $$;

-- 8. general_investments
ALTER TABLE general_investments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='general_investments' AND policyname='general_investments_select') THEN
    EXECUTE $p$CREATE POLICY "general_investments_select" ON general_investments FOR SELECT USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='general_investments' AND policyname='general_investments_insert') THEN
    EXECUTE $p$CREATE POLICY "general_investments_insert" ON general_investments FOR INSERT WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='general_investments' AND policyname='general_investments_update') THEN
    EXECUTE $p$CREATE POLICY "general_investments_update" ON general_investments FOR UPDATE USING (company_id = get_my_company_id() OR is_platform_admin()) WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='general_investments' AND policyname='general_investments_delete') THEN
    EXECUTE $p$CREATE POLICY "general_investments_delete" ON general_investments FOR DELETE USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
END $$;

-- 9. jiip_contracts
ALTER TABLE jiip_contracts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='jiip_contracts' AND policyname='jiip_contracts_select') THEN
    EXECUTE $p$CREATE POLICY "jiip_contracts_select" ON jiip_contracts FOR SELECT USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='jiip_contracts' AND policyname='jiip_contracts_insert') THEN
    EXECUTE $p$CREATE POLICY "jiip_contracts_insert" ON jiip_contracts FOR INSERT WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='jiip_contracts' AND policyname='jiip_contracts_update') THEN
    EXECUTE $p$CREATE POLICY "jiip_contracts_update" ON jiip_contracts FOR UPDATE USING (company_id = get_my_company_id() OR is_platform_admin()) WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='jiip_contracts' AND policyname='jiip_contracts_delete') THEN
    EXECUTE $p$CREATE POLICY "jiip_contracts_delete" ON jiip_contracts FOR DELETE USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
END $$;

-- 10. transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transactions' AND policyname='transactions_select') THEN
    EXECUTE $p$CREATE POLICY "transactions_select" ON transactions FOR SELECT USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transactions' AND policyname='transactions_insert') THEN
    EXECUTE $p$CREATE POLICY "transactions_insert" ON transactions FOR INSERT WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transactions' AND policyname='transactions_update') THEN
    EXECUTE $p$CREATE POLICY "transactions_update" ON transactions FOR UPDATE USING (company_id = get_my_company_id() OR is_platform_admin()) WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transactions' AND policyname='transactions_delete') THEN
    EXECUTE $p$CREATE POLICY "transactions_delete" ON transactions FOR DELETE USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
END $$;

-- 11. payment_schedules
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='payment_schedules' AND policyname='payment_schedules_select') THEN
    EXECUTE $p$CREATE POLICY "payment_schedules_select" ON payment_schedules FOR SELECT USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='payment_schedules' AND policyname='payment_schedules_insert') THEN
    EXECUTE $p$CREATE POLICY "payment_schedules_insert" ON payment_schedules FOR INSERT WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='payment_schedules' AND policyname='payment_schedules_update') THEN
    EXECUTE $p$CREATE POLICY "payment_schedules_update" ON payment_schedules FOR UPDATE USING (company_id = get_my_company_id() OR is_platform_admin()) WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='payment_schedules' AND policyname='payment_schedules_delete') THEN
    EXECUTE $p$CREATE POLICY "payment_schedules_delete" ON payment_schedules FOR DELETE USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
END $$;

-- 12. financial_products
ALTER TABLE financial_products ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='financial_products' AND policyname='financial_products_select') THEN
    EXECUTE $p$CREATE POLICY "financial_products_select" ON financial_products FOR SELECT USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='financial_products' AND policyname='financial_products_insert') THEN
    EXECUTE $p$CREATE POLICY "financial_products_insert" ON financial_products FOR INSERT WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='financial_products' AND policyname='financial_products_update') THEN
    EXECUTE $p$CREATE POLICY "financial_products_update" ON financial_products FOR UPDATE USING (company_id = get_my_company_id() OR is_platform_admin()) WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='financial_products' AND policyname='financial_products_delete') THEN
    EXECUTE $p$CREATE POLICY "financial_products_delete" ON financial_products FOR DELETE USING (company_id = get_my_company_id() OR is_platform_admin())$p$;
  END IF;
END $$;


-- ──────────────────────────────────────────
-- B. 레퍼런스 테이블 (공용 읽기 + admin 쓰기)
-- ──────────────────────────────────────────

-- 13. common_codes
ALTER TABLE common_codes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='common_codes' AND policyname='common_codes_select') THEN
    EXECUTE $p$CREATE POLICY "common_codes_select" ON common_codes FOR SELECT USING (auth.uid() IS NOT NULL)$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='common_codes' AND policyname='common_codes_admin_all') THEN
    EXECUTE $p$CREATE POLICY "common_codes_admin_all" ON common_codes FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin())$p$;
  END IF;
END $$;

-- 14. vehicle_standard_codes
ALTER TABLE vehicle_standard_codes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='vehicle_standard_codes' AND policyname='vehicle_standard_codes_select') THEN
    EXECUTE $p$CREATE POLICY "vehicle_standard_codes_select" ON vehicle_standard_codes FOR SELECT USING (auth.uid() IS NOT NULL)$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='vehicle_standard_codes' AND policyname='vehicle_standard_codes_admin_all') THEN
    EXECUTE $p$CREATE POLICY "vehicle_standard_codes_admin_all" ON vehicle_standard_codes FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin())$p$;
  END IF;
END $$;

-- 15. vehicle_model_codes
ALTER TABLE vehicle_model_codes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='vehicle_model_codes' AND policyname='vehicle_model_codes_select') THEN
    EXECUTE $p$CREATE POLICY "vehicle_model_codes_select" ON vehicle_model_codes FOR SELECT USING (auth.uid() IS NOT NULL)$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='vehicle_model_codes' AND policyname='vehicle_model_codes_admin_all') THEN
    EXECUTE $p$CREATE POLICY "vehicle_model_codes_admin_all" ON vehicle_model_codes FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin())$p$;
  END IF;
END $$;

-- 16. vehicle_trims
ALTER TABLE vehicle_trims ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='vehicle_trims' AND policyname='vehicle_trims_select') THEN
    EXECUTE $p$CREATE POLICY "vehicle_trims_select" ON vehicle_trims FOR SELECT USING (auth.uid() IS NOT NULL)$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='vehicle_trims' AND policyname='vehicle_trims_admin_all') THEN
    EXECUTE $p$CREATE POLICY "vehicle_trims_admin_all" ON vehicle_trims FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin())$p$;
  END IF;
END $$;

-- 17. car_code_models
ALTER TABLE car_code_models ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='car_code_models' AND policyname='car_code_models_select') THEN
    EXECUTE $p$CREATE POLICY "car_code_models_select" ON car_code_models FOR SELECT USING (auth.uid() IS NOT NULL)$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='car_code_models' AND policyname='car_code_models_admin_all') THEN
    EXECUTE $p$CREATE POLICY "car_code_models_admin_all" ON car_code_models FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin())$p$;
  END IF;
END $$;

-- 18. car_code_options
ALTER TABLE car_code_options ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='car_code_options' AND policyname='car_code_options_select') THEN
    EXECUTE $p$CREATE POLICY "car_code_options_select" ON car_code_options FOR SELECT USING (auth.uid() IS NOT NULL)$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='car_code_options' AND policyname='car_code_options_admin_all') THEN
    EXECUTE $p$CREATE POLICY "car_code_options_admin_all" ON car_code_options FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin())$p$;
  END IF;
END $$;

-- 19. car_code_trims
ALTER TABLE car_code_trims ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='car_code_trims' AND policyname='car_code_trims_select') THEN
    EXECUTE $p$CREATE POLICY "car_code_trims_select" ON car_code_trims FOR SELECT USING (auth.uid() IS NOT NULL)$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='car_code_trims' AND policyname='car_code_trims_admin_all') THEN
    EXECUTE $p$CREATE POLICY "car_code_trims_admin_all" ON car_code_trims FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin())$p$;
  END IF;
END $$;

-- 20. business_rules
ALTER TABLE business_rules ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='business_rules' AND policyname='business_rules_select') THEN
    EXECUTE $p$CREATE POLICY "business_rules_select" ON business_rules FOR SELECT USING (auth.uid() IS NOT NULL)$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='business_rules' AND policyname='business_rules_admin_all') THEN
    EXECUTE $p$CREATE POLICY "business_rules_admin_all" ON business_rules FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin())$p$;
  END IF;
END $$;

-- 21. finance_rules
ALTER TABLE finance_rules ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='finance_rules' AND policyname='finance_rules_select') THEN
    EXECUTE $p$CREATE POLICY "finance_rules_select" ON finance_rules FOR SELECT USING (auth.uid() IS NOT NULL)$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='finance_rules' AND policyname='finance_rules_admin_all') THEN
    EXECUTE $p$CREATE POLICY "finance_rules_admin_all" ON finance_rules FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin())$p$;
  END IF;
END $$;

-- 22~25. DB 테이블들 (존재할 경우에만 RLS 적용)
DO $$
DECLARE
  _tbl TEXT;
BEGIN
  FOREACH _tbl IN ARRAY ARRAY['depreciation_db','maintenance_db','lotte_rentcar_db','market_price_db']
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = _tbl AND table_schema = 'public') THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', _tbl);
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = _tbl AND policyname = _tbl || '_select') THEN
        EXECUTE format('CREATE POLICY "%s_select" ON %I FOR SELECT USING (auth.uid() IS NOT NULL)', _tbl, _tbl);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = _tbl AND policyname = _tbl || '_admin_all') THEN
        EXECUTE format('CREATE POLICY "%s_admin_all" ON %I FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin())', _tbl, _tbl);
      END IF;
    END IF;
  END LOOP;
END $$;


-- ──────────────────────────────────────────
-- C. 조건부 테이블 (존재할 경우에만)
-- ──────────────────────────────────────────

-- investments / company_members / company_roles (존재 + company_id 유무 확인)
DO $$
DECLARE
  _tbl TEXT;
  _has_company_id BOOLEAN;
BEGIN
  FOREACH _tbl IN ARRAY ARRAY['investments','company_members','company_roles']
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = _tbl AND table_schema = 'public') THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', _tbl);

      -- company_id 컬럼 존재 여부 확인
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = _tbl AND column_name = 'company_id'
      ) INTO _has_company_id;

      IF _has_company_id THEN
        -- company_id 기반 정책
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = _tbl AND policyname = _tbl || '_select') THEN
          EXECUTE format('CREATE POLICY "%s_select" ON %I FOR SELECT USING (company_id = get_my_company_id() OR is_platform_admin())', _tbl, _tbl);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = _tbl AND policyname = _tbl || '_insert') THEN
          EXECUTE format('CREATE POLICY "%s_insert" ON %I FOR INSERT WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())', _tbl, _tbl);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = _tbl AND policyname = _tbl || '_update') THEN
          EXECUTE format('CREATE POLICY "%s_update" ON %I FOR UPDATE USING (company_id = get_my_company_id() OR is_platform_admin()) WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())', _tbl, _tbl);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = _tbl AND policyname = _tbl || '_delete') THEN
          EXECUTE format('CREATE POLICY "%s_delete" ON %I FOR DELETE USING (company_id = get_my_company_id() OR is_platform_admin())', _tbl, _tbl);
        END IF;
      ELSE
        -- company_id 없으면 인증 기반 읽기 + admin 전체
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = _tbl AND policyname = _tbl || '_select') THEN
          EXECUTE format('CREATE POLICY "%s_select" ON %I FOR SELECT USING (auth.uid() IS NOT NULL)', _tbl, _tbl);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = _tbl AND policyname = _tbl || '_admin_all') THEN
          EXECUTE format('CREATE POLICY "%s_admin_all" ON %I FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin())', _tbl, _tbl);
        END IF;
      END IF;
    END IF;
  END LOOP;
END $$;


-- ================================================================
-- 완료! 아래 쿼리로 RLS 상태를 확인하세요:
-- ================================================================
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
-- ================================================================
