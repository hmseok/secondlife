-- =============================================
-- 016: pricing_worksheets 누락 컬럼 추가
-- RentPricingBuilder에서 저장하는 모든 필드 반영
-- Supabase SQL Editor에서 실행
-- =============================================

-- 1. 초과주행 관련
ALTER TABLE pricing_worksheets ADD COLUMN IF NOT EXISTS baseline_km NUMERIC DEFAULT 2;
ALTER TABLE pricing_worksheets ADD COLUMN IF NOT EXISTS excess_mileage_rate NUMERIC DEFAULT 0;
ALTER TABLE pricing_worksheets ADD COLUMN IF NOT EXISTS excess_rate_margin_pct NUMERIC DEFAULT 20;

-- 2. 보험 관련
ALTER TABLE pricing_worksheets ADD COLUMN IF NOT EXISTS driver_age_group TEXT DEFAULT '26세이상';
ALTER TABLE pricing_worksheets ADD COLUMN IF NOT EXISTS ins_auto_mode BOOLEAN DEFAULT true;

-- 3. 정비 패키지 관련
ALTER TABLE pricing_worksheets ADD COLUMN IF NOT EXISTS maint_package TEXT DEFAULT 'basic';
ALTER TABLE pricing_worksheets ADD COLUMN IF NOT EXISTS oil_change_freq INT DEFAULT 1;

-- 4. 차량 연식/감가 관련
ALTER TABLE pricing_worksheets ADD COLUMN IF NOT EXISTS car_age_mode TEXT DEFAULT 'used';
ALTER TABLE pricing_worksheets ADD COLUMN IF NOT EXISTS custom_car_age NUMERIC DEFAULT 0;
ALTER TABLE pricing_worksheets ADD COLUMN IF NOT EXISTS dep_curve_preset TEXT DEFAULT 'standard';
ALTER TABLE pricing_worksheets ADD COLUMN IF NOT EXISTS dep_custom_curve JSONB;
ALTER TABLE pricing_worksheets ADD COLUMN IF NOT EXISTS dep_class_override TEXT DEFAULT '';

-- 5. 계약 유형 관련
ALTER TABLE pricing_worksheets ADD COLUMN IF NOT EXISTS contract_type TEXT DEFAULT 'return';
ALTER TABLE pricing_worksheets ADD COLUMN IF NOT EXISTS residual_rate NUMERIC DEFAULT 0;
ALTER TABLE pricing_worksheets ADD COLUMN IF NOT EXISTS buyout_premium NUMERIC DEFAULT 3;

-- 검증
SELECT
  'Migration 016 완료!' AS result,
  (SELECT count(*) FROM information_schema.columns
   WHERE table_name = 'pricing_worksheets' AND column_name = 'baseline_km') AS has_baseline_km,
  (SELECT count(*) FROM information_schema.columns
   WHERE table_name = 'pricing_worksheets' AND column_name = 'maint_package') AS has_maint_package,
  (SELECT count(*) FROM information_schema.columns
   WHERE table_name = 'pricing_worksheets' AND column_name = 'contract_type') AS has_contract_type,
  (SELECT count(*) FROM information_schema.columns
   WHERE table_name = 'pricing_worksheets' AND column_name = 'driver_age_group') AS has_driver_age_group;
