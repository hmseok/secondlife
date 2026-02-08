-- RPC 함수 TEXT→UUID 캐스팅 수정
-- "company_id is of type uuid but expression is of type text" 해결

DROP FUNCTION IF EXISTS toggle_company_module(TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS toggle_all_company_modules(TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION toggle_company_module(
  target_company_id TEXT,
  target_module_id TEXT,
  new_active BOOLEAN
)
RETURNS JSON AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'god_admin'
  ) THEN
    RETURN json_build_object('success', false, 'error', '권한이 없습니다');
  END IF;

  INSERT INTO company_modules (company_id, module_id, is_active)
  VALUES (target_company_id::uuid, target_module_id::uuid, new_active)
  ON CONFLICT (company_id, module_id)
  DO UPDATE SET is_active = new_active;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION toggle_all_company_modules(
  target_company_id TEXT,
  new_active BOOLEAN
)
RETURNS JSON AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'god_admin'
  ) THEN
    RETURN json_build_object('success', false, 'error', '권한이 없습니다');
  END IF;

  INSERT INTO company_modules (company_id, module_id, is_active)
  SELECT target_company_id::uuid, id, new_active
  FROM system_modules
  ON CONFLICT (company_id, module_id)
  DO UPDATE SET is_active = new_active;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '완료: RPC 함수 UUID 캐스팅 수정' as result;
