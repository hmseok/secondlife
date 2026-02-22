-- ============================================
-- 038: vehicle_operations에 보험배차 관련 컬럼 추가
-- 사고연동 + 보험사 청구/정산 + 과실비율 기반 비용 분담
-- ============================================

-- 사고 기록 연동
ALTER TABLE vehicle_operations ADD COLUMN IF NOT EXISTS accident_id BIGINT REFERENCES accident_records(id) ON DELETE SET NULL;

-- 배차 분류 (regular: 일반, insurance_victim: 피해자대차, insurance_at_fault: 가해자대차, insurance_own: 자차대차, maintenance: 정비대차)
ALTER TABLE vehicle_operations ADD COLUMN IF NOT EXISTS dispatch_category TEXT DEFAULT 'regular'
  CHECK (dispatch_category IN ('regular', 'insurance_victim', 'insurance_at_fault', 'insurance_own', 'maintenance'));

-- 보험사 청구 정보
ALTER TABLE vehicle_operations ADD COLUMN IF NOT EXISTS insurance_company_billing TEXT;       -- 청구 대상 보험사 (상대 보험사 or 당사 보험사)
ALTER TABLE vehicle_operations ADD COLUMN IF NOT EXISTS insurance_claim_no TEXT;              -- 보험 접수번호
ALTER TABLE vehicle_operations ADD COLUMN IF NOT EXISTS insurance_daily_rate NUMERIC DEFAULT 0; -- 보험사 인정 일일 대차료
ALTER TABLE vehicle_operations ADD COLUMN IF NOT EXISTS fault_ratio INTEGER DEFAULT 0;        -- 과실비율 (0-100, 당사고객 기준)

-- 대차 기간 (출고일 ~ 예상반납일)
ALTER TABLE vehicle_operations ADD COLUMN IF NOT EXISTS replacement_start_date DATE;          -- 대차 시작일 (= 출고일)
ALTER TABLE vehicle_operations ADD COLUMN IF NOT EXISTS replacement_end_date DATE;            -- 예상 반납일 (= 수리완료 예정일)
ALTER TABLE vehicle_operations ADD COLUMN IF NOT EXISTS actual_return_date DATE;              -- 실제 반납일

-- 보험사 정산
ALTER TABLE vehicle_operations ADD COLUMN IF NOT EXISTS insurance_billing_status TEXT DEFAULT 'none'
  CHECK (insurance_billing_status IN ('none', 'pending', 'billed', 'approved', 'paid', 'partial', 'denied'));
ALTER TABLE vehicle_operations ADD COLUMN IF NOT EXISTS insurance_billed_amount NUMERIC DEFAULT 0;  -- 보험사 청구 금액
ALTER TABLE vehicle_operations ADD COLUMN IF NOT EXISTS insurance_paid_amount NUMERIC DEFAULT 0;    -- 보험사 입금 금액
ALTER TABLE vehicle_operations ADD COLUMN IF NOT EXISTS insurance_billing_date DATE;                 -- 청구일
ALTER TABLE vehicle_operations ADD COLUMN IF NOT EXISTS insurance_payment_date DATE;                 -- 입금일
ALTER TABLE vehicle_operations ADD COLUMN IF NOT EXISTS customer_charge NUMERIC DEFAULT 0;           -- 고객 부담액 (과실비율 적용)

-- 수리업체 정보 (사고기록에도 있지만, 배차 기준으로도 빠르게 참조)
ALTER TABLE vehicle_operations ADD COLUMN IF NOT EXISTS repair_shop_name TEXT;
ALTER TABLE vehicle_operations ADD COLUMN IF NOT EXISTS damaged_car_id BIGINT REFERENCES cars(id) ON DELETE SET NULL;  -- 사고/수리 중인 원래 차량

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_op_accident ON vehicle_operations(accident_id) WHERE accident_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_op_dispatch_cat ON vehicle_operations(company_id, dispatch_category);
CREATE INDEX IF NOT EXISTS idx_op_insurance_billing ON vehicle_operations(company_id, insurance_billing_status) WHERE insurance_billing_status != 'none';
