-- ============================================
-- 021: 차량 영업용/비영업용 구분 컬럼
-- ============================================
-- is_commercial: true = 영업용, false = 비영업용(자가용)
-- 영업용 vs 비영업용에 따라 보험료, 취득세율, 검사주기 등이 달라짐

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cars' AND column_name='is_commercial') THEN
    ALTER TABLE cars ADD COLUMN is_commercial BOOLEAN DEFAULT true;
    COMMENT ON COLUMN cars.is_commercial IS '영업용 여부: true=영업용, false=비영업용(자가용)';
  END IF;
END $$;
