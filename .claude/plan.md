# 렌트가 산출 — 신규 감가율 테이블 연동 및 산출가 매칭 검증

## 현황 분석

### 현재 RentPricingBuilder 감가 로직 (문제점)
1. `mapToDepCategory()` → "국산 중형 세단" 같은 flat 카테고리 문자열 반환
2. `depreciation_db` (old) 테이블에서 category 매칭 → depYear1Rate/depYear2Rate 초기값 설정
3. 실제 계산은 `DEP_CURVE_PRESETS` 하드코딩 3개 곡선 + `DEP_CLASS_MULTIPLIER` 하드코딩 16개 보정계수
4. 새로 만든 `depreciation_rates` (3축), `depreciation_adjustments` (보정계수) 전혀 연동 안 됨
5. 산출가와 기준표 매칭 검증 불가

## 구현 계획

### 1단계: mapToDepCategory → mapToDepAxes 3축 전환
- 반환값: `{ origin, vehicle_class, fuel_type }` (depreciation_rates 테이블 컬럼과 1:1 매칭)
- 기존 브랜드/모델/가격 판별 로직 유지, 출력만 3축으로 분해
- `DEP_CLASS_MULTIPLIER` static 맵 제거 → DB rate_1yr~rate_5yr 직접 사용

### 2단계: DB fetch 전환
- `depreciation_db` → `depreciation_rates` + `depreciation_adjustments` 동시 fetch
- state: `depreciationDB` → `depRates`, `depAdjustments`

### 3단계: DB 기반 동적 감가 곡선 생성
- rate_1yr(잔존율%)~rate_5yr → 감가율 곡선 자동 변환
  - 예: rate_1yr=80.0 → 1년차 감가 20%, rate_2yr=68.0 → 2년차 감가 32%
- 새 프리셋 'db_based' 추가 (기본값) → 기존 3프리셋은 수동 오버라이드용 유지
- `applyReferenceTableMappings()`에서 3축 매칭 → 동적 곡선 자동 적용

### 4단계: 보정계수 연동
- `depreciation_adjustments` 3종 (mileage/market_condition/popularity) 연동
- 주행거리: annualMileage 값 → 자동 매칭 mileage factor
- 시장상황: is_active=true인 market_condition factor 자동 적용
- 인기도: UI 드롭다운 추가 (A/B/C등급)
- calculations useMemo 내 잔존가치에 보정계수 곱셈

### 5단계: UI 업데이트
- 감가 설정 섹션에 3축 분류 배지 + 보정계수 현황 표시
- 곡선 프리셋에 '기준표 기반' 옵션 추가
- 인기도 등급 선택 드롭다운

### 6단계: 산출가 매칭 검증
- 대표 차종 5~6개 검증 (경차/중형/SUV/수입/전기)
- 3축 매핑 → DB 감가율 → 곡선 변환 → 잔존가치 → 월감가비 → 최종 렌트가
- 보정계수 적용 전/후 비교
- TypeScript 빌드 통과 확인
