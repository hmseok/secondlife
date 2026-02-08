-- ============================================
-- 회사 승인/거부 RPC 함수 (RLS 우회)
-- Supabase SQL Editor에서 실행
-- ============================================

-- 1. 회사 승인 함수
CREATE OR REPLACE FUNCTION approve_company(target_company_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- god_admin 체크
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'god_admin'
  ) THEN
    RETURN json_build_object('success', false, 'error', '권한이 없습니다');
  END IF;

  -- 회사 활성화
  UPDATE companies SET is_active = true WHERE id = target_company_id;

  -- master 유저 활성화
  UPDATE profiles SET is_active = true
  WHERE company_id = target_company_id AND role = 'master';

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 회사 거부(삭제) 함수
CREATE OR REPLACE FUNCTION reject_company(target_company_id UUID)
RETURNS JSON AS $$
BEGIN
  -- god_admin 체크
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'god_admin'
  ) THEN
    RETURN json_build_object('success', false, 'error', '권한이 없습니다');
  END IF;

  -- 관련 데이터 순서대로 삭제
  DELETE FROM page_permissions WHERE company_id = target_company_id;
  DELETE FROM company_modules WHERE company_id = target_company_id;
  DELETE FROM profiles WHERE company_id = target_company_id;
  DELETE FROM positions WHERE company_id = target_company_id;
  DELETE FROM departments WHERE company_id = target_company_id;
  DELETE FROM companies WHERE id = target_company_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 유저 활성화/비활성화 토글 함수
CREATE OR REPLACE FUNCTION toggle_user_active(target_user_id UUID, new_active BOOLEAN)
RETURNS JSON AS $$
BEGIN
  -- god_admin 또는 같은 회사 master 체크
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND (
      role = 'god_admin'
      OR (role = 'master' AND company_id = (SELECT company_id FROM profiles WHERE id = target_user_id))
    )
  ) THEN
    RETURN json_build_object('success', false, 'error', '권한이 없습니다');
  END IF;

  UPDATE profiles SET is_active = new_active WHERE id = target_user_id;
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 기존 회사의 직급/부서가 없으면 기본값 생성하는 함수
CREATE OR REPLACE FUNCTION ensure_company_defaults(target_company_id UUID)
RETURNS void AS $$
BEGIN
  -- 기본 직급 (없는 경우만)
  INSERT INTO positions (company_id, name, level) VALUES
    (target_company_id, '대표', 1),
    (target_company_id, '이사', 2),
    (target_company_id, '부장', 3),
    (target_company_id, '차장', 4),
    (target_company_id, '과장', 5),
    (target_company_id, '대리', 6),
    (target_company_id, '주임', 7),
    (target_company_id, '사원', 8)
  ON CONFLICT DO NOTHING;

  -- 기본 부서 (없는 경우만)
  INSERT INTO departments (company_id, name) VALUES
    (target_company_id, '경영지원'),
    (target_company_id, '영업'),
    (target_company_id, '차량관리'),
    (target_company_id, '재무'),
    (target_company_id, '인사')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'RPC 함수 생성 완료' as result;
