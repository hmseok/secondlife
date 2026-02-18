-- ================================================================
-- 018_patch: insurance_vehicle_group 테이블 생성 + group_id 컬럼 추가
-- Supabase SQL Editor에서 바로 실행 가능
-- ================================================================

-- [1] insurance_vehicle_group 테이블 (없으면 생성)
CREATE TABLE IF NOT EXISTS insurance_vehicle_group (
  id BIGSERIAL PRIMARY KEY,
  group_name TEXT NOT NULL,
  origin TEXT NOT NULL,
  fuel_type TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  vehicle_class TEXT DEFAULT '승용',
  avg_own_rate NUMERIC(5,3),
  avg_total_premium INTEGER,
  avg_vehicle_value BIGINT,
  policy_count INTEGER DEFAULT 0,
  color TEXT DEFAULT '#3b82f6',
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE insurance_vehicle_group ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insurance_vehicle_group_all" ON insurance_vehicle_group;
CREATE POLICY "insurance_vehicle_group_all" ON insurance_vehicle_group FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ivg_origin_fuel ON insurance_vehicle_group(origin, fuel_type);
CREATE INDEX IF NOT EXISTS idx_ivg_brand_model ON insurance_vehicle_group(brand, model);

-- [2] insurance_policy_record에 group_id 컬럼 추가 (없으면)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'insurance_policy_record' AND column_name = 'group_id'
  ) THEN
    ALTER TABLE insurance_policy_record ADD COLUMN group_id BIGINT REFERENCES insurance_vehicle_group(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ipr_group_id ON insurance_policy_record(group_id);

-- [3] 그룹 시드 데이터
DELETE FROM insurance_vehicle_group;
INSERT INTO insurance_vehicle_group (id, group_name, origin, fuel_type, brand, model, vehicle_class, avg_own_rate, avg_total_premium, avg_vehicle_value, policy_count, color, sort_order, notes) VALUES
(1, '테슬라 모델Y',      '수입', '전기',      '테슬라', '모델Y',     '승용',   2.170, 1971080, 48195000, 2, '#a855f7', 1, '수입 전기차 대표 모델 — 외제차할증 특별요율 적용'),
(2, '현대 아이오닉5',     '국산', '전기',      '현대',   '아이오닉5', '승용',   1.790, 1828660, 50800000, 1, '#3b82f6', 2, '국산 전기 SUV — 고가차량 특별요율'),
(3, '현대 아이오닉6',     '국산', '전기',      '현대',   '아이오닉6', '승용',   1.960, 1723250, 40710000, 1, '#06b6d4', 3, '국산 전기 세단'),
(4, '기아 EV 시리즈',    '국산', '전기',      '기아',   NULL,       '승용',   1.960, 1799540, 44595000, 2, '#22c55e', 4, 'EV4, EV6 등 기아 전기차 통합 그룹'),
(5, '기아 카니발 HEV',   '국산', '하이브리드', '기아',   '카니발',   '다인승', 1.940, 1876640, 49040000, 1, '#f59e0b', 5, '하이브리드 다인승 — 대인/대물 기본 분담금 차등');

SELECT setval('insurance_vehicle_group_id_seq', 5);

-- [4] 기존 policy_record에 group_id 매핑 (차량명 기준)
UPDATE insurance_policy_record SET group_id = 1 WHERE vehicle_name LIKE '%모델Y%' AND group_id IS NULL;
UPDATE insurance_policy_record SET group_id = 2 WHERE vehicle_name LIKE '%아이오닉5%' AND group_id IS NULL;
UPDATE insurance_policy_record SET group_id = 3 WHERE vehicle_name LIKE '%아이오닉6%' AND group_id IS NULL;
UPDATE insurance_policy_record SET group_id = 4 WHERE (vehicle_name LIKE '%EV4%' OR vehicle_name LIKE '%EV6%') AND group_id IS NULL;
UPDATE insurance_policy_record SET group_id = 5 WHERE vehicle_name LIKE '%카니발%' AND group_id IS NULL;
