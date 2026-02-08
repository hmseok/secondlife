-- =============================================
-- 회원가입 시스템 v2
-- 1. handle_new_user: 이름 저장 + 회사 비활성(승인대기)
-- 2. auto_create_defaults: 회사 생성 시 기본 직급/부서 자동 생성
-- 3. 기존 유저 데이터 수정
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- ==================
-- PART 1: 회원가입 트리거 재생성
-- ==================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _company_id UUID;
  _role TEXT;
  _company_name TEXT;
  _business_number TEXT;
  _full_name TEXT;
  _phone TEXT;
BEGIN
  _role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  _company_name := NEW.raw_user_meta_data->>'company_name';
  _business_number := NEW.raw_user_meta_data->>'business_number';
  _full_name := NEW.raw_user_meta_data->>'full_name';
  _phone := NEW.raw_user_meta_data->>'phone';

  -- 기업 대표(master): 회사 생성 (is_active = false → 승인 대기)
  IF _role = 'master' AND _company_name IS NOT NULL AND trim(_company_name) != '' THEN
    INSERT INTO public.companies (name, business_number, plan, is_active)
    VALUES (trim(_company_name), _business_number, 'free', false)
    RETURNING id INTO _company_id;
  END IF;

  -- 직원(user): 회사명으로 기존 회사 찾기
  IF _role = 'user' AND _company_name IS NOT NULL AND trim(_company_name) != '' THEN
    SELECT id INTO _company_id
    FROM public.companies
    WHERE lower(trim(name)) = lower(trim(_company_name))
    LIMIT 1;
  END IF;

  -- 프로필 생성 (is_active = false → 승인 대기)
  INSERT INTO public.profiles (id, email, role, company_id, employee_name, phone, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    _role,
    _company_id,
    _full_name,
    _phone,
    false
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error: % %', SQLERRM, SQLSTATE;
  BEGIN
    INSERT INTO public.profiles (id, email, role, is_active)
    VALUES (NEW.id, NEW.email, COALESCE(_role, 'user'), false)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'fallback profile insert failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ==================
-- PART 2: 회사 생성 시 기본 직급 + 부서 자동 생성
-- ==================
DROP TRIGGER IF EXISTS trigger_auto_create_defaults ON companies;
DROP FUNCTION IF EXISTS auto_create_company_defaults();

CREATE OR REPLACE FUNCTION auto_create_company_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- 기본 직급 생성
  INSERT INTO positions (company_id, name, level, description) VALUES
    (NEW.id, '대표', 1, '회사 대표 / 최고 권한'),
    (NEW.id, '이사', 2, '임원 / 고급 관리자'),
    (NEW.id, '부장', 3, '부서장'),
    (NEW.id, '차장', 4, '차장급'),
    (NEW.id, '과장', 5, '과장급'),
    (NEW.id, '대리', 6, '대리급'),
    (NEW.id, '주임', 7, '주임급'),
    (NEW.id, '사원', 8, '일반 직원')
  ON CONFLICT (company_id, name) DO NOTHING;

  -- 기본 부서 생성
  INSERT INTO departments (company_id, name, description) VALUES
    (NEW.id, '경영지원', '경영 및 관리 업무'),
    (NEW.id, '영업', '고객 영업 및 계약'),
    (NEW.id, '차량관리', '차량 정비 및 자산 관리'),
    (NEW.id, '재무', '재무 및 회계'),
    (NEW.id, '인사', '인사 및 총무')
  ON CONFLICT (company_id, name) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_create_defaults
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_company_defaults();

-- ==================
-- PART 3: 기존 데이터 수정 (fmi2bts 유저)
-- ==================

-- 기존 회사 is_active를 false로 (god_admin이 승인해줘야 함)
UPDATE companies SET is_active = false
WHERE name = '주식회사에프엠아이' AND is_active = true;

-- 기존 유저 이름 설정 + 비활성 (승인 대기)
UPDATE profiles
SET employee_name = '석호민',
    is_active = false
WHERE email = 'fmi2bts@gmail.com' AND (employee_name IS NULL OR employee_name = '');

-- 기존 회사에 기본 직급/부서 생성 (없는 경우만)
INSERT INTO positions (company_id, name, level, description)
SELECT c.id, v.name, v.level, v.description
FROM companies c
CROSS JOIN (VALUES
  ('대표', 1, '회사 대표 / 최고 권한'),
  ('이사', 2, '임원 / 고급 관리자'),
  ('부장', 3, '부서장'),
  ('차장', 4, '차장급'),
  ('과장', 5, '과장급'),
  ('대리', 6, '대리급'),
  ('주임', 7, '주임급'),
  ('사원', 8, '일반 직원')
) AS v(name, level, description)
WHERE NOT EXISTS (
  SELECT 1 FROM positions p WHERE p.company_id = c.id AND p.name = v.name
);

INSERT INTO departments (company_id, name, description)
SELECT c.id, v.name, v.description
FROM companies c
CROSS JOIN (VALUES
  ('경영지원', '경영 및 관리 업무'),
  ('영업', '고객 영업 및 계약'),
  ('차량관리', '차량 정비 및 자산 관리'),
  ('재무', '재무 및 회계'),
  ('인사', '인사 및 총무')
) AS v(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM departments d WHERE d.company_id = c.id AND d.name = v.name
);

-- god_admin(sukhomin87) 프로필은 항상 활성
UPDATE profiles SET is_active = true WHERE email = 'sukhomin87@gmail.com';

-- =============================================
-- 완료! 이제 가입 플로우:
-- 1. 기업 대표 가입 → 회사(비활성) + 프로필(비활성) 생성
-- 2. god_admin이 회사/가입 관리에서 승인
-- 3. 승인 시 회사 + 프로필 활성화
-- =============================================
