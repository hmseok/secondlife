-- ============================================
-- company_modules UNIQUE 제약조건 추가
-- upsert가 동작하려면 반드시 필요
-- Supabase SQL Editor에서 실행
-- ============================================

-- 1. 중복 데이터 먼저 정리 (혹시 있으면)
DELETE FROM company_modules a
USING company_modules b
WHERE a.ctid < b.ctid
  AND a.company_id = b.company_id
  AND a.module_id = b.module_id;

-- 2. UNIQUE 제약조건 추가
ALTER TABLE company_modules
  ADD CONSTRAINT company_modules_company_module_unique
  UNIQUE (company_id, module_id);

SELECT '완료: company_modules UNIQUE 제약조건 추가됨' as result;
