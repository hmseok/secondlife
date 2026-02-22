-- ═══════════════════════════════════════════════════════════════
-- 034: 차량 운영관리 시스템 통합 스키마
-- 출고/반납, 스케줄, 정비, 사고, 검사 이력
-- ═══════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────
-- 1. vehicle_operations (출고/반납 관리)
--    계약 확정 후 차량 인도~반납까지의 전체 워크플로우
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_operations (
  id            BIGSERIAL PRIMARY KEY,
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contract_id   UUID REFERENCES contracts(id) ON DELETE SET NULL,
  car_id        BIGINT REFERENCES cars(id) ON DELETE SET NULL,
  customer_id   BIGINT REFERENCES customers(id) ON DELETE SET NULL,

  -- 유형: delivery(출고), return(반납)
  operation_type TEXT NOT NULL CHECK (operation_type IN ('delivery', 'return')),

  -- 상태 흐름
  -- delivery: scheduled → preparing → inspecting → in_transit → completed → cancelled
  -- return:   scheduled → inspecting → completed → cancelled
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'preparing', 'inspecting', 'in_transit', 'completed', 'cancelled')),

  -- 일정
  scheduled_date    DATE NOT NULL,
  scheduled_time    TIME,
  actual_date       DATE,
  actual_time       TIME,
  completed_at      TIMESTAMPTZ,

  -- 장소
  location          TEXT,            -- 인도/반납 장소
  location_address  TEXT,            -- 상세 주소

  -- 담당자
  handler_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  handler_name      TEXT,            -- 담당자명 (비정규화)
  driver_name       TEXT,            -- 탁송기사명
  driver_phone      TEXT,            -- 탁송기사 연락처

  -- 차량 상태 (점검 결과)
  mileage_at_op     INTEGER,         -- 출고/반납 시점 주행거리
  fuel_level        TEXT,            -- 연료량 (full, 3/4, 1/2, 1/4, empty)
  exterior_condition TEXT,           -- 외관 상태 메모
  interior_condition TEXT,           -- 실내 상태 메모

  -- 점검 체크리스트 (JSON)
  -- 예: { "exterior": {"scratch": false, "dent": false}, "documents": {"registration": true, "insurance": true} }
  checklist         JSONB DEFAULT '{}',

  -- 사진 (Supabase Storage URLs)
  photos            TEXT[],

  -- 서명 (인수인계 서명 URL)
  customer_signature_url TEXT,
  handler_signature_url  TEXT,

  -- 비용
  delivery_fee      NUMERIC DEFAULT 0,  -- 탁송비
  additional_cost   NUMERIC DEFAULT 0,  -- 추가비용

  -- 반납 전용 필드
  damage_found      BOOLEAN DEFAULT false,  -- 손상 발견 여부
  damage_description TEXT,                   -- 손상 내용
  excess_mileage    INTEGER DEFAULT 0,       -- 초과주행거리(km)
  settlement_amount NUMERIC DEFAULT 0,       -- 정산금액

  notes             TEXT,
  created_by        UUID,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_ops_company ON vehicle_operations(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_ops_car ON vehicle_operations(car_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_ops_contract ON vehicle_operations(contract_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_ops_status ON vehicle_operations(company_id, status);
CREATE INDEX IF NOT EXISTS idx_vehicle_ops_date ON vehicle_operations(company_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_ops_type_status ON vehicle_operations(company_id, operation_type, status);

-- ────────────────────────────────────────────────────────────
-- 2. vehicle_schedules (차량 스케줄/가용 현황)
--    차량별 타임라인 – 언제 어떤 용도로 사용 중인지
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_schedules (
  id            BIGSERIAL PRIMARY KEY,
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  car_id        BIGINT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,

  -- 스케줄 유형
  schedule_type TEXT NOT NULL
    CHECK (schedule_type IN (
      'rental',           -- 임대 중
      'maintenance',      -- 정비 중
      'inspection',       -- 검사 중
      'accident_repair',  -- 사고 수리 중
      'delivery',         -- 출고 배송 중
      'reserved',         -- 예약됨 (아직 출고 전)
      'unavailable'       -- 기타 사유로 사용 불가
    )),

  start_date    DATE NOT NULL,
  end_date      DATE,              -- NULL = 미정(진행 중)
  start_time    TIME,
  end_time      TIME,

  -- 연관 레코드 (유형에 따라 하나만 사용)
  contract_id       UUID REFERENCES contracts(id) ON DELETE SET NULL,
  maintenance_id    BIGINT,        -- maintenance_records.id
  accident_id       BIGINT,        -- accident_records.id
  inspection_id     BIGINT,        -- inspection_records.id
  operation_id      BIGINT,        -- vehicle_operations.id

  title         TEXT,              -- 캘린더 표시용 제목
  color         TEXT,              -- 캘린더 색상 코드 (#hex)
  notes         TEXT,

  created_by    UUID,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_sched_company ON vehicle_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_sched_car ON vehicle_schedules(car_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_sched_dates ON vehicle_schedules(car_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_sched_type ON vehicle_schedules(company_id, schedule_type);

-- ────────────────────────────────────────────────────────────
-- 3. maintenance_records (정비 이력)
--    정비 접수 → 입고 → 수리/정비 → 출고 워크플로우
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maintenance_records (
  id            BIGSERIAL PRIMARY KEY,
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  car_id        BIGINT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  contract_id   UUID REFERENCES contracts(id) ON DELETE SET NULL,

  -- 정비 유형
  maintenance_type TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (maintenance_type IN (
      'scheduled',    -- 정기 정비 (순회정비, 정기점검)
      'unscheduled',  -- 비정기 정비 (긴급, 고장)
      'recall',       -- 리콜
      'warranty',     -- 보증수리 (제조사)
      'consumable',   -- 소모품 교체 (오일, 타이어 등)
      'body_repair',  -- 외관 수리 (판금, 도장)
      'pre_delivery', -- 출고 전 점검
      'post_return'   -- 반납 후 정비
    )),

  -- 상태 흐름: requested → approved → in_shop → completed → cancelled
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'approved', 'in_shop', 'completed', 'cancelled')),

  -- 일정
  requested_date    DATE DEFAULT CURRENT_DATE,
  scheduled_date    DATE,
  shop_in_date      DATE,          -- 입고일
  shop_out_date     DATE,          -- 출고일
  completed_at      TIMESTAMPTZ,

  -- 정비소 정보
  shop_name         TEXT,
  shop_phone        TEXT,
  shop_address      TEXT,

  -- 차량 상태
  mileage_at_service INTEGER,      -- 입고 시 주행거리

  -- 비용
  estimated_cost    NUMERIC DEFAULT 0,  -- 예상 비용
  actual_cost       NUMERIC DEFAULT 0,  -- 실제 비용
  cost_bearer       TEXT DEFAULT 'company'
    CHECK (cost_bearer IN ('company', 'customer', 'insurance', 'warranty', 'shared')),
  customer_charge   NUMERIC DEFAULT 0,  -- 고객 부담액

  -- 정비 항목 상세 (JSON array)
  -- 예: [{"item": "엔진오일 교체", "part_cost": 50000, "labor_cost": 20000, "done": true}]
  items             JSONB DEFAULT '[]',

  -- 대차 정보
  replacement_car_id BIGINT REFERENCES cars(id) ON DELETE SET NULL,
  replacement_start  DATE,
  replacement_end    DATE,

  -- 첨부
  photos            TEXT[],
  documents         TEXT[],        -- 정비 명세서 등
  invoice_url       TEXT,          -- 세금계산서

  notes             TEXT,
  handler_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by        UUID,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maint_company ON maintenance_records(company_id);
CREATE INDEX IF NOT EXISTS idx_maint_car ON maintenance_records(car_id);
CREATE INDEX IF NOT EXISTS idx_maint_status ON maintenance_records(company_id, status);
CREATE INDEX IF NOT EXISTS idx_maint_type ON maintenance_records(company_id, maintenance_type);
CREATE INDEX IF NOT EXISTS idx_maint_date ON maintenance_records(company_id, scheduled_date);

-- ────────────────────────────────────────────────────────────
-- 4. accident_records (사고 관리)
--    사고접수 → 보험접수 → 수리 → 정산 → 완료
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accident_records (
  id            BIGSERIAL PRIMARY KEY,
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  car_id        BIGINT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  contract_id   UUID REFERENCES contracts(id) ON DELETE SET NULL,
  customer_id   BIGINT REFERENCES customers(id) ON DELETE SET NULL,

  -- 사고 정보
  accident_date     DATE NOT NULL,
  accident_time     TIME,
  accident_location TEXT,          -- 사고 장소
  accident_type     TEXT NOT NULL DEFAULT 'collision'
    CHECK (accident_type IN (
      'collision',       -- 충돌 (쌍방)
      'self_damage',     -- 자차 (단독)
      'hit_and_run',     -- 뺑소니 (피해)
      'theft',           -- 도난
      'natural_disaster', -- 천재지변
      'vandalism',       -- 파손 (제3자)
      'fire',            -- 화재
      'other'            -- 기타
    )),

  -- 과실
  fault_ratio       INTEGER DEFAULT 0,  -- 고객 과실 비율 (0-100%)
  description       TEXT,               -- 사고 경위

  -- 상태 흐름: reported → insurance_filed → repairing → settled → closed → cancelled
  status TEXT NOT NULL DEFAULT 'reported'
    CHECK (status IN ('reported', 'insurance_filed', 'repairing', 'settled', 'closed', 'cancelled')),

  -- 운전자 정보
  driver_name       TEXT,          -- 사고 당시 운전자
  driver_phone      TEXT,
  driver_relation   TEXT,          -- 계약자 본인/배우자/직원/대리운전 등

  -- 상대방 정보 (쌍방사고)
  counterpart_name    TEXT,
  counterpart_phone   TEXT,
  counterpart_vehicle TEXT,        -- 상대 차량 정보
  counterpart_insurance TEXT,      -- 상대 보험사

  -- 보험 처리
  insurance_company   TEXT,        -- 당사 보험사
  insurance_claim_no  TEXT,        -- 보험 접수번호
  insurance_filed_at  TIMESTAMPTZ, -- 보험 접수일시
  insurance_status    TEXT DEFAULT 'none'
    CHECK (insurance_status IN ('none', 'filed', 'processing', 'approved', 'denied', 'partial')),

  -- 경찰 신고
  police_reported     BOOLEAN DEFAULT false,
  police_report_no    TEXT,        -- 사고사실확인원 번호

  -- 수리 정보
  repair_shop_name    TEXT,
  repair_start_date   DATE,
  repair_end_date     DATE,
  mileage_at_accident INTEGER,

  -- 비용
  estimated_repair_cost NUMERIC DEFAULT 0,
  actual_repair_cost    NUMERIC DEFAULT 0,
  insurance_payout      NUMERIC DEFAULT 0,  -- 보험금 수령액
  customer_deductible   NUMERIC DEFAULT 0,  -- 고객 자기부담금
  company_cost          NUMERIC DEFAULT 0,  -- 회사 부담액

  -- 대차 정보
  replacement_car_id    BIGINT REFERENCES cars(id) ON DELETE SET NULL,
  replacement_start     DATE,
  replacement_end       DATE,
  replacement_cost      NUMERIC DEFAULT 0,  -- 대차 비용/휴차보상료

  -- 차량 상태 판정
  vehicle_condition     TEXT DEFAULT 'repairable'
    CHECK (vehicle_condition IN ('repairable', 'total_loss', 'minor')),

  -- 첨부
  photos                TEXT[],     -- 사고 현장/차량 사진
  documents             TEXT[],     -- 사고사실확인원, 견적서 등

  notes                 TEXT,
  handler_id            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by            UUID,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accident_company ON accident_records(company_id);
CREATE INDEX IF NOT EXISTS idx_accident_car ON accident_records(car_id);
CREATE INDEX IF NOT EXISTS idx_accident_contract ON accident_records(contract_id);
CREATE INDEX IF NOT EXISTS idx_accident_status ON accident_records(company_id, status);
CREATE INDEX IF NOT EXISTS idx_accident_date ON accident_records(company_id, accident_date);

-- ────────────────────────────────────────────────────────────
-- 5. inspection_records (검사 이력)
--    법정검사 스케줄 관리 + 검사 결과 기록
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspection_records (
  id            BIGSERIAL PRIMARY KEY,
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  car_id        BIGINT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,

  -- 검사 유형
  inspection_type TEXT NOT NULL DEFAULT 'periodic'
    CHECK (inspection_type IN (
      'new_registration', -- 신규검사
      'periodic',         -- 정기검사
      'comprehensive',    -- 종합검사
      'structure_change', -- 구조변경검사
      'tuning',           -- 튜닝검사
      'emission'          -- 배출가스 검사
    )),

  -- 상태: scheduled → in_progress → passed → failed → overdue → cancelled
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'passed', 'failed', 'overdue', 'cancelled')),

  -- 일정
  due_date          DATE NOT NULL,       -- 검사 만기일
  scheduled_date    DATE,                -- 예약일
  completed_date    DATE,                -- 완료일
  next_due_date     DATE,                -- 다음 검사 만기일

  -- 검사 결과
  result            TEXT,                -- pass/fail 상세 사유
  fail_items        JSONB DEFAULT '[]',  -- 부적합 항목

  -- 검사소 정보
  inspection_center TEXT,
  center_address    TEXT,

  -- 비용
  inspection_fee    NUMERIC DEFAULT 0,   -- 검사 수수료
  agency_fee        NUMERIC DEFAULT 0,   -- 대행 수수료
  penalty_amount    NUMERIC DEFAULT 0,   -- 지연 과태료

  -- 차량 상태
  mileage_at_inspection INTEGER,

  -- 첨부
  documents         TEXT[],              -- 검사증, 결과서 등

  notes             TEXT,
  handler_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by        UUID,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspect_company ON inspection_records(company_id);
CREATE INDEX IF NOT EXISTS idx_inspect_car ON inspection_records(car_id);
CREATE INDEX IF NOT EXISTS idx_inspect_status ON inspection_records(company_id, status);
CREATE INDEX IF NOT EXISTS idx_inspect_due ON inspection_records(company_id, due_date);

-- ────────────────────────────────────────────────────────────
-- 6. vehicle_status_log (차량 상태 변경 이력)
--    차량 상태가 바뀔 때마다 자동 기록
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_status_log (
  id            BIGSERIAL PRIMARY KEY,
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  car_id        BIGINT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,

  old_status    TEXT,
  new_status    TEXT NOT NULL,
  reason        TEXT,              -- 변경 사유
  related_type  TEXT,              -- 'operation', 'maintenance', 'accident', 'inspection', 'manual'
  related_id    BIGINT,            -- 관련 레코드 ID

  changed_by    UUID,
  changed_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_log_car ON vehicle_status_log(car_id);
CREATE INDEX IF NOT EXISTS idx_status_log_company ON vehicle_status_log(company_id);
CREATE INDEX IF NOT EXISTS idx_status_log_date ON vehicle_status_log(car_id, changed_at);

-- ────────────────────────────────────────────────────────────
-- 7. operation_templates (점검 체크리스트 템플릿)
--    출고/반납 시 사용할 점검항목 템플릿
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS operation_templates (
  id            BIGSERIAL PRIMARY KEY,
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  template_type TEXT NOT NULL CHECK (template_type IN ('delivery', 'return', 'maintenance')),
  name          TEXT NOT NULL,
  is_default    BOOLEAN DEFAULT false,

  -- 체크리스트 항목 (JSON array)
  -- 예: [{"group": "외관", "items": [{"label": "스크래치 확인", "required": true}]}]
  checklist_items JSONB NOT NULL DEFAULT '[]',

  is_active     BOOLEAN DEFAULT true,
  sort_order    INTEGER DEFAULT 0,

  created_by    UUID,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_op_template_company ON operation_templates(company_id);

-- ════════════════════════════════════════════════════════════
-- RLS 정책 (기존 패턴과 동일)
-- ════════════════════════════════════════════════════════════

-- vehicle_operations
ALTER TABLE vehicle_operations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vehicle_ops_select" ON vehicle_operations;
DROP POLICY IF EXISTS "vehicle_ops_insert" ON vehicle_operations;
DROP POLICY IF EXISTS "vehicle_ops_update" ON vehicle_operations;
DROP POLICY IF EXISTS "vehicle_ops_delete" ON vehicle_operations;
CREATE POLICY "vehicle_ops_select" ON vehicle_operations FOR SELECT
  USING (company_id = get_my_company_id() OR is_platform_admin());
CREATE POLICY "vehicle_ops_insert" ON vehicle_operations FOR INSERT
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());
CREATE POLICY "vehicle_ops_update" ON vehicle_operations FOR UPDATE
  USING (company_id = get_my_company_id() OR is_platform_admin())
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());
CREATE POLICY "vehicle_ops_delete" ON vehicle_operations FOR DELETE
  USING (company_id = get_my_company_id() OR is_platform_admin());

-- vehicle_schedules
ALTER TABLE vehicle_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vehicle_sched_select" ON vehicle_schedules;
DROP POLICY IF EXISTS "vehicle_sched_insert" ON vehicle_schedules;
DROP POLICY IF EXISTS "vehicle_sched_update" ON vehicle_schedules;
DROP POLICY IF EXISTS "vehicle_sched_delete" ON vehicle_schedules;
CREATE POLICY "vehicle_sched_select" ON vehicle_schedules FOR SELECT
  USING (company_id = get_my_company_id() OR is_platform_admin());
CREATE POLICY "vehicle_sched_insert" ON vehicle_schedules FOR INSERT
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());
CREATE POLICY "vehicle_sched_update" ON vehicle_schedules FOR UPDATE
  USING (company_id = get_my_company_id() OR is_platform_admin())
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());
CREATE POLICY "vehicle_sched_delete" ON vehicle_schedules FOR DELETE
  USING (company_id = get_my_company_id() OR is_platform_admin());

-- maintenance_records
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "maint_select" ON maintenance_records;
DROP POLICY IF EXISTS "maint_insert" ON maintenance_records;
DROP POLICY IF EXISTS "maint_update" ON maintenance_records;
DROP POLICY IF EXISTS "maint_delete" ON maintenance_records;
CREATE POLICY "maint_select" ON maintenance_records FOR SELECT
  USING (company_id = get_my_company_id() OR is_platform_admin());
CREATE POLICY "maint_insert" ON maintenance_records FOR INSERT
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());
CREATE POLICY "maint_update" ON maintenance_records FOR UPDATE
  USING (company_id = get_my_company_id() OR is_platform_admin())
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());
CREATE POLICY "maint_delete" ON maintenance_records FOR DELETE
  USING (company_id = get_my_company_id() OR is_platform_admin());

-- accident_records
ALTER TABLE accident_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "accident_select" ON accident_records;
DROP POLICY IF EXISTS "accident_insert" ON accident_records;
DROP POLICY IF EXISTS "accident_update" ON accident_records;
DROP POLICY IF EXISTS "accident_delete" ON accident_records;
CREATE POLICY "accident_select" ON accident_records FOR SELECT
  USING (company_id = get_my_company_id() OR is_platform_admin());
CREATE POLICY "accident_insert" ON accident_records FOR INSERT
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());
CREATE POLICY "accident_update" ON accident_records FOR UPDATE
  USING (company_id = get_my_company_id() OR is_platform_admin())
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());
CREATE POLICY "accident_delete" ON accident_records FOR DELETE
  USING (company_id = get_my_company_id() OR is_platform_admin());

-- inspection_records
ALTER TABLE inspection_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inspect_select" ON inspection_records;
DROP POLICY IF EXISTS "inspect_insert" ON inspection_records;
DROP POLICY IF EXISTS "inspect_update" ON inspection_records;
DROP POLICY IF EXISTS "inspect_delete" ON inspection_records;
CREATE POLICY "inspect_select" ON inspection_records FOR SELECT
  USING (company_id = get_my_company_id() OR is_platform_admin());
CREATE POLICY "inspect_insert" ON inspection_records FOR INSERT
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());
CREATE POLICY "inspect_update" ON inspection_records FOR UPDATE
  USING (company_id = get_my_company_id() OR is_platform_admin())
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());
CREATE POLICY "inspect_delete" ON inspection_records FOR DELETE
  USING (company_id = get_my_company_id() OR is_platform_admin());

-- vehicle_status_log
ALTER TABLE vehicle_status_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "status_log_select" ON vehicle_status_log;
DROP POLICY IF EXISTS "status_log_insert" ON vehicle_status_log;
CREATE POLICY "status_log_select" ON vehicle_status_log FOR SELECT
  USING (company_id = get_my_company_id() OR is_platform_admin());
CREATE POLICY "status_log_insert" ON vehicle_status_log FOR INSERT
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());

-- operation_templates
ALTER TABLE operation_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "op_tmpl_select" ON operation_templates;
DROP POLICY IF EXISTS "op_tmpl_insert" ON operation_templates;
DROP POLICY IF EXISTS "op_tmpl_update" ON operation_templates;
DROP POLICY IF EXISTS "op_tmpl_delete" ON operation_templates;
CREATE POLICY "op_tmpl_select" ON operation_templates FOR SELECT
  USING (company_id = get_my_company_id() OR is_platform_admin());
CREATE POLICY "op_tmpl_insert" ON operation_templates FOR INSERT
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());
CREATE POLICY "op_tmpl_update" ON operation_templates FOR UPDATE
  USING (company_id = get_my_company_id() OR is_platform_admin())
  WITH CHECK (company_id = get_my_company_id() OR is_platform_admin());
CREATE POLICY "op_tmpl_delete" ON operation_templates FOR DELETE
  USING (company_id = get_my_company_id() OR is_platform_admin());

-- ════════════════════════════════════════════════════════════
-- updated_at 자동 갱신 트리거
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vehicle_ops_updated ON vehicle_operations;
CREATE TRIGGER trg_vehicle_ops_updated
  BEFORE UPDATE ON vehicle_operations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_vehicle_sched_updated ON vehicle_schedules;
CREATE TRIGGER trg_vehicle_sched_updated
  BEFORE UPDATE ON vehicle_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_maint_updated ON maintenance_records;
CREATE TRIGGER trg_maint_updated
  BEFORE UPDATE ON maintenance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_accident_updated ON accident_records;
CREATE TRIGGER trg_accident_updated
  BEFORE UPDATE ON accident_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_inspect_updated ON inspection_records;
CREATE TRIGGER trg_inspect_updated
  BEFORE UPDATE ON inspection_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_op_tmpl_updated ON operation_templates;
CREATE TRIGGER trg_op_tmpl_updated
  BEFORE UPDATE ON operation_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ════════════════════════════════════════════════════════════
-- 기본 체크리스트 템플릿 시드 데이터
-- ════════════════════════════════════════════════════════════

-- 출고 체크리스트 (기본)
-- INSERT는 company_id가 필요하므로, 앱에서 최초 로드시 생성하거나
-- 아래는 참고용 구조 예시입니다:
/*
INSERT INTO operation_templates (company_id, template_type, name, is_default, checklist_items) VALUES
('{company_id}', 'delivery', '출고 표준 체크리스트', true, '[
  {"group": "서류", "items": [
    {"label": "차량등록증 확인", "required": true},
    {"label": "보험증권 확인", "required": true},
    {"label": "계약서 서명 확인", "required": true},
    {"label": "차량수령증 작성", "required": true}
  ]},
  {"group": "외관", "items": [
    {"label": "전면 상태 확인", "required": true},
    {"label": "후면 상태 확인", "required": true},
    {"label": "좌측 상태 확인", "required": true},
    {"label": "우측 상태 확인", "required": true},
    {"label": "루프 상태 확인", "required": false},
    {"label": "타이어 상태 확인", "required": true},
    {"label": "휠 상태 확인", "required": true}
  ]},
  {"group": "실내", "items": [
    {"label": "시트/내장재 상태", "required": true},
    {"label": "계기판 경고등 없음", "required": true},
    {"label": "에어컨/히터 작동", "required": true},
    {"label": "오디오/내비 작동", "required": false},
    {"label": "블랙박스 작동", "required": true}
  ]},
  {"group": "차량 상태", "items": [
    {"label": "연료량 기록", "required": true},
    {"label": "주행거리 기록", "required": true},
    {"label": "엔진오일 상태", "required": false},
    {"label": "냉각수 상태", "required": false},
    {"label": "보조키 지급", "required": false}
  ]}
]');

INSERT INTO operation_templates (company_id, template_type, name, is_default, checklist_items) VALUES
('{company_id}', 'return', '반납 표준 체크리스트', true, '[
  {"group": "서류", "items": [
    {"label": "차량등록증 회수", "required": true},
    {"label": "보조키 회수", "required": true},
    {"label": "반납확인서 작성", "required": true}
  ]},
  {"group": "외관 점검", "items": [
    {"label": "전면 손상 여부", "required": true},
    {"label": "후면 손상 여부", "required": true},
    {"label": "좌측 손상 여부", "required": true},
    {"label": "우측 손상 여부", "required": true},
    {"label": "루프 손상 여부", "required": false},
    {"label": "타이어 마모 상태", "required": true},
    {"label": "휠 손상 여부", "required": true}
  ]},
  {"group": "실내 점검", "items": [
    {"label": "시트/내장재 오염/손상", "required": true},
    {"label": "계기판 경고등 확인", "required": true},
    {"label": "블랙박스 정상 작동", "required": true},
    {"label": "실내 악취/흡연 흔적", "required": true}
  ]},
  {"group": "정산", "items": [
    {"label": "주행거리 기록", "required": true},
    {"label": "연료량 기록", "required": true},
    {"label": "초과주행 확인", "required": true},
    {"label": "손상 감가 산정", "required": false},
    {"label": "미납 렌트료 확인", "required": true}
  ]}
]');
*/

-- ════════════════════════════════════════════════════════════
-- 권한 부여 (Supabase PostgREST 접근용)
-- ════════════════════════════════════════════════════════════
GRANT ALL ON vehicle_operations TO anon, authenticated;
GRANT ALL ON vehicle_schedules TO anon, authenticated;
GRANT ALL ON maintenance_records TO anon, authenticated;
GRANT ALL ON accident_records TO anon, authenticated;
GRANT ALL ON inspection_records TO anon, authenticated;
GRANT ALL ON vehicle_status_log TO anon, authenticated;
GRANT ALL ON operation_templates TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
*/

-- ════════════════════════════════════════════════════════════
-- cars 테이블에 상태 확장 (기존 status 필드 활용)
-- ════════════════════════════════════════════════════════════

-- 기존 cars.status가 단순 text이면 CHECK 추가
-- (이미 존재할 수 있으므로 DO 블록으로 안전하게)
DO $$
BEGIN
  -- cars 테이블에 detailed_status 컬럼 추가 (기존 status와 별도)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cars' AND column_name = 'detailed_status'
  ) THEN
    ALTER TABLE cars ADD COLUMN detailed_status TEXT DEFAULT 'available';
    COMMENT ON COLUMN cars.detailed_status IS '상세 상태: available, reserved, delivering, rented, maintenance, inspection, accident_repair, returning, sold, disposed';
  END IF;

  -- 마지막 정비일
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cars' AND column_name = 'last_maintenance_date'
  ) THEN
    ALTER TABLE cars ADD COLUMN last_maintenance_date DATE;
  END IF;

  -- 다음 검사 만기일
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cars' AND column_name = 'next_inspection_due'
  ) THEN
    ALTER TABLE cars ADD COLUMN next_inspection_due DATE;
  END IF;

  -- 현재 계약 ID (비정규화 - 빠른 조회용)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cars' AND column_name = 'current_contract_id'
  ) THEN
    ALTER TABLE cars ADD COLUMN current_contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL;
  END IF;

  -- 현재 고객 ID (비정규화)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cars' AND column_name = 'current_customer_id'
  ) THEN
    ALTER TABLE cars ADD COLUMN current_customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
END $$;
