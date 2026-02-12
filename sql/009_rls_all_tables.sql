-- ============================================
-- 009: 전체 테이블 RLS 보안 정책 적용
-- Supabase 보안 경고 대응
-- ============================================
-- 이 마이그레이션은 RLS가 없는 모든 비즈니스/레퍼런스 테이블에
-- Row Level Security를 활성화하고 적절한 접근 정책을 생성합니다.
--
-- 정책 패턴:
--   A) 비즈니스 테이블 (company_id 있음): 자사 데이터만 접근 + god_admin 전체
--   B) 레퍼런스 테이블 (공용 데이터): 인증 사용자 읽기 + god_admin 쓰기
-- ============================================

-- ============================================
-- A. 비즈니스 데이터 테이블 (company_id 기반 격리)
-- ============================================

-- ──────────────────────────────────────────
-- 1. cars (차량 대장)
-- ──────────────────────────────────────────
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cars_select" ON cars FOR SELECT
  USING (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "cars_insert" ON cars FOR INSERT
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "cars_update" ON cars FOR UPDATE
  USING (company_id = get_my_company_id() OR is_platform_admin())
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "cars_delete" ON cars FOR DELETE
  USING (company_id = get_my_company_id() OR is_platform_admin());


-- ──────────────────────────────────────────
-- 2. customers (고객 관리)
-- ──────────────────────────────────────────
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_select" ON customers FOR SELECT
  USING (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "customers_insert" ON customers FOR INSERT
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "customers_update" ON customers FOR UPDATE
  USING (company_id = get_my_company_id() OR is_platform_admin())
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "customers_delete" ON customers FOR DELETE
  USING (company_id = get_my_company_id() OR is_platform_admin());


-- ──────────────────────────────────────────
-- 3. quotes (렌트 견적)
-- ──────────────────────────────────────────
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotes_select" ON quotes FOR SELECT
  USING (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "quotes_insert" ON quotes FOR INSERT
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "quotes_update" ON quotes FOR UPDATE
  USING (company_id = get_my_company_id() OR is_platform_admin())
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "quotes_delete" ON quotes FOR DELETE
  USING (company_id = get_my_company_id() OR is_platform_admin());


-- ──────────────────────────────────────────
-- 4. saved_quotes (저장된 견적 템플릿)
-- ──────────────────────────────────────────
ALTER TABLE saved_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_quotes_select" ON saved_quotes FOR SELECT
  USING (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "saved_quotes_insert" ON saved_quotes FOR INSERT
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "saved_quotes_update" ON saved_quotes FOR UPDATE
  USING (company_id = get_my_company_id() OR is_platform_admin())
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "saved_quotes_delete" ON saved_quotes FOR DELETE
  USING (company_id = get_my_company_id() OR is_platform_admin());


-- ──────────────────────────────────────────
-- 5. contracts (렌트 계약)
-- ──────────────────────────────────────────
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contracts_select" ON contracts FOR SELECT
  USING (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "contracts_insert" ON contracts FOR INSERT
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "contracts_update" ON contracts FOR UPDATE
  USING (company_id = get_my_company_id() OR is_platform_admin())
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "contracts_delete" ON contracts FOR DELETE
  USING (company_id = get_my_company_id() OR is_platform_admin());


-- ──────────────────────────────────────────
-- 6. insurance_contracts (보험 계약)
-- ──────────────────────────────────────────
ALTER TABLE insurance_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insurance_contracts_select" ON insurance_contracts FOR SELECT
  USING (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "insurance_contracts_insert" ON insurance_contracts FOR INSERT
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "insurance_contracts_update" ON insurance_contracts FOR UPDATE
  USING (company_id = get_my_company_id() OR is_platform_admin())
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "insurance_contracts_delete" ON insurance_contracts FOR DELETE
  USING (company_id = get_my_company_id() OR is_platform_admin());


-- ──────────────────────────────────────────
-- 7. loans (대출/금융)
-- ──────────────────────────────────────────
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loans_select" ON loans FOR SELECT
  USING (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "loans_insert" ON loans FOR INSERT
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "loans_update" ON loans FOR UPDATE
  USING (company_id = get_my_company_id() OR is_platform_admin())
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "loans_delete" ON loans FOR DELETE
  USING (company_id = get_my_company_id() OR is_platform_admin());


-- ──────────────────────────────────────────
-- 8. general_investments (일반 투자)
-- ──────────────────────────────────────────
ALTER TABLE general_investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "general_investments_select" ON general_investments FOR SELECT
  USING (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "general_investments_insert" ON general_investments FOR INSERT
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "general_investments_update" ON general_investments FOR UPDATE
  USING (company_id = get_my_company_id() OR is_platform_admin())
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "general_investments_delete" ON general_investments FOR DELETE
  USING (company_id = get_my_company_id() OR is_platform_admin());


-- ──────────────────────────────────────────
-- 9. jiip_contracts (지입 계약)
-- ──────────────────────────────────────────
ALTER TABLE jiip_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jiip_contracts_select" ON jiip_contracts FOR SELECT
  USING (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "jiip_contracts_insert" ON jiip_contracts FOR INSERT
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "jiip_contracts_update" ON jiip_contracts FOR UPDATE
  USING (company_id = get_my_company_id() OR is_platform_admin())
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "jiip_contracts_delete" ON jiip_contracts FOR DELETE
  USING (company_id = get_my_company_id() OR is_platform_admin());


-- ──────────────────────────────────────────
-- 10. transactions (거래 내역)
-- ──────────────────────────────────────────
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_select" ON transactions FOR SELECT
  USING (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "transactions_insert" ON transactions FOR INSERT
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "transactions_update" ON transactions FOR UPDATE
  USING (company_id = get_my_company_id() OR is_platform_admin())
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "transactions_delete" ON transactions FOR DELETE
  USING (company_id = get_my_company_id() OR is_platform_admin());


-- ──────────────────────────────────────────
-- 11. payment_schedules (납부 스케줄)
-- ──────────────────────────────────────────
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_schedules_select" ON payment_schedules FOR SELECT
  USING (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "payment_schedules_insert" ON payment_schedules FOR INSERT
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "payment_schedules_update" ON payment_schedules FOR UPDATE
  USING (company_id = get_my_company_id() OR is_platform_admin())
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "payment_schedules_delete" ON payment_schedules FOR DELETE
  USING (company_id = get_my_company_id() OR is_platform_admin());


-- ──────────────────────────────────────────
-- 12. financial_products (금융 상품)
-- ──────────────────────────────────────────
ALTER TABLE financial_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financial_products_select" ON financial_products FOR SELECT
  USING (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "financial_products_insert" ON financial_products FOR INSERT
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "financial_products_update" ON financial_products FOR UPDATE
  USING (company_id = get_my_company_id() OR is_platform_admin())
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());

CREATE POLICY "financial_products_delete" ON financial_products FOR DELETE
  USING (company_id = get_my_company_id() OR is_platform_admin());


-- ============================================
-- B. 레퍼런스 테이블 (공용 데이터 - 읽기 허용, 쓰기 제한)
-- ============================================
-- 레퍼런스 테이블은 모든 인증 사용자가 읽을 수 있지만
-- 수정/삽입/삭제는 god_admin만 가능합니다.
-- ──────────────────────────────────────────

-- ──────────────────────────────────────────
-- 13. common_codes (공통 코드)
-- ──────────────────────────────────────────
ALTER TABLE common_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "common_codes_select" ON common_codes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "common_codes_admin_all" ON common_codes FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());


-- ──────────────────────────────────────────
-- 14. vehicle_standard_codes (차량 표준 코드)
-- ──────────────────────────────────────────
ALTER TABLE vehicle_standard_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicle_standard_codes_select" ON vehicle_standard_codes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "vehicle_standard_codes_admin_all" ON vehicle_standard_codes FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());


-- ──────────────────────────────────────────
-- 15. vehicle_model_codes (차량 모델 코드)
-- ──────────────────────────────────────────
ALTER TABLE vehicle_model_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicle_model_codes_select" ON vehicle_model_codes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "vehicle_model_codes_admin_all" ON vehicle_model_codes FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());


-- ──────────────────────────────────────────
-- 16. vehicle_trims (차량 트림)
-- ──────────────────────────────────────────
ALTER TABLE vehicle_trims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicle_trims_select" ON vehicle_trims FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "vehicle_trims_admin_all" ON vehicle_trims FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());


-- ──────────────────────────────────────────
-- 17. car_code_models (차종 코드)
-- ──────────────────────────────────────────
ALTER TABLE car_code_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "car_code_models_select" ON car_code_models FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "car_code_models_admin_all" ON car_code_models FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());


-- ──────────────────────────────────────────
-- 18. car_code_options (차량 옵션 코드)
-- ──────────────────────────────────────────
ALTER TABLE car_code_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "car_code_options_select" ON car_code_options FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "car_code_options_admin_all" ON car_code_options FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());


-- ──────────────────────────────────────────
-- 19. car_code_trims (차량 트림 코드)
-- ──────────────────────────────────────────
ALTER TABLE car_code_trims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "car_code_trims_select" ON car_code_trims FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "car_code_trims_admin_all" ON car_code_trims FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());


-- ──────────────────────────────────────────
-- 20. business_rules (비즈니스 규칙)
-- ──────────────────────────────────────────
ALTER TABLE business_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_rules_select" ON business_rules FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "business_rules_admin_all" ON business_rules FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());


-- ──────────────────────────────────────────
-- 21. finance_rules (금융 규칙)
-- ──────────────────────────────────────────
ALTER TABLE finance_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_rules_select" ON finance_rules FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "finance_rules_admin_all" ON finance_rules FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());


-- ──────────────────────────────────────────
-- 22. depreciation_db (감가상각 DB)
-- ──────────────────────────────────────────
ALTER TABLE depreciation_db ENABLE ROW LEVEL SECURITY;

CREATE POLICY "depreciation_db_select" ON depreciation_db FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "depreciation_db_admin_all" ON depreciation_db FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());


-- ──────────────────────────────────────────
-- 23. maintenance_db (정비/부품 DB)
-- ──────────────────────────────────────────
ALTER TABLE maintenance_db ENABLE ROW LEVEL SECURITY;

CREATE POLICY "maintenance_db_select" ON maintenance_db FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "maintenance_db_admin_all" ON maintenance_db FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());


-- ──────────────────────────────────────────
-- 24. lotte_rentcar_db (시세 비교 DB)
-- ──────────────────────────────────────────
ALTER TABLE lotte_rentcar_db ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lotte_rentcar_db_select" ON lotte_rentcar_db FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "lotte_rentcar_db_admin_all" ON lotte_rentcar_db FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());


-- ──────────────────────────────────────────
-- 25. market_price_db (시장 가격 DB)
-- ──────────────────────────────────────────
ALTER TABLE market_price_db ENABLE ROW LEVEL SECURITY;

CREATE POLICY "market_price_db_select" ON market_price_db FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "market_price_db_admin_all" ON market_price_db FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());


-- ============================================
-- C. 혹시 남은 테이블 안전망 (존재할 경우에만 실행)
-- ============================================

-- investments 테이블 (존재하는 경우)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'investments' AND table_schema = 'public') THEN
    EXECUTE 'ALTER TABLE investments ENABLE ROW LEVEL SECURITY';

    -- 기존 정책 충돌 방지
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'investments' AND policyname = 'investments_select') THEN
      EXECUTE $policy$
        CREATE POLICY "investments_select" ON investments FOR SELECT
          USING (company_id = get_my_company_id() OR is_platform_admin())
      $policy$;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'investments' AND policyname = 'investments_insert') THEN
      EXECUTE $policy$
        CREATE POLICY "investments_insert" ON investments FOR INSERT
          WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())
      $policy$;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'investments' AND policyname = 'investments_update') THEN
      EXECUTE $policy$
        CREATE POLICY "investments_update" ON investments FOR UPDATE
          USING (company_id = get_my_company_id() OR is_platform_admin())
          WITH CHECK (company_id = get_my_company_id() OR is_platform_admin())
      $policy$;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'investments' AND policyname = 'investments_delete') THEN
      EXECUTE $policy$
        CREATE POLICY "investments_delete" ON investments FOR DELETE
          USING (company_id = get_my_company_id() OR is_platform_admin())
      $policy$;
    END IF;
  END IF;
END $$;

-- company_members 테이블 (존재하는 경우)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_members' AND table_schema = 'public') THEN
    EXECUTE 'ALTER TABLE company_members ENABLE ROW LEVEL SECURITY';

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'company_members' AND policyname = 'company_members_select') THEN
      EXECUTE $policy$
        CREATE POLICY "company_members_select" ON company_members FOR SELECT
          USING (company_id = get_my_company_id() OR is_platform_admin())
      $policy$;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'company_members' AND policyname = 'company_members_admin_all') THEN
      EXECUTE $policy$
        CREATE POLICY "company_members_admin_all" ON company_members FOR ALL
          USING (is_platform_admin())
          WITH CHECK (is_platform_admin())
      $policy$;
    END IF;
  END IF;
END $$;

-- company_roles 테이블 (존재하는 경우)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_roles' AND table_schema = 'public') THEN
    EXECUTE 'ALTER TABLE company_roles ENABLE ROW LEVEL SECURITY';

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'company_roles' AND policyname = 'company_roles_select') THEN
      EXECUTE $policy$
        CREATE POLICY "company_roles_select" ON company_roles FOR SELECT
          USING (company_id = get_my_company_id() OR is_platform_admin())
      $policy$;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'company_roles' AND policyname = 'company_roles_admin_all') THEN
      EXECUTE $policy$
        CREATE POLICY "company_roles_admin_all" ON company_roles FOR ALL
          USING (is_platform_admin())
          WITH CHECK (is_platform_admin())
      $policy$;
    END IF;
  END IF;
END $$;


-- ============================================
-- D. 확인용: 모든 public 테이블의 RLS 상태 검증 쿼리
-- (실행 후 결과 확인용 - 모두 true여야 함)
-- ============================================
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
