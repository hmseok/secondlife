-- =============================================
-- 004. handle_new_user 트리거 수정
-- =============================================
-- 문제: profiles.email 컬럼 누락 → god_admin 초대 가입 시 오류
-- 수정: email 포함 + 방어적 코딩 + 에러 로깅
--
-- Supabase SQL Editor에서 실행하세요.
-- =============================================


-- =============================================
-- STEP 1: 진단 쿼리 (먼저 실행해서 현재 상태 확인)
-- =============================================

-- profiles 테이블 컬럼 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- admin_invite_codes 테이블 존재 확인
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'admin_invite_codes'
) AS admin_invite_codes_exists;


-- =============================================
-- STEP 2: email 컬럼 보장 (없으면 추가, 있으면 스킵)
-- =============================================

DO $$
BEGIN
  -- email 컬럼이 없으면 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
    RAISE NOTICE 'email 컬럼 추가됨';
  ELSE
    -- email이 NOT NULL이면 NULL 허용으로 변경
    ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;
    RAISE NOTICE 'email 컬럼 이미 존재 — NOT NULL 해제';
  END IF;

  -- company_id NOT NULL 다시 한번 확인/해제
  ALTER TABLE public.profiles ALTER COLUMN company_id DROP NOT NULL;
END $$;


-- =============================================
-- STEP 3: 기존 프로필에 email 채우기 (auth.users에서)
-- =============================================

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND (p.email IS NULL OR p.email = '');


-- =============================================
-- STEP 4: handle_new_user() 트리거 함수 재생성
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _role TEXT;
  _company_id UUID;
  _company_name TEXT;
  _business_number TEXT;
  _invite_code TEXT;
BEGIN
  -- 메타데이터에서 역할/회사 정보 추출
  _role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  _company_name := NEW.raw_user_meta_data->>'company_name';
  _business_number := NEW.raw_user_meta_data->>'business_number';
  _invite_code := NEW.raw_user_meta_data->>'admin_invite_code';

  -- ★ 관리자 초대 코드가 있는 경우 → 플랫폼 관리자로 가입
  IF _invite_code IS NOT NULL AND _invite_code != '' THEN
    -- 프로필 생성 (회사 없음, email 포함)
    INSERT INTO public.profiles (id, email, role, company_id, employee_name, phone, is_active)
    VALUES (
      NEW.id,
      NEW.email,
      'god_admin',
      NULL,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'phone', ''),
      true  -- 관리자는 즉시 활성
    );

    -- 초대 코드 소비 (테이블 존재 시에만)
    BEGIN
      UPDATE admin_invite_codes
      SET used_by = NEW.id, used_at = NOW()
      WHERE code = _invite_code
        AND used_by IS NULL
        AND expires_at > NOW();
    EXCEPTION WHEN OTHERS THEN
      -- 초대 코드 소비 실패해도 가입은 진행
      RAISE WARNING 'admin_invite_codes 업데이트 실패: %', SQLERRM;
    END;

    RETURN NEW;
  END IF;

  -- ★ founder(master) 가입 → 회사 생성 + 프로필
  IF _role = 'master' AND _company_name IS NOT NULL THEN
    INSERT INTO public.companies (name, business_number, plan, is_active)
    VALUES (_company_name, _business_number, 'free', false)
    RETURNING id INTO _company_id;

    INSERT INTO public.profiles (id, email, role, company_id, employee_name, phone, is_active)
    VALUES (
      NEW.id,
      NEW.email,
      'master',
      _company_id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'phone', ''),
      false  -- 승인 대기
    );

    -- 기본 모듈 배정
    INSERT INTO company_modules (company_id, module_id, is_active)
    SELECT _company_id, sm.id, (COALESCE(sm.plan_group, 'free') = 'free')
    FROM system_modules sm
    ON CONFLICT (company_id, module_id) DO NOTHING;

    -- 기본 직급/부서 생성
    INSERT INTO positions (company_id, name, level, description) VALUES
      (_company_id, '대표', 1, '회사 대표 / 최고 권한'),
      (_company_id, '이사', 2, '임원 / 고급 관리자'),
      (_company_id, '팀장', 3, '중간 관리자'),
      (_company_id, '사원', 4, '일반 직원');

    INSERT INTO departments (company_id, name, description) VALUES
      (_company_id, '경영지원', '경영 및 관리 업무'),
      (_company_id, '영업', '고객 영업 및 계약'),
      (_company_id, '차량관리', '차량 정비 및 자산 관리');

    RETURN NEW;
  END IF;

  -- ★ employee(user) 가입 → 프로필만 (회사는 나중에 배정)
  INSERT INTO public.profiles (id, email, role, company_id, employee_name, phone, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    'user',
    NULL,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 재생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================
-- STEP 5: 확인
-- =============================================
SELECT '✅ 004_fix_handle_new_user.sql 완료' AS result;
SELECT '  - email 컬럼 보장' AS detail
UNION ALL SELECT '  - handle_new_user() email 포함으로 재생성'
UNION ALL SELECT '  - 초대 코드 소비 에러 방어 추가'
UNION ALL SELECT '  - 트리거 재생성 완료';
