import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ============================================
// 삭제된 system_modules 복구 API
// GET /api/restore-modules → 현재 모듈 조회 + 누락 모듈 자동 복구
// ============================================

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// 원래 있어야 하는 8개 핵심 모듈
const EXPECTED_MODULES = [
  { name: '등록/이전', path: '/registration', icon_key: 'Car', description: '차량 등록증 관리', plan_group: 'free' },
  { name: '보험/가입', path: '/insurance', icon_key: 'Shield', description: '보험 가입 및 관리', plan_group: 'free' },
  { name: '고객 관리', path: '/customers', icon_key: 'Users', description: '고객 정보 관리', plan_group: 'basic' },
  { name: '견적/계약', path: '/quotes', icon_key: 'Clipboard', description: '견적서 및 계약 관리', plan_group: 'basic' },
  { name: '재무관리', path: '/finance', icon_key: 'Money', description: '수입/지출 및 재무 관리', plan_group: 'basic' },
  { name: '대출', path: '/loans', icon_key: 'Money', description: '대출 관리', plan_group: 'pro' },
  { name: '일반투자', path: '/invest', icon_key: 'Truck', description: '일반 투자 관리 - 법인 운영 자금 및 투자 계약', plan_group: 'pro' },
  { name: '지입투자', path: '/jiip', icon_key: 'Truck', description: '지입/위수탁 관리 - 차주 및 투자자 계약', plan_group: 'pro' },
]

export async function GET() {
  try {
    // 1. 현재 DB에 있는 모듈 조회
    const { data: currentModules, error: fetchError } = await supabaseAdmin
      .from('system_modules')
      .select('id, name, path, icon_key, plan_group')
      .order('path')

    if (fetchError) {
      return NextResponse.json({ error: '모듈 조회 실패', detail: fetchError.message }, { status: 500 })
    }

    const currentPaths = new Set((currentModules || []).map((m: any) => m.path))

    // 2. 누락된 모듈 식별
    const missingModules = EXPECTED_MODULES.filter(m => !currentPaths.has(m.path))

    // 3. 누락 모듈 복구
    const restored: string[] = []
    const errors: string[] = []

    for (const mod of missingModules) {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('system_modules')
        .insert(mod)
        .select('id, path')
        .single()

      if (insertError) {
        errors.push(`${mod.path}: ${insertError.message}`)
      } else {
        restored.push(mod.path)

        // 기존 회사들에 자동 활성화 (company_modules에 추가)
        const { data: companies } = await supabaseAdmin
          .from('companies')
          .select('id, plan')

        if (companies && inserted) {
          const planHierarchy = ['free', 'basic', 'pro', 'max']
          const modulePlanIdx = planHierarchy.indexOf(mod.plan_group)

          for (const comp of companies) {
            const companyPlanIdx = planHierarchy.indexOf(comp.plan || 'free')
            const shouldBeActive = companyPlanIdx >= modulePlanIdx

            await supabaseAdmin
              .from('company_modules')
              .upsert({
                company_id: comp.id,
                module_id: inserted.id,
                is_active: shouldBeActive,
              }, { onConflict: 'company_id,module_id' })
          }
        }
      }
    }

    // 4. 최종 결과 조회
    const { data: finalModules } = await supabaseAdmin
      .from('system_modules')
      .select('id, name, path, icon_key, plan_group')
      .order('path')

    return NextResponse.json({
      status: 'success',
      summary: {
        이전_모듈수: currentModules?.length || 0,
        누락_감지: missingModules.length,
        복구_완료: restored.length,
        복구_실패: errors.length,
      },
      현재_모듈목록: currentModules || [],
      누락_모듈: missingModules.map(m => m.path),
      복구된_모듈: restored,
      에러: errors,
      최종_모듈목록: finalModules || [],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
