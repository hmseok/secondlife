-- ============================================
-- Self-Disruption ERP - RBAC 마이그레이션
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- 1. 직급 테이블
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  level INT NOT NULL DEFAULT 4,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_positions_company ON positions(company_id);

-- 2. 부서 테이블
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_departments_company ON departments(company_id);

-- 3. profiles 테이블 확장 (이미 존재하는 테이블에 컬럼 추가)
DO $$
BEGIN
  -- position_id 컬럼
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='position_id') THEN
    ALTER TABLE public.profiles ADD COLUMN position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL;
  END IF;
  -- department_id 컬럼
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='department_id') THEN
    ALTER TABLE public.profiles ADD COLUMN department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;
  END IF;
  -- employee_name 컬럼
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='employee_name') THEN
    ALTER TABLE public.profiles ADD COLUMN employee_name VARCHAR(100);
  END IF;
  -- phone 컬럼
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='phone') THEN
    ALTER TABLE public.profiles ADD COLUMN phone VARCHAR(20);
  END IF;
  -- is_active 컬럼
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_active') THEN
    ALTER TABLE public.profiles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_position ON profiles(position_id);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department_id);

-- 4. 페이지별 권한 테이블
CREATE TABLE IF NOT EXISTS public.page_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  page_path VARCHAR(255) NOT NULL,
  can_view BOOLEAN DEFAULT FALSE,
  can_create BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  data_scope VARCHAR(50) DEFAULT 'all',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, position_id, page_path)
);

CREATE INDEX IF NOT EXISTS idx_pp_company ON page_permissions(company_id);
CREATE INDEX IF NOT EXISTS idx_pp_position ON page_permissions(position_id);
CREATE INDEX IF NOT EXISTS idx_pp_path ON page_permissions(page_path);

-- ============================================
-- 기본 데이터 삽입
-- ============================================

-- 각 회사에 기본 직급 4개 생성
INSERT INTO positions (company_id, name, level, description)
SELECT c.id, '대표', 1, '회사 대표 / 최고 권한'
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM positions p WHERE p.company_id = c.id AND p.name = '대표'
);

INSERT INTO positions (company_id, name, level, description)
SELECT c.id, '이사', 2, '임원 / 고급 관리자'
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM positions p WHERE p.company_id = c.id AND p.name = '이사'
);

INSERT INTO positions (company_id, name, level, description)
SELECT c.id, '팀장', 3, '중간 관리자'
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM positions p WHERE p.company_id = c.id AND p.name = '팀장'
);

INSERT INTO positions (company_id, name, level, description)
SELECT c.id, '사원', 4, '일반 직원'
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM positions p WHERE p.company_id = c.id AND p.name = '사원'
);

-- 각 회사에 기본 부서 3개 생성
INSERT INTO departments (company_id, name, description)
SELECT c.id, '경영지원', '경영 및 관리 업무'
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM departments d WHERE d.company_id = c.id AND d.name = '경영지원'
);

INSERT INTO departments (company_id, name, description)
SELECT c.id, '영업', '고객 영업 및 계약'
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM departments d WHERE d.company_id = c.id AND d.name = '영업'
);

INSERT INTO departments (company_id, name, description)
SELECT c.id, '차량관리', '차량 정비 및 자산 관리'
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM departments d WHERE d.company_id = c.id AND d.name = '차량관리'
);

-- 대표 직급에 모든 페이지 전체 권한 부여
DO $$
DECLARE
  _company_id UUID;
  _position_id UUID;
  _page TEXT;
  _pages TEXT[] := ARRAY[
    '/cars', '/registration', '/insurance',
    '/quotes', '/customers', '/contracts',
    '/jiip', '/invest', '/loans',
    '/finance', '/finance/upload',
    '/db/models', '/db/maintenance', '/db/codes', '/db/depreciation', '/db/lotte'
  ];
BEGIN
  FOR _company_id, _position_id IN
    SELECT p.company_id, p.id FROM positions p WHERE p.name = '대표'
  LOOP
    FOREACH _page IN ARRAY _pages
    LOOP
      INSERT INTO page_permissions (company_id, position_id, page_path, can_view, can_create, can_edit, can_delete, data_scope)
      VALUES (_company_id, _position_id, _page, TRUE, TRUE, TRUE, TRUE, 'all')
      ON CONFLICT (company_id, position_id, page_path) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- 이사 직급: 모든 페이지 조회+생성+수정, 삭제는 일부만
DO $$
DECLARE
  _company_id UUID;
  _position_id UUID;
  _page TEXT;
  _pages TEXT[] := ARRAY[
    '/cars', '/registration', '/insurance',
    '/quotes', '/customers', '/contracts',
    '/jiip', '/invest', '/loans',
    '/finance', '/finance/upload',
    '/db/models', '/db/maintenance', '/db/codes', '/db/depreciation', '/db/lotte'
  ];
BEGIN
  FOR _company_id, _position_id IN
    SELECT p.company_id, p.id FROM positions p WHERE p.name = '이사'
  LOOP
    FOREACH _page IN ARRAY _pages
    LOOP
      INSERT INTO page_permissions (company_id, position_id, page_path, can_view, can_create, can_edit, can_delete, data_scope)
      VALUES (_company_id, _position_id, _page, TRUE, TRUE, TRUE, FALSE, 'all')
      ON CONFLICT (company_id, position_id, page_path) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- 팀장 직급: 핵심 업무 페이지만, 자기 부서 데이터
DO $$
DECLARE
  _company_id UUID;
  _position_id UUID;
  _page TEXT;
  _pages TEXT[] := ARRAY[
    '/cars', '/registration', '/insurance',
    '/quotes', '/customers', '/contracts',
    '/loans', '/finance'
  ];
BEGIN
  FOR _company_id, _position_id IN
    SELECT p.company_id, p.id FROM positions p WHERE p.name = '팀장'
  LOOP
    FOREACH _page IN ARRAY _pages
    LOOP
      INSERT INTO page_permissions (company_id, position_id, page_path, can_view, can_create, can_edit, can_delete, data_scope)
      VALUES (_company_id, _position_id, _page, TRUE, TRUE, TRUE, FALSE, 'department')
      ON CONFLICT (company_id, position_id, page_path) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- 사원 직급: 기본 업무 조회 + 생성만
DO $$
DECLARE
  _company_id UUID;
  _position_id UUID;
  _page TEXT;
  _pages TEXT[] := ARRAY[
    '/cars', '/registration', '/insurance',
    '/quotes', '/customers'
  ];
BEGIN
  FOR _company_id, _position_id IN
    SELECT p.company_id, p.id FROM positions p WHERE p.name = '사원'
  LOOP
    FOREACH _page IN ARRAY _pages
    LOOP
      INSERT INTO page_permissions (company_id, position_id, page_path, can_view, can_create, can_edit, can_delete, data_scope)
      VALUES (_company_id, _position_id, _page, TRUE, TRUE, FALSE, FALSE, 'own')
      ON CONFLICT (company_id, position_id, page_path) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ============================================
-- 완료! 이 SQL을 Supabase SQL Editor에서 실행하세요.
-- ============================================
