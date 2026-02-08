-- ============================================
-- UUID 오류 + 모듈 동기화 통합 마이그레이션
-- FK 해제 → UUID 변환 → 모듈 동기화 → FK 복원
-- Supabase SQL Editor에서 실행
-- ============================================

-- 0단계: FK 제약조건 일시 해제
ALTER TABLE company_modules
  DROP CONSTRAINT IF EXISTS company_modules_module_id_fkey;

-- 1단계: 삭제된 모듈 정리
DELETE FROM company_modules
WHERE module_id IN (
  SELECT id FROM system_modules
  WHERE path IN (
    '/db/models', '/db/maintenance', '/db/codes',
    '/db/depreciation', '/db/lotte',
    '/admin/model', '/admin/codes'
  )
);

DELETE FROM page_permissions
WHERE page_path IN (
  '/db/models', '/db/maintenance', '/db/codes',
  '/db/depreciation', '/db/lotte',
  '/admin/model', '/admin/codes'
);

DELETE FROM system_modules
WHERE path IN (
  '/db/models', '/db/maintenance', '/db/codes',
  '/db/depreciation', '/db/lotte',
  '/admin/model', '/admin/codes'
);

-- 2단계: 비정상 UUID → 정상 UUID로 변환
DO $$
DECLARE
  rec RECORD;
  new_uuid UUID;
BEGIN
  FOR rec IN
    SELECT id, path, name FROM system_modules
    WHERE id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  LOOP
    new_uuid := gen_random_uuid();
    UPDATE company_modules SET module_id = new_uuid::text WHERE module_id = rec.id;
    UPDATE system_modules SET id = new_uuid::text WHERE id = rec.id;
    RAISE NOTICE 'UUID 변환: % → % (%)', rec.id, new_uuid, rec.path;
  END LOOP;
END $$;

-- 3단계: 임시 테이블로 모듈 정의
CREATE TEMP TABLE _target_modules (
  path TEXT,
  name TEXT,
  icon_key TEXT
);

INSERT INTO _target_modules (path, name, icon_key) VALUES
  ('/cars',         '차량 관리',  'Car'),
  ('/insurance',    '보험/정비',  'Shield'),
  ('/registration', '등록/이전',  'Clipboard'),
  ('/quotes',       '견적/계약',  'Doc'),
  ('/customers',    '고객 관리',  'Users'),
  ('/finance',      '재무 관리',  'Money'),
  ('/loans',        '대출 관리',  'Building'),
  ('/invest',       '일반투자',   'Chart'),
  ('/jiip',         '지입투자',   'Truck');

-- 없는 모듈 INSERT
INSERT INTO system_modules (id, path, name, icon_key)
SELECT gen_random_uuid(), t.path, t.name, t.icon_key
FROM _target_modules t
WHERE NOT EXISTS (SELECT 1 FROM system_modules s WHERE s.path = t.path);

-- 있는 모듈 icon_key/name 업데이트
UPDATE system_modules s
SET icon_key = t.icon_key, name = t.name
FROM _target_modules t
WHERE s.path = t.path;

-- 유효하지 않은 모듈 삭제
DELETE FROM company_modules
WHERE module_id IN (
  SELECT id FROM system_modules
  WHERE path NOT IN (SELECT path FROM _target_modules)
);

DELETE FROM system_modules
WHERE path NOT IN (SELECT path FROM _target_modules);

-- 고아 레코드 제거
DELETE FROM company_modules
WHERE module_id NOT IN (SELECT id FROM system_modules);

DROP TABLE _target_modules;

-- 4단계: FK 복원
ALTER TABLE company_modules
  ADD CONSTRAINT company_modules_module_id_fkey
  FOREIGN KEY (module_id) REFERENCES system_modules(id)
  ON DELETE CASCADE;

-- 5단계: UNIQUE 제약조건
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'company_modules_company_module_unique'
  ) THEN
    DELETE FROM company_modules a
    USING company_modules b
    WHERE a.ctid < b.ctid
      AND a.company_id = b.company_id
      AND a.module_id = b.module_id;

    ALTER TABLE company_modules
      ADD CONSTRAINT company_modules_company_module_unique
      UNIQUE (company_id, module_id);
  END IF;
END $$;

-- 6단계: RPC 함수 재생성 (TEXT 파라미터)
DROP FUNCTION IF EXISTS toggle_company_module(UUID, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS toggle_company_module(TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS toggle_all_company_modules(UUID, BOOLEAN);
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
  VALUES (target_company_id, target_module_id, new_active)
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
  SELECT target_company_id, id, new_active
  FROM system_modules
  ON CONFLICT (company_id, module_id)
  DO UPDATE SET is_active = new_active;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7단계: 결과 확인
SELECT id, name, path, icon_key,
  CASE WHEN id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN 'OK' ELSE 'BAD'
  END as uuid_check
FROM system_modules ORDER BY path;
