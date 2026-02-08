-- ============================================
-- 회원가입 중복 검증용 RPC 함수들
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- 1. 이메일 중복 체크 (auth.users 테이블)
CREATE OR REPLACE FUNCTION check_email_exists(check_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE email = lower(trim(check_email))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 전화번호 중복 체크 (profiles 테이블)
CREATE OR REPLACE FUNCTION check_phone_exists(check_phone TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  clean_phone TEXT;
BEGIN
  -- 숫자만 추출
  clean_phone := regexp_replace(check_phone, '[^0-9]', '', 'g');
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE regexp_replace(phone, '[^0-9]', '', 'g') = clean_phone
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 사업자번호 중복 체크 (companies 테이블)
CREATE OR REPLACE FUNCTION check_business_number_exists(check_bn TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  clean_bn TEXT;
BEGIN
  -- 숫자만 추출 (하이픈 등 제거)
  clean_bn := regexp_replace(check_bn, '[^0-9]', '', 'g');
  IF clean_bn = '' OR length(clean_bn) < 10 THEN
    RETURN FALSE; -- 사업자번호가 비어있거나 짧으면 검사 안함
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM companies WHERE regexp_replace(business_number, '[^0-9]', '', 'g') = clean_bn
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 회사명 중복 체크 (companies 테이블)
CREATE OR REPLACE FUNCTION check_company_name_exists(check_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM companies WHERE lower(trim(name)) = lower(trim(check_name))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 통합 회원가입 검증 함수 (한번의 호출로 전체 검증)
CREATE OR REPLACE FUNCTION validate_signup(
  p_email TEXT,
  p_phone TEXT,
  p_company_name TEXT DEFAULT NULL,
  p_business_number TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  errors JSONB := '[]'::JSONB;
  clean_phone TEXT;
  clean_bn TEXT;
BEGIN
  -- 이메일 중복
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = lower(trim(p_email))) THEN
    errors := errors || '["email_exists"]'::JSONB;
  END IF;

  -- 전화번호 중복
  clean_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
  IF length(clean_phone) >= 10 AND EXISTS (
    SELECT 1 FROM profiles WHERE regexp_replace(phone, '[^0-9]', '', 'g') = clean_phone
  ) THEN
    errors := errors || '["phone_exists"]'::JSONB;
  END IF;

  -- 회사명 중복 (대표자 가입 시)
  IF p_company_name IS NOT NULL AND trim(p_company_name) != '' THEN
    IF EXISTS (SELECT 1 FROM companies WHERE lower(trim(name)) = lower(trim(p_company_name))) THEN
      errors := errors || '["company_exists"]'::JSONB;
    END IF;
  END IF;

  -- 사업자번호 중복 (대표자 가입 시)
  IF p_business_number IS NOT NULL AND trim(p_business_number) != '' THEN
    clean_bn := regexp_replace(p_business_number, '[^0-9]', '', 'g');
    IF length(clean_bn) >= 10 AND EXISTS (
      SELECT 1 FROM companies WHERE regexp_replace(business_number, '[^0-9]', '', 'g') = clean_bn
    ) THEN
      errors := errors || '["business_number_exists"]'::JSONB;
    END IF;
  END IF;

  RETURN json_build_object('valid', jsonb_array_length(errors) = 0, 'errors', errors);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 호출 권한 부여 (anon 사용자도 호출 가능하도록)
GRANT EXECUTE ON FUNCTION check_email_exists(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_phone_exists(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_business_number_exists(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_company_name_exists(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION validate_signup(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
