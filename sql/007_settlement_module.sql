-- ============================================
-- 007: 매출 회계 정산 모듈 등록
-- ============================================

-- 1. system_modules에 매출 회계 정산 페이지 추가
INSERT INTO system_modules (name, path, icon_key, description)
VALUES ('매출/정산', '/finance/settlement', 'Chart', '매출 분석, 정산 현황, 손익계산서, 정산 실행')
ON CONFLICT (path) DO NOTHING;

-- 2. 기존 활성 회사들에 자동 활성화
-- (이미 /finance 모듈을 사용 중인 회사는 /finance/settlement도 활성화)
INSERT INTO company_modules (company_id, module_id, is_active)
SELECT cm.company_id, sm.id, true
FROM company_modules cm
JOIN system_modules sm_finance ON cm.module_id = sm_finance.id AND sm_finance.path = '/finance'
CROSS JOIN system_modules sm
WHERE sm.path = '/finance/settlement'
  AND cm.is_active = true
ON CONFLICT DO NOTHING;
