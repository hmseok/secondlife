-- ============================================
-- Self-Disruption 모바일 앱 지원 테이블
-- 푸시 알림 디바이스 토큰 + GPS 위치 이력
-- ============================================

-- 1. 푸시 알림용 디바이스 토큰
CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- RLS 활성화
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- 사용자 본인 토큰만 CRUD
CREATE POLICY "Users manage own device tokens"
  ON device_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);


-- 2. GPS 위치 이력
CREATE TABLE IF NOT EXISTS location_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;

-- 본인 위치 INSERT
CREATE POLICY "Users insert own location"
  ON location_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 본인 위치 조회
CREATE POLICY "Users read own location"
  ON location_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- master/god_admin은 회사 전체 위치 조회
CREATE POLICY "Admins read company location"
  ON location_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'god_admin'
        OR (profiles.role = 'master' AND profiles.company_id = location_history.company_id)
      )
    )
  );

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_location_history_user ON location_history(user_id);
CREATE INDEX IF NOT EXISTS idx_location_history_company ON location_history(company_id);
CREATE INDEX IF NOT EXISTS idx_location_history_time ON location_history(recorded_at DESC);
