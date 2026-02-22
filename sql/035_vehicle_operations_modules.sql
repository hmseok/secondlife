-- ============================================
-- 035: 차량운영 모듈 등록 (출고/반납, 정비/검사, 사고관리)
-- system_modules에 등록 후, 각 회사에 자동 활성화
-- ============================================

-- 1. system_modules에 차량운영 페이지들 추가
INSERT INTO system_modules (name, path, icon_key, description)
SELECT '출고/반납 관리', '/operations', 'Truck', '차량 출고/반납 일정 및 진행 관리'
WHERE NOT EXISTS (SELECT 1 FROM system_modules WHERE path = '/operations');

INSERT INTO system_modules (name, path, icon_key, description)
SELECT '정비/검사 관리', '/maintenance', 'WrenchScrewdriver', '정비 이력 및 법정검사 일정 관리'
WHERE NOT EXISTS (SELECT 1 FROM system_modules WHERE path = '/maintenance');

INSERT INTO system_modules (name, path, icon_key, description)
SELECT '사고 관리', '/accidents', 'ExclamationTriangle', '사고 접수, 보험 처리, 수리 진행 관리'
WHERE NOT EXISTS (SELECT 1 FROM system_modules WHERE path = '/accidents');

-- 2. 모든 활성 회사에 자동 활성화 (company_modules)
INSERT INTO company_modules (company_id, module_id, is_active)
SELECT c.id, m.id, true
FROM companies c
CROSS JOIN system_modules m
WHERE m.path IN ('/operations', '/maintenance', '/accidents')
  AND c.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM company_modules cm
    WHERE cm.company_id = c.id AND cm.module_id = m.id
  );
