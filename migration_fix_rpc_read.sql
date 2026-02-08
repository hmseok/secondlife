-- ============================================
-- 모듈 상태 읽기 RPC 추가 + RLS 정책 수정
-- 문제: god_admin이 company_modules SELECT 시 RLS에 막힘
-- ============================================

-- 1. god_admin용 company_modules 읽기 RPC
CREATE OR REPLACE FUNCTION get_all_company_modules()
RETURNS TABLE (
  id UUID,
  company_id UUID,
  module_id TEXT,
  is_active BOOLEAN
) AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'god_admin'
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT cm.id, cm.company_id, cm.module_id::text, cm.is_active
  FROM company_modules cm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. company_modules RLS 정책에 god_admin SELECT 허용
DO $$
BEGIN
  -- 기존 SELECT 정책이 있으면 삭제 후 재생성
  DROP POLICY IF EXISTS "god_admin_read_all_company_modules" ON company_modules;

  CREATE POLICY "god_admin_read_all_company_modules" ON company_modules
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'god_admin'
      )
    );
END $$;

SELECT '완료: god_admin 읽기 RPC + RLS 정책 추가' as result;
