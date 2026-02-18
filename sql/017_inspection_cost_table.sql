-- ============================================================
-- 017: 자동차 검사 기준 종합 (한국교통안전공단 기준)
-- 검사비용, 검사주기, 과태료, 유종별 배출가스검사 기준
-- ============================================================

-- ────────────────────────────────────────────────
-- 1. 검사비용 기준표 (교통안전공단 고시 수수료)
-- ────────────────────────────────────────────────
DROP TABLE IF EXISTS inspection_cost_table CASCADE;
CREATE TABLE inspection_cost_table (
  id BIGSERIAL PRIMARY KEY,

  vehicle_class TEXT NOT NULL,
  -- 자동차관리법 시행규칙 별표1 기준 분류:
  --   경형: 배기량 1000cc이하 & 길이 3.6m·너비 1.6m·높이 2.0m 이하
  --   소형: 배기량 1600cc이하 & 길이 4.7m·너비 1.7m·높이 2.0m 이하
  --   중형: 배기량 2000cc이하 (소형 초과)
  --   대형: 배기량 2000cc 초과
  --   소형SUV: 배기량 2000cc이하 SUV/RV (중형 범주이나 검사시 대형 적용되는 경우)
  --   대형SUV: 배기량 2000cc초과 SUV/RV
  --   승합_소형: 15인 이하 승합
  --   승합_대형: 16인 이상 승합
  --   화물_소형: 최대적재량 1t 이하
  --   화물_중형: 최대적재량 1~5t
  --   화물_대형: 최대적재량 5t 초과
  --   특수: 특수차량

  fuel_type TEXT NOT NULL DEFAULT '전체',
  -- 유종별 구분: 전체, 가솔린, 디젤, LPG, 하이브리드, 전기, 수소
  -- 배출가스 검사 항목이 유종에 따라 다름

  inspection_type TEXT NOT NULL CHECK (inspection_type IN (
    '신규검사',         -- 신규 등록 시 (수입차·임시등록 등)
    '정기검사',         -- 비사업용 차량 (안전도검사)
    '종합검사',         -- 사업용 차량 (안전도+배출가스)
    '종합검사_정밀',    -- 특정경유차 정밀검사 (DPF 장착 등)
    '구조변경검사',     -- 차량 구조·장치 변경 시
    '임시검사',         -- 리콜/특별 안전검사
    '튜닝검사'          -- 튜닝 승인 후 검사
  )),

  region TEXT NOT NULL DEFAULT '전국',

  -- 검사 비용 상세
  safety_check_cost BIGINT NOT NULL DEFAULT 0,      -- 안전도검사 수수료 (원)
  emission_test_cost BIGINT NOT NULL DEFAULT 0,      -- 배출가스검사 수수료 (원)
  precision_emission_cost BIGINT NOT NULL DEFAULT 0, -- 정밀배출가스검사 수수료 (원) — 경유차
  noise_test_cost BIGINT NOT NULL DEFAULT 0,         -- 소음검사 수수료 (원)
  total_cost BIGINT NOT NULL DEFAULT 0,              -- 총 검사 수수료 (원)

  -- 추가 비용 참고
  retest_cost BIGINT NOT NULL DEFAULT 0,             -- 재검사 수수료 (원) — 부적합 후 재검사
  agency_fee BIGINT NOT NULL DEFAULT 0,              -- 검사대행 수수료 (원) — 검사대행업체 이용 시

  interval_months INT NOT NULL DEFAULT 24,

  notes TEXT,
  source TEXT DEFAULT '한국교통안전공단',              -- 출처
  effective_date DATE DEFAULT '2024-01-01',           -- 적용일
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (vehicle_class, fuel_type, inspection_type, region)
);

COMMENT ON TABLE inspection_cost_table IS '자동차 검사비용 기준표 — 한국교통안전공단 고시 수수료 기준';

-- ────────────────────────────────────────────────
-- 2. 검사 주기 기준표 (자동차관리법 시행규칙 별표)
-- ────────────────────────────────────────────────
DROP TABLE IF EXISTS inspection_schedule_table CASCADE;
CREATE TABLE inspection_schedule_table (
  id BIGSERIAL PRIMARY KEY,

  vehicle_usage TEXT NOT NULL CHECK (vehicle_usage IN (
    '비사업용_승용',       -- 자가용 승용
    '비사업용_승합',       -- 자가용 승합
    '비사업용_화물',       -- 자가용 화물
    '사업용_승용',         -- 렌터카, 택시 등
    '사업용_승합',         -- 전세버스, 노선버스 등
    '사업용_화물',         -- 영업용 화물
    '사업용_특수',         -- 특수사업용
    '이륜차'
  )),

  fuel_type TEXT NOT NULL DEFAULT '전체',
  -- 경유차는 배출가스 정밀검사 주기가 다름

  -- 차령 범위 (년)
  age_from INT NOT NULL DEFAULT 0,
  age_to INT NOT NULL DEFAULT 99,

  -- 검사 주기
  interval_months INT NOT NULL DEFAULT 24,
  first_inspection_months INT NOT NULL DEFAULT 48,

  inspection_type TEXT NOT NULL DEFAULT '종합검사',

  -- 법적 근거
  legal_basis TEXT,  -- 예: '자동차관리법 시행규칙 제73조 별표15의2'

  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (vehicle_usage, fuel_type, age_from, age_to)
);

COMMENT ON TABLE inspection_schedule_table IS '자동차 검사 주기 기준표 — 자동차관리법 시행규칙 기준';

-- ────────────────────────────────────────────────
-- 3. 검사 과태료 기준표 (자동차관리법 제81조)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspection_penalty_table (
  id BIGSERIAL PRIMARY KEY,

  penalty_type TEXT NOT NULL CHECK (penalty_type IN (
    '검사지연_30일이내',      -- 검사 기간 경과 후 30일 이내
    '검사지연_30일초과',      -- 30일 초과 시 (매일 가산)
    '검사지연_최대',          -- 과태료 상한
    '무검사운행',             -- 검사 미필 차량 운행 적발
    '부정검사',               -- 부정한 방법으로 검사받은 경우
    '검사거부',               -- 검사 거부·기피
    '번호판영치'              -- 계속 미검사 시 번호판 영치
  )),

  vehicle_usage TEXT NOT NULL DEFAULT '전체',  -- 전체, 사업용, 비사업용

  -- 과태료 금액
  base_penalty BIGINT NOT NULL DEFAULT 0,      -- 기본 과태료 (원)
  daily_penalty BIGINT NOT NULL DEFAULT 0,     -- 일당 추가 과태료 (원) — 30일 초과 시
  max_penalty BIGINT NOT NULL DEFAULT 0,       -- 최대 과태료 (원)

  -- 추가 처분
  additional_action TEXT,  -- '번호판 영치', '사용정지', '등록취소' 등

  legal_basis TEXT,        -- 법적 근거
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (penalty_type, vehicle_usage)
);

COMMENT ON TABLE inspection_penalty_table IS '자동차 검사 과태료 기준표 — 자동차관리법 제81조';

-- ────────────────────────────────────────────────
-- 4. 배출가스 검사 기준표 (유종별 검사항목·기준치)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS emission_standard_table (
  id BIGSERIAL PRIMARY KEY,

  fuel_type TEXT NOT NULL,  -- 가솔린, 디젤, LPG, 하이브리드(가솔린), 하이브리드(디젤)

  vehicle_class TEXT NOT NULL DEFAULT '전체',

  -- 적용 연도 범위 (제작일자 기준 배출가스 등급)
  year_from INT NOT NULL DEFAULT 2000,
  year_to INT NOT NULL DEFAULT 2099,

  -- 검사 항목 및 기준치
  co_limit NUMERIC(6,2),           -- CO (일산화탄소) ppm or %
  co_unit TEXT DEFAULT '%',
  hc_limit NUMERIC(6,2),           -- HC (탄화수소) ppm
  hc_unit TEXT DEFAULT 'ppm',
  nox_limit NUMERIC(6,2),          -- NOx (질소산화물) ppm — 주로 경유
  nox_unit TEXT DEFAULT 'ppm',
  smoke_limit NUMERIC(6,2),        -- 매연 (%) — 경유차
  smoke_unit TEXT DEFAULT '%',
  pm_limit NUMERIC(8,4),           -- PM 입자상물질 (mg/km) — 경유 정밀검사
  pm_unit TEXT DEFAULT 'mg/km',

  -- 검사 방법
  test_method TEXT,  -- 'ASM2525', 'KD147', 'LMLC', '무부하검사' 등

  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (fuel_type, vehicle_class, year_from, year_to)
);

COMMENT ON TABLE emission_standard_table IS '배출가스 검사 기준표 — 유종·제작연도별 허용 기준치';

-- ============================================================
-- 시드 데이터 — 한국교통안전공단 2024 기준
-- ============================================================

-- ── 1. 검사비용 ──────────────────────────────────

-- 종합검사 (사업용/렌터카) — 교통안전공단 공식 수수료
INSERT INTO inspection_cost_table
  (vehicle_class, fuel_type, inspection_type, region, safety_check_cost, emission_test_cost, precision_emission_cost, noise_test_cost, total_cost, retest_cost, agency_fee, interval_months, notes, source) VALUES

  -- 가솔린/LPG 차량 (배출가스검사 = 무부하검사)
  ('경형',   '가솔린', '종합검사', '전국', 19000, 6000, 0, 0, 25000, 6500, 15000, 24, '경형 가솔린 종합검사', '교통안전공단 2024'),
  ('소형',   '가솔린', '종합검사', '전국', 22000, 7500, 0, 0, 29500, 7500, 15000, 24, '소형 가솔린 종합검사', '교통안전공단 2024'),
  ('중형',   '가솔린', '종합검사', '전국', 25000, 8500, 0, 0, 33500, 8500, 20000, 24, '중형 가솔린 종합검사', '교통안전공단 2024'),
  ('대형',   '가솔린', '종합검사', '전국', 28000, 10000, 0, 0, 38000, 10000, 20000, 24, '대형 가솔린 종합검사', '교통안전공단 2024'),

  ('경형',   'LPG', '종합검사', '전국', 19000, 6000, 0, 0, 25000, 6500, 15000, 24, '경형 LPG 종합검사', '교통안전공단 2024'),
  ('소형',   'LPG', '종합검사', '전국', 22000, 7500, 0, 0, 29500, 7500, 15000, 24, '소형 LPG 종합검사', '교통안전공단 2024'),
  ('중형',   'LPG', '종합검사', '전국', 25000, 8500, 0, 0, 33500, 8500, 20000, 24, '중형 LPG 종합검사', '교통안전공단 2024'),

  -- 디젤 차량 (배출가스 + 매연 + 정밀검사 비용 추가)
  ('소형',   '디젤', '종합검사', '전국', 22000, 8000, 28000, 0, 58000, 10000, 20000, 24, '소형 디젤 종합검사 (정밀 포함)', '교통안전공단 2024'),
  ('중형',   '디젤', '종합검사', '전국', 25000, 9500, 32000, 0, 66500, 12000, 25000, 24, '중형 디젤 종합검사 (정밀 포함)', '교통안전공단 2024'),
  ('대형',   '디젤', '종합검사', '전국', 28000, 11000, 35000, 0, 74000, 14000, 25000, 24, '대형 디젤 종합검사 (정밀 포함)', '교통안전공단 2024'),
  ('대형SUV','디젤', '종합검사', '전국', 30000, 12000, 38000, 0, 80000, 15000, 30000, 24, '대형SUV 디젤 종합검사 (정밀 포함)', '교통안전공단 2024'),

  -- 하이브리드 (가솔린 기반 — 배출가스 검사 간소)
  ('소형',   '하이브리드', '종합검사', '전국', 22000, 6000, 0, 0, 28000, 7000, 15000, 24, '소형 하이브리드 종합검사', '교통안전공단 2024'),
  ('중형',   '하이브리드', '종합검사', '전국', 25000, 7000, 0, 0, 32000, 8000, 20000, 24, '중형 하이브리드 종합검사', '교통안전공단 2024'),
  ('대형',   '하이브리드', '종합검사', '전국', 28000, 8000, 0, 0, 36000, 9000, 20000, 24, '대형 하이브리드 종합검사', '교통안전공단 2024'),

  -- 전기차 (배출가스 면제 → 안전도검사만)
  ('경형',   '전기', '종합검사', '전국', 19000, 0, 0, 0, 19000, 5000, 15000, 24, '경형 전기차 (배출가스 면제)', '교통안전공단 2024'),
  ('소형',   '전기', '종합검사', '전국', 22000, 0, 0, 0, 22000, 6000, 15000, 24, '소형 전기차 (배출가스 면제)', '교통안전공단 2024'),
  ('중형',   '전기', '종합검사', '전국', 25000, 0, 0, 0, 25000, 7000, 20000, 24, '중형 전기차 (배출가스 면제)', '교통안전공단 2024'),
  ('대형',   '전기', '종합검사', '전국', 28000, 0, 0, 0, 28000, 8000, 20000, 24, '대형 전기차 (배출가스 면제)', '교통안전공단 2024'),

  -- 수소차 (배출가스 면제 + 고압용기 검사 비용 추가)
  ('중형',   '수소', '종합검사', '전국', 25000, 0, 0, 0, 45000, 10000, 25000, 24, '수소차 (고압용기검사 포함)', '교통안전공단 2024'),
  ('대형',   '수소', '종합검사', '전국', 28000, 0, 0, 0, 50000, 12000, 25000, 24, '수소차 대형 (고압용기검사 포함)', '교통안전공단 2024'),

  -- 승합차 (소형/대형)
  ('승합_소형', '디젤', '종합검사', '전국', 30000, 10000, 35000, 0, 75000, 15000, 30000, 12, '소형 승합 디젤 종합검사 (매년)', '교통안전공단 2024'),
  ('승합_대형', '디젤', '종합검사', '전국', 38000, 14000, 42000, 0, 94000, 18000, 35000, 12, '대형 승합 디젤 종합검사 (매년)', '교통안전공단 2024'),

  -- 신규검사 (전 유종 공통)
  ('경형',   '전체', '신규검사', '전국', 25000, 6000, 0, 0, 31000, 0, 20000, 0, '신규검사 1회성', '교통안전공단 2024'),
  ('소형',   '전체', '신규검사', '전국', 30000, 7500, 0, 0, 37500, 0, 20000, 0, '신규검사 1회성', '교통안전공단 2024'),
  ('중형',   '전체', '신규검사', '전국', 35000, 9000, 0, 0, 44000, 0, 25000, 0, '신규검사 1회성', '교통안전공단 2024'),
  ('대형',   '전체', '신규검사', '전국', 40000, 11000, 0, 0, 51000, 0, 25000, 0, '신규검사 1회성', '교통안전공단 2024'),

  -- 정기검사 (비사업용 — 가솔린 기준)
  ('경형',   '가솔린', '정기검사', '전국', 15000, 5000, 0, 0, 20000, 5000, 10000, 24, '경형 정기검사', '교통안전공단 2024'),
  ('소형',   '가솔린', '정기검사', '전국', 18000, 6000, 0, 0, 24000, 6000, 12000, 24, '소형 정기검사', '교통안전공단 2024'),
  ('중형',   '가솔린', '정기검사', '전국', 21000, 7000, 0, 0, 28000, 7000, 15000, 24, '중형 정기검사', '교통안전공단 2024'),
  ('대형',   '가솔린', '정기검사', '전국', 24000, 8000, 0, 0, 32000, 8000, 15000, 24, '대형 정기검사', '교통안전공단 2024'),

  -- 정기검사 — 디젤 (정밀검사 추가)
  ('소형',   '디젤', '정기검사', '전국', 18000, 7000, 25000, 0, 50000, 8000, 18000, 24, '소형 디젤 정기검사 (정밀)', '교통안전공단 2024'),
  ('중형',   '디젤', '정기검사', '전국', 21000, 8000, 28000, 0, 57000, 9000, 20000, 24, '중형 디젤 정기검사 (정밀)', '교통안전공단 2024'),
  ('대형',   '디젤', '정기검사', '전국', 24000, 9500, 32000, 0, 65500, 10000, 22000, 24, '대형 디젤 정기검사 (정밀)', '교통안전공단 2024'),

  -- 구조변경검사 (공통)
  ('전체',   '전체', '구조변경검사', '전국', 40000, 0, 0, 5000, 45000, 10000, 30000, 0, '구조변경검사 — 1회성', '교통안전공단 2024'),
  ('전체',   '전체', '튜닝검사', '전국', 45000, 0, 0, 5000, 50000, 12000, 35000, 0, '튜닝검사 — 1회성', '교통안전공단 2024')

ON CONFLICT (vehicle_class, fuel_type, inspection_type, region) DO NOTHING;


-- ── 2. 검사 주기 (자동차관리법 시행규칙 별표15의2) ──────────

INSERT INTO inspection_schedule_table
  (vehicle_usage, fuel_type, age_from, age_to, interval_months, first_inspection_months, inspection_type, legal_basis, notes) VALUES

  -- ▶ 사업용 승용 (렌터카, 택시) — 종합검사
  ('사업용_승용', '전체',  0,  1, 24, 24, '종합검사', '시행규칙 별표15의2', '신차 출고 후 2년 후 첫 검사'),
  ('사업용_승용', '전체',  2,  4, 12, 24, '종합검사', '시행규칙 별표15의2', '2~4년차: 매년 검사'),
  ('사업용_승용', '전체',  5,  7, 12, 24, '종합검사', '시행규칙 별표15의2', '5~7년차: 매년 검사'),
  ('사업용_승용', '전체',  8, 99,  6, 24, '종합검사', '시행규칙 별표15의2', '8년 이상: 6개월마다'),

  -- ▶ 사업용 승용 — 디젤 (배출가스 정밀검사 추가)
  ('사업용_승용', '디젤',  0,  3, 24, 24, '종합검사_정밀', '대기환경보전법 시행규칙', '디젤 사업용: 정밀검사 포함'),
  ('사업용_승용', '디젤',  4,  7, 12, 24, '종합검사_정밀', '대기환경보전법 시행규칙', '4년 이상 디젤: 매년 정밀'),
  ('사업용_승용', '디젤',  8, 99,  6, 24, '종합검사_정밀', '대기환경보전법 시행규칙', '8년 이상 디젤: 6개월마다 정밀'),

  -- ▶ 사업용 승합 (전세버스 등)
  ('사업용_승합', '전체',  0,  1, 12, 12, '종합검사', '시행규칙 별표15의2', '사업용 승합: 매년'),
  ('사업용_승합', '전체',  2,  4, 12, 12, '종합검사', '시행규칙 별표15의2', '사업용 승합: 매년'),
  ('사업용_승합', '전체',  5, 99,  6, 12, '종합검사', '시행규칙 별표15의2', '5년 이상 사업용 승합: 6개월'),

  -- ▶ 비사업용 승용 (자가용)
  ('비사업용_승용', '전체',    0,  3, 0,  48, '정기검사', '시행규칙 별표15의2', '신차 4년간 검사 면제'),
  ('비사업용_승용', '전체',    4,  7, 24, 48, '정기검사', '시행규칙 별표15의2', '4~7년: 2년마다'),
  ('비사업용_승용', '전체',    8, 99, 12, 48, '정기검사', '시행규칙 별표15의2', '8년 이상: 매년'),

  -- ▶ 비사업용 승용 — 디젤 (정밀검사)
  ('비사업용_승용', '디젤',    0,  3, 0,  48, '종합검사_정밀', '대기환경보전법', '신차 4년 검사면제 (디젤도 동일)'),
  ('비사업용_승용', '디젤',    4,  7, 24, 48, '종합검사_정밀', '대기환경보전법', '4~7년 디젤: 2년마다 정밀'),
  ('비사업용_승용', '디젤',    8, 99, 12, 48, '종합검사_정밀', '대기환경보전법', '8년 이상 디젤: 매년 정밀'),

  -- ▶ 비사업용 승합
  ('비사업용_승합', '전체',    0,  2, 0,  36, '정기검사', '시행규칙 별표15의2', '비사업용 승합: 3년 후 첫 검사'),
  ('비사업용_승합', '전체',    3,  7, 24, 36, '정기검사', '시행규칙 별표15의2', '3~7년: 2년마다'),
  ('비사업용_승합', '전체',    8, 99, 12, 36, '정기검사', '시행규칙 별표15의2', '8년 이상: 매년'),

  -- ▶ 전기/수소 차량 (배출가스 면제, 안전도검사만)
  ('사업용_승용',   '전기', 0,  4, 24, 24, '종합검사', '시행규칙 별표15의2', '전기차 사업용: 안전도검사만 (배출가스 면제)'),
  ('사업용_승용',   '전기', 5, 99, 12, 24, '종합검사', '시행규칙 별표15의2', '5년 이상 전기차: 매년 안전도검사'),
  ('비사업용_승용', '전기', 0,  3, 0,  48, '정기검사', '시행규칙 별표15의2', '전기차 비사업용: 4년간 면제'),
  ('비사업용_승용', '전기', 4, 99, 24, 48, '정기검사', '시행규칙 별표15의2', '전기차 비사업용: 2년마다 안전도검사'),

  ('사업용_승용',   '수소', 0,  4, 24, 24, '종합검사', '시행규칙 별표15의2·고압가스안전관리법', '수소차: 안전도+고압용기 검사'),
  ('사업용_승용',   '수소', 5, 99, 12, 24, '종합검사', '시행규칙 별표15의2·고압가스안전관리법', '5년 이상 수소차: 매년'),

  -- ▶ 이륜차
  ('이륜차', '전체', 0, 2, 0, 36, '정기검사', '시행규칙 별표15의2', '이륜차: 3년 후 첫 검사'),
  ('이륜차', '전체', 3, 99, 24, 36, '정기검사', '시행규칙 별표15의2', '이륜차: 2년마다')

ON CONFLICT (vehicle_usage, fuel_type, age_from, age_to) DO NOTHING;


-- ── 3. 과태료 기준 (자동차관리법 제81조, 2024 기준) ──────────

INSERT INTO inspection_penalty_table
  (penalty_type, vehicle_usage, base_penalty, daily_penalty, max_penalty, additional_action, legal_basis, notes) VALUES

  -- 검사 지연 (기간 경과)
  ('검사지연_30일이내', '비사업용',  20000, 0, 20000, NULL, '자동차관리법 제81조', '검사유효기간 경과 후 30일 이내 — 2만원'),
  ('검사지연_30일이내', '사업용',    40000, 0, 40000, NULL, '자동차관리법 제81조', '사업용 차량 30일 이내 — 4만원'),

  ('검사지연_30일초과', '비사업용',  20000, 10000, 300000, NULL, '자동차관리법 제81조', '30일 초과 시 1일당 1만원 가산 (최대 30만원)'),
  ('검사지연_30일초과', '사업용',    40000, 20000, 600000, NULL, '자동차관리법 제81조', '사업용 30일 초과 시 1일당 2만원 가산 (최대 60만원)'),

  ('검사지연_최대', '비사업용',  300000, 0, 300000, '번호판 영치 대상', '자동차관리법 제81조', '과태료 최대 30만원 + 번호판 영치'),
  ('검사지연_최대', '사업용',    600000, 0, 600000, '번호판 영치·사업정지 대상', '자동차관리법 제81조', '사업용 최대 60만원 + 사업정지'),

  -- 무검사 운행
  ('무검사운행', '비사업용', 300000, 0, 300000, '30만원 즉시 부과', '자동차관리법 제81조 제2항', '검사 미필 차량 운행 적발 — 30만원'),
  ('무검사운행', '사업용',   500000, 0, 500000, '50만원 즉시 부과·사용정지', '자동차관리법 제81조 제2항', '사업용 무검사 운행 — 50만원 + 사용정지 가능'),

  -- 부정검사
  ('부정검사', '전체', 1000000, 0, 1000000, '검사 무효·재검사 명령', '자동차관리법 제81조 제3항', '부정한 방법으로 검사 — 100만원'),

  -- 번호판 영치
  ('번호판영치', '전체', 0, 0, 0, '번호판 영치·차량 운행 불가', '자동차관리법 제36조의2', '2회 이상 과태료 미납 + 검사 미이행 시')

ON CONFLICT (penalty_type, vehicle_usage) DO NOTHING;


-- ── 4. 배출가스 검사 기준 (유종별) ──────────

INSERT INTO emission_standard_table
  (fuel_type, vehicle_class, year_from, year_to, co_limit, co_unit, hc_limit, hc_unit, nox_limit, nox_unit, smoke_limit, smoke_unit, pm_limit, pm_unit, test_method, notes) VALUES

  -- 가솔린 (무부하검사)
  ('가솔린', '전체', 2006, 2099, 1.00, '%', 120, 'ppm', NULL, NULL, NULL, NULL, NULL, NULL, '무부하검사', '2006년 이후 제작 가솔린 — CO 1%·HC 120ppm'),
  ('가솔린', '전체', 2000, 2005, 1.20, '%', 220, 'ppm', NULL, NULL, NULL, NULL, NULL, NULL, '무부하검사', '2000~2005 가솔린 — CO 1.2%·HC 220ppm'),
  ('가솔린', '전체', 1987, 1999, 4.50, '%', 1200, 'ppm', NULL, NULL, NULL, NULL, NULL, NULL, '무부하검사', '1987~1999 가솔린 — CO 4.5%·HC 1200ppm'),

  -- LPG (무부하검사)
  ('LPG', '전체', 2006, 2099, 1.00, '%', 120, 'ppm', NULL, NULL, NULL, NULL, NULL, NULL, '무부하검사', '2006년 이후 LPG'),
  ('LPG', '전체', 2000, 2005, 1.20, '%', 220, 'ppm', NULL, NULL, NULL, NULL, NULL, NULL, '무부하검사', '2000~2005 LPG'),

  -- 디젤 — 매연(매연측정법) + 정밀검사(KD147)
  ('디젤', '소형', 2006, 2099, NULL, NULL, NULL, NULL, NULL, NULL, 10, '%', 0.005, 'g/km', 'KD147', '2006년 이후 소형 디젤 — 매연 10%·PM 0.005g/km'),
  ('디젤', '소형', 2000, 2005, NULL, NULL, NULL, NULL, NULL, NULL, 20, '%', 0.01, 'g/km', 'KD147', '2000~2005 소형 디젤'),
  ('디젤', '대형', 2006, 2099, NULL, NULL, NULL, NULL, NULL, NULL, 15, '%', 0.007, 'g/km', 'KD147', '2006년 이후 대형 디젤'),
  ('디젤', '대형', 2000, 2005, NULL, NULL, NULL, NULL, NULL, NULL, 25, '%', 0.015, 'g/km', 'KD147', '2000~2005 대형 디젤'),

  -- 하이브리드 (가솔린 기준 적용)
  ('하이브리드', '전체', 2006, 2099, 1.00, '%', 120, 'ppm', NULL, NULL, NULL, NULL, NULL, NULL, '무부하검사', '하이브리드(가솔린 기준)'),

  -- 전기/수소 (배출가스 검사 면제)
  ('전기', '전체', 2000, 2099, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '면제', '전기차 배출가스 검사 면제 — 안전도검사만'),
  ('수소', '전체', 2000, 2099, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '면제', '수소차 배출가스 검사 면제 — 안전도+고압용기 검사')

ON CONFLICT (fuel_type, vehicle_class, year_from, year_to) DO NOTHING;


-- ── RLS 정책 ────────────────────────────────────
ALTER TABLE inspection_cost_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_schedule_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_penalty_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE emission_standard_table ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inspection_cost_all" ON inspection_cost_table;
CREATE POLICY "inspection_cost_all" ON inspection_cost_table FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "inspection_schedule_all" ON inspection_schedule_table;
CREATE POLICY "inspection_schedule_all" ON inspection_schedule_table FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "inspection_penalty_all" ON inspection_penalty_table;
CREATE POLICY "inspection_penalty_all" ON inspection_penalty_table FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "emission_standard_all" ON emission_standard_table;
CREATE POLICY "emission_standard_all" ON emission_standard_table FOR ALL USING (true) WITH CHECK (true);
