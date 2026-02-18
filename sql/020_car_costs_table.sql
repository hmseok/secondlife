-- ============================================
-- 020: 차량 구입비용 상세 테이블
-- ============================================
-- 차량별 실제 취득 비용을 항목별로 관리
-- 고정 카테고리 + 사용자 추가 항목 지원

CREATE TABLE IF NOT EXISTS car_costs (
  id            BIGSERIAL PRIMARY KEY,
  car_id        BIGINT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  category      TEXT NOT NULL,          -- 카테고리: '매입', '세금', '등록', '보험', '정비', '기타'
  item_name     TEXT NOT NULL,          -- 항목명: '차량 매입가', '취득세', '공채', '이전등록비' 등
  amount        BIGINT NOT NULL DEFAULT 0,  -- 금액 (원)
  notes         TEXT DEFAULT '',        -- 비고
  sort_order    INT DEFAULT 0,          -- 정렬 순서
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_car_costs_car_id ON car_costs(car_id);

-- cars 테이블에 총비용 캐시 컬럼 추가 (리스트 표시용)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cars' AND column_name='total_cost') THEN
    ALTER TABLE cars ADD COLUMN total_cost BIGINT DEFAULT 0;
  END IF;
END $$;

-- RLS (Row Level Security) — 필요 시 활성화
-- ALTER TABLE car_costs ENABLE ROW LEVEL SECURITY;
