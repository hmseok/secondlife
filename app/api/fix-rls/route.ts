import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ============================================
// RLS 무한 재귀 수정 API
// 브라우저에서 /api/fix-rls 호출하면 실행됨
// service_role + pg-meta 엔드포인트로 DDL 실행
// ============================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// 실행할 SQL 목록 (순서대로)
const SQL_STATEMENTS = [
  // 1) 헬퍼 함수 생성 (SECURITY DEFINER = RLS 우회)
  `CREATE OR REPLACE FUNCTION get_my_company_id()
   RETURNS UUID AS $$
   BEGIN
     RETURN (SELECT company_id FROM profiles WHERE id = auth.uid());
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER STABLE`,

  `CREATE OR REPLACE FUNCTION get_my_role()
   RETURNS TEXT AS $$
   BEGIN
     RETURN (SELECT role FROM profiles WHERE id = auth.uid());
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER STABLE`,

  // 2) profiles 무한 재귀 정책 교체
  `DROP POLICY IF EXISTS "users_read_own_company_profiles" ON profiles`,
  `CREATE POLICY "users_read_own_company_profiles" ON profiles
   FOR SELECT USING (company_id IS NOT NULL AND company_id = get_my_company_id())`,

  // 3) companies
  `DROP POLICY IF EXISTS "users_read_own_company" ON companies`,
  `CREATE POLICY "users_read_own_company" ON companies
   FOR SELECT USING (id = get_my_company_id())`,

  // 4) positions
  `DROP POLICY IF EXISTS "users_read_own_company_positions" ON positions`,
  `CREATE POLICY "users_read_own_company_positions" ON positions
   FOR SELECT USING (company_id = get_my_company_id())`,

  // 5) departments
  `DROP POLICY IF EXISTS "users_read_own_company_departments" ON departments`,
  `CREATE POLICY "users_read_own_company_departments" ON departments
   FOR SELECT USING (company_id = get_my_company_id())`,

  // 6) company_modules
  `DROP POLICY IF EXISTS "users_read_own_company_modules" ON company_modules`,
  `CREATE POLICY "users_read_own_company_modules" ON company_modules
   FOR SELECT USING (company_id = get_my_company_id())`,

  // 7) page_permissions
  `DROP POLICY IF EXISTS "users_read_own_company_permissions" ON page_permissions`,
  `CREATE POLICY "users_read_own_company_permissions" ON page_permissions
   FOR SELECT USING (
     position_id IN (SELECT id FROM positions WHERE company_id = get_my_company_id())
   )`,

  `DROP POLICY IF EXISTS "master_manage_own_company_permissions" ON page_permissions`,
  `CREATE POLICY "master_manage_own_company_permissions" ON page_permissions
   FOR ALL USING (
     get_my_role() = 'master'
     AND position_id IN (SELECT id FROM positions WHERE company_id = get_my_company_id())
   )`,

  // 8) god_admin is_active 보장
  `UPDATE profiles SET is_active = true WHERE role = 'god_admin'`,

  // 9) company_id NULL 허용
  `ALTER TABLE profiles ALTER COLUMN company_id DROP NOT NULL`,
]

async function executeSqlViaPgMeta(sql: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Supabase pg-meta 엔드포인트로 SQL 실행
    const res = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'x-connection-encrypted': 'true',
      },
      body: JSON.stringify({ query: sql }),
    })

    if (res.ok) {
      return { success: true }
    }

    const text = await res.text()
    return { success: false, error: `HTTP ${res.status}: ${text}` }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

async function executeSqlViaRest(sql: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 대안: REST API의 /rest/v1/ 직접 호출은 DDL 불가
    // Supabase Dashboard API 사용 시도
    const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '')

    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    })

    if (res.ok) {
      return { success: true }
    }

    const text = await res.text()
    return { success: false, error: `HTTP ${res.status}: ${text}` }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function GET() {
  const results: { sql: string; success: boolean; error?: string }[] = []
  let method = 'pg-meta'

  for (const sql of SQL_STATEMENTS) {
    const shortSql = sql.substring(0, 80).replace(/\s+/g, ' ').trim() + '...'

    // 먼저 pg-meta 시도
    let result = await executeSqlViaPgMeta(sql)

    // pg-meta 실패 시 REST API 시도
    if (!result.success && results.length === 0) {
      method = 'rest-api'
      result = await executeSqlViaRest(sql)
    } else if (!result.success && method === 'rest-api') {
      result = await executeSqlViaRest(sql)
    }

    results.push({ sql: shortSql, ...result })

    // 실패한 명령이 있으면 나머지도 계속 시도 (DROP은 실패해도 OK)
  }

  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length

  return NextResponse.json({
    method,
    summary: `${successCount} 성공 / ${failCount} 실패 (총 ${results.length}개)`,
    results,
  })
}
