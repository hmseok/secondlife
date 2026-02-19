-- 023: 단기대차 요율 테이블
-- 정비군별 차종/배기량 기준 1일 대차 단가 관리

CREATE TABLE IF NOT EXISTS short_term_rates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  service_group text NOT NULL,          -- 정비군 (1군, 2군, 3군, 4군, 5군)
  vehicle_class text NOT NULL,          -- 차종 (승용, RV·SUV, 승합, 특수)
  displacement_range text NOT NULL,     -- 배기량 (2000cc 미만, 2000cc 이상, 전체)
  daily_rate numeric DEFAULT 0,         -- 1일 대차 단가 (원)
  sort_order int DEFAULT 0,             -- 표시 순서
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS 정책
ALTER TABLE short_term_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "short_term_rates_all" ON short_term_rates FOR ALL USING (true) WITH CHECK (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_short_term_rates_company ON short_term_rates(company_id);
CREATE INDEX IF NOT EXISTS idx_short_term_rates_active ON short_term_rates(is_active);
