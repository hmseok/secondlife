-- ============================================
-- 모듈 토글 RPC 함수 (RLS 우회)
-- + company_modules UNIQUE 제약조건
-- Supabase SQL Editor에서 실행
-- ============================================

-- 1. 중복 데이터 정리
DELETE FROM company_modules a
USING company_modules b
WHERE a.ctid < b.ctid
  AND a.company_id = b.company_id
  AND a.module_id = b.module_id;

-- 2. UNIQUE 제약조건 추가 (이미 있으면 무시)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'company_modules_company_module_unique'
  ) THEN
    ALTER TABLE company_modules
      ADD CONSTRAINT company_modules_company_module_unique
      UNIQUE (company_id, module_id);
  END IF;
END $$;

-- 3. 단일 모듈 토글 함수
CREATE OR REPLACE FUNCTION toggle_company_module(
  target_company_id UUID,
  target_module_id UUID,
  new_active BOOLEAN
)
RETURNS JSON AS $$
BEGIN
  -- god_admin 체크
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'god_admin'
  ) THEN
    RETURN json_build_object('success', false, 'error', '권한이 없습니다');
  END IF;

  INSERT INTO company_modules (company_id, module_id, is_active)
  VALUES (target_company_id, target_module_id, new_active)
  ON CONFLICT (company_id, module_id)
  DO UPDATE SET is_active = new_active;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 전체 ON/OFF 함수 (회사별 일괄)
CREATE OR REPLACE FUNCTION toggle_all_company_modules(
  target_company_id UUID,
  new_active BOOLEAN
)
RETURNS JSON AS $$
BEGIN
  -- god_admin 체크
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'god_admin'
  ) THEN
    RETURN json_build_object('success', false, 'error', '권한이 없습니다');
  END IF;

  INSERT INTO company_modules (company_id, module_id, is_active)
  SELECT target_company_id, id, new_active
  FROM system_modules
  ON CONFLICT (company_id, module_id)
  DO UPDATE SET is_active = new_active;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '완료: 모듈 토글 RPC 함수 생성됨' as result;
