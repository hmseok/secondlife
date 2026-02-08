-- ============================================
-- 회사 사용자 모듈 읽기 RLS 정책 추가
-- 문제: 회사 로그인 시 사이드바/대시보드에 모듈 안 보임
-- ============================================

-- 1. system_modules: 모든 인증 사용자 읽기 허용
ALTER TABLE system_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_can_read_system_modules" ON system_modules;
CREATE POLICY "anyone_can_read_system_modules" ON system_modules
  FOR SELECT
  USING (true);

-- 2. company_modules: 자기 회사 모듈만 읽기 허용
ALTER TABLE company_modules ENABLE ROW LEVEL SECURITY;

-- 회사 소속 사용자가 자기 회사의 모듈 상태를 읽을 수 있도록
DROP POLICY IF EXISTS "users_read_own_company_modules" ON company_modules;
CREATE POLICY "users_read_own_company_modules" ON company_modules
  FOR SELECT
  USING (
    company_id IN (
      SELECT p.company_id FROM profiles p WHERE p.id = auth.uid()
    )
  );

-- god_admin은 전체 읽기 (이전에 추가한 것 유지)
DROP POLICY IF EXISTS "god_admin_read_all_company_modules" ON company_modules;
CREATE POLICY "god_admin_read_all_company_modules" ON company_modules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'god_admin'
    )
  );

-- 3. 확인
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('system_modules', 'company_modules')
ORDER BY tablename, policyname;
