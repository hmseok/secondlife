-- 008: 리포트/통계 모듈 등록
-- ============================================

-- system_modules에 리포트 모듈 등록
INSERT INTO system_modules (name, path, icon_key, description)
VALUES ('리포트/통계', '/report', 'Chart', '종합 경영 리포트: 매출/비용 분석, 차량 운용, 투자/파트너 현황')
ON CONFLICT (path) DO NOTHING;

-- 기존에 /finance 모듈을 사용하는 회사에 자동 활성화
INSERT INTO company_modules (company_id, module_id, is_active)
SELECT cm.company_id, sm.id, true
FROM company_modules cm
JOIN system_modules sm_finance ON cm.module_id = sm_finance.id AND sm_finance.path = '/finance'
CROSS JOIN system_modules sm ON sm.path = '/report'
WHERE cm.is_active = true
ON CONFLICT DO NOTHING;
