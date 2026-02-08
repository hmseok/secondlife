-- ============================================
-- 삭제된 모듈 정리 SQL
-- 공통코드, 차종코드, DB 페이지 관련 모듈 제거
-- Supabase SQL Editor에서 실행
-- ============================================

-- 1. company_modules에서 해당 모듈 제거
DELETE FROM company_modules
WHERE module_id IN (
  SELECT id FROM system_modules
  WHERE path IN (
    '/db/models', '/db/maintenance', '/db/codes',
    '/db/depreciation', '/db/lotte'
  )
);

-- 2. page_permissions에서 해당 페이지 경로 제거
DELETE FROM page_permissions
WHERE page_path IN (
  '/db/models', '/db/maintenance', '/db/codes',
  '/db/depreciation', '/db/lotte',
  '/admin/model', '/admin/codes'
);

-- 3. system_modules에서 해당 모듈 제거
DELETE FROM system_modules
WHERE path IN (
  '/db/models', '/db/maintenance', '/db/codes',
  '/db/depreciation', '/db/lotte'
);

-- 확인
SELECT path, name FROM system_modules ORDER BY path;
