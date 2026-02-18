-- ================================================================
-- 018: 보험 실데이터 기반 요율 시스템 (Insurance Policy Record & Rate Learning)
-- ================================================================
-- 기존 insurance_rate_table의 문제점:
--   1) 차량가액 구간이 너무 넓어 전기차 4천~6천만 구간에서 12~18% 과대추정
--   2) 베이스(대인/대물 등) + 자차를 분리하지 않아 정밀도 낮음
--   3) 실제 공제조합 데이터와 괴리 (DB: 210만 vs 실제: 172~185만)
--
-- 새 구조:
--   1) insurance_policy_record: 실제 가입 청약서 데이터 축적
--   2) insurance_base_premium: 담보별 기본 분담금 (거의 고정값)
--   3) insurance_own_vehicle_rate: 자차요율 (차종/원산지/연료별 — 핵심 변수)
--   4) insurance_rate_table 개선: 실데이터 기반으로 보정된 구간별 요율
-- ================================================================

-- ─────────────────────────────────────────────────────────────────
-- [0] 보험 차량 그룹 (insurance_vehicle_group)
-- ─────────────────────────────────────────────────────────────────
-- 원산지 × 연료유형 × 모델별 그룹 관리
-- 같은 그룹 내 차량들의 평균 자차요율/보험료를 자동 산출하여
-- 신규 차량 보험료 추정 시 해당 그룹 통계를 참조
CREATE TABLE IF NOT EXISTS insurance_vehicle_group (
  id BIGSERIAL PRIMARY KEY,
  group_name TEXT NOT NULL,                 -- 그룹명 (예: '국산 전기 아이오닉5')
  origin TEXT NOT NULL,                     -- 국산, 수입
  fuel_type TEXT NOT NULL,                  -- 전기, 하이브리드, 가솔린, 디젤, LPG
  brand TEXT,                               -- 브랜드 (현대, 기아, 테슬라 등)
  model TEXT,                               -- 모델명 (아이오닉5, 모델Y 등 — NULL이면 브랜드 전체)
  vehicle_class TEXT DEFAULT '승용',         -- 승용, 다인승, SUV 등
  -- 그룹 통계 (자동 갱신용)
  avg_own_rate NUMERIC(5,3),                -- 평균 자차요율 (%)
  avg_total_premium INTEGER,                -- 평균 총보험료
  avg_vehicle_value BIGINT,                 -- 평균 차량가액
  policy_count INTEGER DEFAULT 0,           -- 소속 청약서 수
  -- 메타
  color TEXT DEFAULT '#3b82f6',             -- UI 표시 색상
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


-- ─────────────────────────────────────────────────────────────────
-- [1] 실제 보험 가입 기록 (insurance_policy_record)
-- ─────────────────────────────────────────────────────────────────
-- 보험 등록 시 청약서 데이터를 그대로 저장 → 요율 학습의 원천 데이터
CREATE TABLE IF NOT EXISTS insurance_policy_record (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT REFERENCES insurance_vehicle_group(id), -- 소속 그룹

  -- 차량 정보
  vehicle_id TEXT,                          -- 차량 관리 ID (vehicles 테이블 참조)
  vehicle_number TEXT,                      -- 차량번호 또는 차대번호
  vehicle_name TEXT NOT NULL,               -- 차량명 (예: 테슬라 모델Y RWD)
  vehicle_category TEXT,                    -- 공제조합 분류 (중형, 소형A, 다인승2종 등)
  engine_cc INTEGER DEFAULT 0,             -- 배기량 (전기차는 등가CC)
  vehicle_value BIGINT NOT NULL,            -- 차량 가액 (원)
  insurance_value BIGINT,                   -- 차량 가입금액 (원, 보통 vehicle_value와 동일)
  fuel_type TEXT,                           -- 연료 유형 (전기, 하이브리드, 가솔린, 디젤, LPG 등)
  origin TEXT DEFAULT '국산',               -- 원산지 (국산, 수입)
  registration_year TEXT,                   -- 등록년도 (2025B 등)
  brand TEXT,                               -- 브랜드

  -- 공제/보험사 정보
  insurer TEXT DEFAULT 'KRMA',              -- 공제조합/보험사 (KRMA=전국렌터카공제조합, 현대해상 등)
  policy_number TEXT,                       -- 설계번호/증권번호
  contract_start DATE,                      -- 공제 시작일
  contract_end DATE,                        -- 공제 종료일

  -- 담보별 분담금 (원)
  premium_daein1 INTEGER DEFAULT 0,         -- 대인배상I
  premium_daein2 INTEGER DEFAULT 0,         -- 대인배상II
  premium_daemul INTEGER DEFAULT 0,         -- 대물배상
  daemul_limit BIGINT DEFAULT 200000000,    -- 대물 한도 (기본 2억)
  premium_self_body INTEGER DEFAULT 0,      -- 자기신체사고
  premium_uninsured INTEGER DEFAULT 0,      -- 무보험차상해
  premium_own_vehicle INTEGER DEFAULT 0,    -- 자기차량공제 (자차)
  own_vehicle_deductible_v2v INTEGER DEFAULT 500000,  -- 자차 면책금(차대차)
  own_vehicle_deductible_other INTEGER DEFAULT 1000000, -- 자차 면책금(기타)
  premium_emergency INTEGER DEFAULT 0,      -- 긴급출동
  premium_limit_surcharge INTEGER DEFAULT 0, -- 분담금할증한정
  premium_natural_disaster INTEGER DEFAULT 0, -- 자연재해 할증한정
  total_premium INTEGER NOT NULL,           -- 총 분담금

  -- 할인/할증 정보
  discount_grade TEXT,                      -- 할인할증 등급 (11Z [83%] 등)
  discount_rate NUMERIC(5,2),               -- 할인율 (%) — 83이면 17% 할인
  membership_history TEXT,                  -- 가입경력 (1년미만 [109%] 등)
  membership_factor NUMERIC(5,2),           -- 가입경력 계수 (%) — 109면 9% 할증
  age_limit TEXT DEFAULT '만26세이상',       -- 연령한정특약
  deductible_surcharge INTEGER DEFAULT 500000, -- 물적할증특약 (면책금)
  special_surcharges TEXT[],                -- 특별요율 (전기차, 고가차량, 외제차할증 등)

  -- 분납 정보
  payment_method TEXT DEFAULT '비연속분납(6회납)', -- 납입방법
  initial_payment INTEGER,                  -- 초회분담금
  installment_payment INTEGER,              -- 회차별 분담금

  -- 메타
  source_file TEXT,                         -- 원본 파일명
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 기존 테이블에 group_id 컬럼이 없으면 추가 (이미 테이블이 존재하는 경우 대응)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'insurance_policy_record' AND column_name = 'group_id'
  ) THEN
    ALTER TABLE insurance_policy_record ADD COLUMN group_id BIGINT REFERENCES insurance_vehicle_group(id);
  END IF;
END $$;

-- RLS
ALTER TABLE insurance_policy_record ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insurance_policy_record_all" ON insurance_policy_record;
CREATE POLICY "insurance_policy_record_all" ON insurance_policy_record FOR ALL USING (true) WITH CHECK (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_ipr_group_id ON insurance_policy_record(group_id);
CREATE INDEX IF NOT EXISTS idx_ipr_vehicle_name ON insurance_policy_record(vehicle_name);
CREATE INDEX IF NOT EXISTS idx_ipr_fuel_type ON insurance_policy_record(fuel_type);
CREATE INDEX IF NOT EXISTS idx_ipr_origin ON insurance_policy_record(origin);
CREATE INDEX IF NOT EXISTS idx_ipr_vehicle_value ON insurance_policy_record(vehicle_value);
CREATE INDEX IF NOT EXISTS idx_ipr_insurer ON insurance_policy_record(insurer);


-- ─────────────────────────────────────────────────────────────────
-- [2] 담보별 기본 분담금 기준표 (insurance_base_premium)
-- ─────────────────────────────────────────────────────────────────
-- 실데이터 분석 결과: 담보별 기본 분담금은 차량 유형(승용/다인승)별로 거의 고정
-- 승용: 대인I 284,720 + 대인II 189,000 + 대물 349,860 + 자기신체 29,100 + 무보험 33,470 = 886,150
-- 다인승: 대인I 257,150 + 대인II 179,060 + 대물 393,700 + 자기신체 24,710 + 무보험 33,030 = 887,650
-- (긴급출동/한도할증 별도)

CREATE TABLE IF NOT EXISTS insurance_base_premium (
  id BIGSERIAL PRIMARY KEY,
  vehicle_usage TEXT NOT NULL,              -- 승용, 다인승, 화물 등
  insurer TEXT DEFAULT 'KRMA',              -- 공제조합/보험사
  daein1 INTEGER NOT NULL,                  -- 대인I
  daein2 INTEGER NOT NULL,                  -- 대인II (무한)
  daemul INTEGER NOT NULL,                  -- 대물
  daemul_limit TEXT DEFAULT '2억',          -- 대물 한도
  self_body INTEGER NOT NULL,               -- 자기신체사고
  uninsured INTEGER NOT NULL,               -- 무보험차상해
  emergency INTEGER DEFAULT 22680,          -- 긴급출동
  limit_surcharge INTEGER DEFAULT 15000,    -- 분담금할증한정 (1억)
  base_total INTEGER NOT NULL,              -- 기본 합계 (자차 제외)
  age_limit TEXT DEFAULT '만26세이상',       -- 연령한정 기준
  effective_date DATE DEFAULT CURRENT_DATE, -- 적용 시작일
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE insurance_base_premium ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insurance_base_premium_all" ON insurance_base_premium;
CREATE POLICY "insurance_base_premium_all" ON insurance_base_premium FOR ALL USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────────
-- [3] 자차 요율 기준표 (insurance_own_vehicle_rate)
-- ─────────────────────────────────────────────────────────────────
-- 실데이터 분석 결과: 자차보험료 = 차량가액 × 자차요율(%)
-- 자차요율은 원산지/연료유형/차량가액 구간에 따라 차등
--   국산 전기차: 1.79% ~ 1.96% (평균 1.93%)
--   수입 전기차: 2.16% ~ 2.18% (평균 2.17%)
--   국산 하이브리드: 1.94%
-- → 기존 모형의 수입차 4.2%는 크게 과대 (실제 2.18%)

CREATE TABLE IF NOT EXISTS insurance_own_vehicle_rate (
  id BIGSERIAL PRIMARY KEY,
  origin TEXT NOT NULL,                     -- 국산, 수입
  fuel_type TEXT NOT NULL,                  -- 전기, 하이브리드, 가솔린, 디젤, LPG, 전체
  vehicle_class TEXT DEFAULT '전체',         -- 승용, 다인승, SUV 등
  value_min BIGINT NOT NULL DEFAULT 0,      -- 차량가 하한
  value_max BIGINT NOT NULL DEFAULT 999999999, -- 차량가 상한
  own_vehicle_rate NUMERIC(5,3) NOT NULL,   -- 자차요율 (%) — 1.96이면 차량가의 1.96%
  deductible_v2v INTEGER DEFAULT 500000,    -- 기준 면책금(차대차)
  deductible_other INTEGER DEFAULT 1000000, -- 기준 면책금(기타)
  sample_count INTEGER DEFAULT 0,           -- 이 요율 산출에 사용된 샘플 수
  data_source TEXT DEFAULT '실데이터',       -- 데이터 출처
  effective_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE insurance_own_vehicle_rate ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insurance_own_vehicle_rate_all" ON insurance_own_vehicle_rate;
CREATE POLICY "insurance_own_vehicle_rate_all" ON insurance_own_vehicle_rate FOR ALL USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────────
-- [4] 할인/할증 등급표 (insurance_discount_grade)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS insurance_discount_grade (
  id BIGSERIAL PRIMARY KEY,
  insurer TEXT DEFAULT 'KRMA',
  grade_code TEXT NOT NULL,                 -- 11Z, 11A, 12B 등
  discount_rate NUMERIC(5,2) NOT NULL,      -- 적용률 (%) — 83이면 17% 할인
  grade_desc TEXT,                          -- 등급 설명
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE insurance_discount_grade ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insurance_discount_grade_all" ON insurance_discount_grade;
CREATE POLICY "insurance_discount_grade_all" ON insurance_discount_grade FOR ALL USING (true) WITH CHECK (true);


-- ================================================================
-- SEED DATA (실제 청약서 7건 기반)
-- ================================================================

-- [시드] 담보별 기본 분담금 (KRMA 2025~2026 기준)
DELETE FROM insurance_base_premium;
INSERT INTO insurance_base_premium (vehicle_usage, insurer, daein1, daein2, daemul, daemul_limit, self_body, uninsured, emergency, limit_surcharge, base_total, notes) VALUES
('승용',   'KRMA', 284720, 189000, 349860, '2억', 29100, 33470, 22680, 15000, 923830, '전기차/가솔린 승용 공통 — 실데이터 7건 기준 (2026.01)'),
('다인승', 'KRMA', 257150, 179060, 393700, '2억', 24710, 33030, 22680, 15000, 925330, '카니발 등 다인승 — 실데이터 1건 기준 (2026.01)');

-- [시드] 자차 요율 (실데이터 분석 기반)
DELETE FROM insurance_own_vehicle_rate;
INSERT INTO insurance_own_vehicle_rate (origin, fuel_type, vehicle_class, value_min, value_max, own_vehicle_rate, sample_count, notes) VALUES
-- ── 국산 전기차 ──
('국산', '전기', '승용',  0,        40000000, 1.96, 1, '아이오닉6 기준 — 40,710,000원 → 자차 799,420원'),
('국산', '전기', '승용',  40000001, 50000000, 1.96, 2, 'EV4(1.96%), EV6(1.96%) 평균'),
('국산', '전기', '승용',  50000001, 70000000, 1.79, 1, '아이오닉5 롱레인지 — 50,800,000원 → 자차 907,780원'),
('국산', '전기', '승용',  70000001, 999999999, 1.79, 0, '추정: 고가 국산 전기차 (데이터 부족)'),

-- ── 수입 전기차 (테슬라 등) ──
('수입', '전기', '승용',  0,        45000000, 2.16, 1, '모델Y RWD — 38,900,000원 → 자차 840,260원'),
('수입', '전기', '승용',  45000001, 70000000, 2.18, 1, '모델Y LR — 57,490,000원 → 자차 1,254,240원'),
('수입', '전기', '승용',  70000001, 999999999, 2.30, 0, '추정: 고가 수입 전기차 (데이터 부족)'),

-- ── 국산 하이브리드 ──
('국산', '하이브리드', '승용',    0, 50000000, 1.94, 1, '카니발 HEV — 49,040,000원 → 자차 951,310원'),
('국산', '하이브리드', '승용',    50000001, 999999999, 1.94, 0, '추정: 고가 하이브리드'),
('국산', '하이브리드', '다인승',  0, 999999999, 1.94, 1, '카니발 HEV 다인승 — 동일 요율 적용'),

-- ── 국산 가솔린/디젤 (추정 — 아직 실데이터 없음) ──
('국산', '가솔린', '승용',  0,        30000000, 2.10, 0, '추정: 소형 가솔린 (실데이터 필요)'),
('국산', '가솔린', '승용',  30000001, 50000000, 2.30, 0, '추정: 중형 가솔린 (실데이터 필요)'),
('국산', '가솔린', '승용',  50000001, 999999999, 2.50, 0, '추정: 대형 가솔린 (실데이터 필요)'),
('국산', '디젤',   '승용',  0,        999999999, 2.30, 0, '추정: 디젤 (실데이터 필요)'),
('국산', 'LPG',    '승용',  0,        999999999, 2.20, 0, '추정: LPG (실데이터 필요)'),

-- ── 수입 가솔린/디젤 (추정) ──
('수입', '가솔린', '승용',  0,        60000000, 2.50, 0, '추정: 수입 가솔린 (실데이터 필요)'),
('수입', '가솔린', '승용',  60000001, 999999999, 2.80, 0, '추정: 고가 수입 가솔린'),
('수입', '디젤',   '승용',  0,        999999999, 2.60, 0, '추정: 수입 디젤 (실데이터 필요)'),

-- ── 전체 fallback (유종 무관) ──
('국산', '전체', '승용',    0, 999999999, 2.10, 0, 'fallback: 국산 평균'),
('수입', '전체', '승용',    0, 999999999, 2.50, 0, 'fallback: 수입 평균');

-- [시드] 먼저 policy_record 삭제 (group_id FK 때문에 vehicle_group보다 먼저)
DELETE FROM insurance_policy_record;

-- [시드] 보험 차량 그룹
DELETE FROM insurance_vehicle_group;
INSERT INTO insurance_vehicle_group (id, group_name, origin, fuel_type, brand, model, vehicle_class, avg_own_rate, avg_total_premium, avg_vehicle_value, policy_count, color, sort_order, notes) VALUES
(1, '테슬라 모델Y',      '수입', '전기',      '테슬라', '모델Y',     '승용',   2.170, 1971080, 48195000, 2, '#a855f7', 1, '수입 전기차 대표 모델 — 외제차할증 특별요율 적용'),
(2, '현대 아이오닉5',     '국산', '전기',      '현대',   '아이오닉5', '승용',   1.790, 1828660, 50800000, 1, '#3b82f6', 2, '국산 전기 SUV — 고가차량 특별요율'),
(3, '현대 아이오닉6',     '국산', '전기',      '현대',   '아이오닉6', '승용',   1.960, 1723250, 40710000, 1, '#06b6d4', 3, '국산 전기 세단'),
(4, '기아 EV 시리즈',    '국산', '전기',      '기아',   NULL,       '승용',   1.960, 1799540, 44595000, 2, '#22c55e', 4, 'EV4, EV6 등 기아 전기차 통합 그룹'),
(5, '기아 카니발 HEV',   '국산', '하이브리드', '기아',   '카니발',   '다인승', 1.940, 1876640, 49040000, 1, '#f59e0b', 5, '하이브리드 다인승 — 대인/대물 기본 분담금 차등');

-- ID 시퀀스 보정
SELECT setval('insurance_vehicle_group_id_seq', 5);

-- [시드] 실제 보험 가입 기록 (7건)
INSERT INTO insurance_policy_record (
  group_id,
  vehicle_name, vehicle_category, vehicle_number, engine_cc, vehicle_value, insurance_value,
  fuel_type, origin, registration_year, brand, insurer, policy_number,
  contract_start, contract_end,
  premium_daein1, premium_daein2, premium_daemul, daemul_limit,
  premium_self_body, premium_uninsured, premium_own_vehicle,
  own_vehicle_deductible_v2v, own_vehicle_deductible_other,
  premium_emergency, premium_limit_surcharge, premium_natural_disaster,
  total_premium,
  discount_grade, discount_rate, membership_history, membership_factor,
  age_limit, deductible_surcharge, special_surcharges,
  payment_method, initial_payment, installment_payment,
  source_file
) VALUES
-- 1) 테슬라 모델Y RWD → 그룹1(테슬라 모델Y)
(
  1,
  '테슬라 모델Y RWD', '중형', 'LRWYGCFS4SC933181', 173, 38900000, 38900000,
  '전기', '수입', '2025B', '테슬라', 'KRMA', 'A1112601199980',
  '2026-01-06', '2027-01-06',
  284720, 189000, 349860, 200000000,
  29100, 33470, 840260,
  500000, 1000000,
  22680, 15000, 0,
  1764090,
  '11Z', 83, '1년미만', 109,
  '만26세이상', 500000, ARRAY['전기차 특별요율', '고가차량 특별요율'],
  '비연속분납(6회납)', 469240, 258970,
  '[청약서]모델Y RWD.pdf'
),
-- 2) 아이오닉6 → 그룹3(현대 아이오닉6)
(
  3,
  '아이오닉6', '소형A', 'KMHM141BFSA101469', 111, 40710000, 40710000,
  '전기', '국산', '2025B', '현대', 'KRMA', 'A1112601238623',
  '2026-01-15', '2027-01-15',
  284720, 189000, 349860, 200000000,
  29100, 33470, 799420,
  500000, 1000000,
  22680, 15000, 0,
  1723250,
  '11Z', 83, '1년미만', 109,
  '만26세이상', 500000, ARRAY[]::TEXT[],
  '비연속분납(6회납)', 459050, 252840,
  '[청약서]아이오닉6 렌공.pdf'
),
-- 3) EV4 → 그룹4(기아 EV 시리즈)
(
  4,
  'EV4', '중형', 'KNAD1413FTS002919', 0, 41750000, 41750000,
  '전기', '국산', '2025B', '기아', 'KRMA', 'A1112601199697',
  '2026-01-06', '2027-01-06',
  284720, 189000, 349860, 200000000,
  29100, 33470, 819840,
  500000, 1000000,
  22680, 15000, 0,
  1743670,
  '11Z', 83, '1년미만', 109,
  '만26세이상', 500000, ARRAY[]::TEXT[],
  '비연속분납(6회납)', 464120, 255910,
  '[청약서]EV4.pdf'
),
-- 4) EV6 → 그룹4(기아 EV 시리즈)
(
  4,
  'EV6', '소형A', 'KNAC381AFSA233004', 120, 47440000, 47440000,
  '전기', '국산', '2025B', '기아', 'KRMA', 'A1112601199701',
  '2026-01-06', '2027-01-06',
  284720, 189000, 349860, 200000000,
  29100, 33470, 931580,
  500000, 1000000,
  22680, 15000, 0,
  1855410,
  '11Z', 83, '1년미만', 109,
  '만26세이상', 500000, ARRAY[]::TEXT[],
  '비연속분납(6회납)', 492060, 272670,
  '[청약서]EV6 종료 렌공.pdf'
),
-- 5) 아이오닉5 롱레인지 → 그룹2(현대 아이오닉5)
(
  2,
  '아이오닉5 롱레인지', '소형A', 'KMHKN81AFTU378615', 120, 50800000, 50800000,
  '전기', '국산', '2025B', '현대', 'KRMA', 'A1112601215570',
  '2026-01-12', '2027-01-12',
  284720, 189000, 349860, 200000000,
  29100, 33470, 907780,
  500000, 1000000,
  19730, 15000, 0,
  1828660,
  '11Z', 83, '1년미만', 109,
  '만26세이상', 500000, ARRAY['전기차 특별요율', '고가차량 특별요율'],
  '비연속분납(6회납)', 483160, 269100,
  '[청약서]아이오닉5 롱레인지.pdf'
),
-- 6) 카니발 하이브리드 → 그룹5(기아 카니발 HEV)
(
  5,
  '카니발 하이브리드', '다인승2종', 'KNANE81ABSS075026', 1598, 49040000, 49040000,
  '하이브리드', '국산', '2025B', '기아', 'KRMA', 'A1112601214709',
  '2026-01-09', '2027-01-09',
  257150, 179060, 393700, 200000000,
  24710, 33030, 951310,
  500000, 1000000,
  22680, 15000, 0,
  1876640,
  '11Z', 83, '1년미만', 109,
  '만26세이상', 500000, ARRAY['차선제어 특별요율', '제동제어 특별요율'],
  '비연속분납(6회납)', 497390, 275850,
  '[청약서]카니발 하이브리드.pdf'
),
-- 7) 테슬라 모델Y 롱레인지 → 그룹1(테슬라 모델Y)
(
  1,
  '테슬라 모델Y 롱레인지', '중형', 'LRWYGCEK0SC086547', 230, 57490000, 57490000,
  '전기', '수입', '2025B', '테슬라', 'KRMA', 'A1112601214696',
  '2026-01-09', '2027-01-09',
  284720, 189000, 349860, 200000000,
  29100, 33470, 1254240,
  500000, 1000000,
  22680, 15000, 0,
  2178070,
  '11Z', 83, '1년미만', 109,
  '만26세이상', 500000, ARRAY['전기차 특별요율', '고가차량 특별요율', '외제차할증 특별요율'],
  '비연속분납(6회납)', 572720, 321070,
  '[청약서]테슬라 모델Y 롱레인지.pdf'
);


-- [시드] 기존 insurance_rate_table 보정 (실데이터 기반)
-- 기존 구조 유지하되 값만 보정 (하위 호환)
DELETE FROM insurance_rate_table;
INSERT INTO insurance_rate_table (vehicle_type, value_min, value_max, annual_premium, coverage_desc, notes) VALUES
-- ── 국산 승용 ────────────────────────────────────
('국산 승용',      0,       20000000,  1130000, '대인II무한/대물2억/자손1억/자차', '경차~소형, 기본923K + 자차2.1%×1500만'),
('국산 승용',      20000001, 30000000, 1450000, '대인II무한/대물2억/자손1억/자차', '준중형, 기본923K + 자차2.1%×2500만'),
('국산 승용',      30000001, 45000000, 1710000, '대인II무한/대물2억/자손1억/자차', '중형, 기본923K + 자차2.1%×3750만'),
('국산 승용',      45000001, 60000000, 2020000, '대인II무한/대물3억/자손1억/자차', '대형, 기본923K + 자차2.1%×5250만'),
('국산 승용',      60000001, 999999999, 2400000, '대인II무한/대물3억/자손1억/자차', '프리미엄, 기본923K + 자차2.5%×7000만'),

-- ── 수입 승용 ────────────────────────────────────
('수입 승용',      0,       45000000,  1800000, '대인II무한/대물3억/자손1억/자차', '수입 소~중형, 기본923K + 자차2.5%×3500만'),
('수입 승용',      45000001, 60000000, 2230000, '대인II무한/대물3억/자손1억/자차', '수입 중형, 실데이터: 모델Y LR 217만'),
('수입 승용',      60000001, 80000000, 2700000, '대인II무한/대물5억/자손1억/자차', '수입 대형'),
('수입 승용',      80000001, 120000000, 3400000, '대인II무한/대물5억/자손1억/자차', '수입 프리미엄'),
('수입 승용',      120000001, 999999999, 4200000, '대인II무한/대물5억/자손1억/자차', '초고가'),

-- ── 전기차 국산 ──────────────────────────────────
('전기차 국산',    0,       40000000,  1720000, '대인II무한/대물2억/자손1억/자차', '실데이터: 아이오닉6 172만'),
('전기차 국산',    40000001, 50000000, 1800000, '대인II무한/대물2억/자손1억/자차', '실데이터: EV4 174만, EV6 185만 평균'),
('전기차 국산',    50000001, 70000000, 1920000, '대인II무한/대물3억/자손1억/자차', '실데이터: 아이오닉5 LR 182만'),
('전기차 국산',    70000001, 999999999, 2200000, '대인II무한/대물3억/자손1억/자차', '추정: 고가 국산 전기차'),

-- ── 전기차 수입 ──────────────────────────────────
('전기차 수입',    0,       45000000,  1770000, '대인II무한/대물2억/자손1억/자차', '실데이터: 모델Y RWD 176만'),
('전기차 수입',    45000001, 65000000, 2180000, '대인II무한/대물3억/자손1억/자차', '실데이터: 모델Y LR 217만'),
('전기차 수입',    65000001, 999999999, 2600000, '대인II무한/대물5억/자손1억/자차', '추정: 고가 수입 전기차'),

-- ── 하이브리드 ───────────────────────────────────
('하이브리드',     0,       40000000,  1700000, '대인II무한/대물2억/자손1억/자차', '추정: 기본925K + 자차1.94%×4000만'),
('하이브리드',     40000001, 55000000, 1880000, '대인II무한/대물2억/자손1억/자차', '실데이터: 카니발HEV 187만'),
('하이브리드',     55000001, 999999999, 2100000, '대인II무한/대물3억/자손1억/자차', '추정: 고가 하이브리드'),

-- ── 다인승 ───────────────────────────────────────
('다인승',         0,       45000000,  1800000, '대인II무한/대물2억/자손1억/자차', '기본925K + 자차1.94%×3500만'),
('다인승',         45000001, 60000000, 1930000, '대인II무한/대물2억/자손1억/자차', '실데이터: 카니발HEV 187만 참고'),
('다인승',         60000001, 999999999, 2200000, '대인II무한/대물3억/자손1억/자차', '추정: 고가 다인승');


-- ================================================================
-- 뷰: 실데이터 기반 자차요율 통계 (insurance_rate_stats)
-- ================================================================
-- 실제 가입 기록에서 자차요율을 자동 계산하는 뷰
-- 데이터가 쌓일수록 정확도 향상

CREATE OR REPLACE VIEW insurance_rate_stats AS
SELECT
  origin,
  fuel_type,
  vehicle_category,
  COUNT(*) AS sample_count,
  ROUND(AVG(vehicle_value)) AS avg_vehicle_value,
  ROUND(AVG(premium_own_vehicle)) AS avg_own_vehicle_premium,
  ROUND(AVG(premium_own_vehicle::NUMERIC / NULLIF(vehicle_value, 0) * 100), 3) AS avg_own_vehicle_rate,
  ROUND(AVG(total_premium)) AS avg_total_premium,
  ROUND(AVG(total_premium::NUMERIC / NULLIF(vehicle_value, 0) * 100), 2) AS avg_premium_ratio,
  -- 기본 분담금 평균 (자차 제외)
  ROUND(AVG(
    premium_daein1 + premium_daein2 + premium_daemul +
    premium_self_body + premium_uninsured +
    premium_emergency + premium_limit_surcharge
  )) AS avg_base_premium
FROM insurance_policy_record
WHERE is_active = true
GROUP BY origin, fuel_type, vehicle_category
ORDER BY origin, fuel_type, vehicle_category;
