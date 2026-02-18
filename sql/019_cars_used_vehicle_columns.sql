-- ============================================================
-- 019: 차량 테이블 — 신차/중고차 구분 + 구입시 주행거리 컬럼 추가
-- ============================================================
-- 실행 환경: Supabase SQL Editor
-- 목적: 중고차 여부와 구입 당시 주행거리를 기록하여
--        감가 계산 · 주행 보정 로직의 정확도를 높임
-- ============================================================

-- 1. is_used (중고차 여부)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cars' AND column_name = 'is_used'
  ) THEN
    ALTER TABLE cars ADD COLUMN is_used BOOLEAN DEFAULT false;
    COMMENT ON COLUMN cars.is_used IS '중고차 여부 (true=중고차, false=신차)';
  END IF;
END $$;

-- 2. purchase_mileage (구입 시 주행거리, km 단위)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cars' AND column_name = 'purchase_mileage'
  ) THEN
    ALTER TABLE cars ADD COLUMN purchase_mileage INTEGER DEFAULT 0;
    COMMENT ON COLUMN cars.purchase_mileage IS '구입 당시 주행거리 (km) — 중고차만 해당';
  END IF;
END $$;

-- 3. 기존 차량 데이터 보정: mileage > 0 이면 중고차로 추정 마킹
-- (선택 사항 — 수동 확인 후 실행 권장)
-- UPDATE cars SET is_used = true WHERE mileage > 1000 AND is_used = false;
