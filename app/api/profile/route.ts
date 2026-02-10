import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ============================================
// 프로필 API — service_role로 RLS 우회하여 프로필 로드
// RLS 정책에 무한 재귀 문제가 있을 때 폴백용
// ============================================

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('서버 설정 오류: Supabase 서비스 키가 없습니다.')
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export async function GET(request: NextRequest) {
  try {
    // 1. Authorization 헤더에서 JWT 추출
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || ''

    if (!token) {
      return NextResponse.json({ error: '인증 토큰이 없습니다' }, { status: 401 })
    }

    const supabaseAdmin = getServiceClient()

    // 2. JWT로 유저 확인
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다' }, { status: 401 })
    }

    const userId = user.id

    // 3. 프로필 로드 (service_role → RLS 우회)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: '프로필을 찾을 수 없습니다', detail: profileError?.message },
        { status: 404 }
      )
    }

    // 4. 관련 데이터 로드
    let company = null
    let position = null
    let department = null

    if (profile.company_id) {
      const { data } = await supabaseAdmin
        .from('companies').select('*')
        .eq('id', profile.company_id).maybeSingle()
      company = data
    }

    if (profile.position_id) {
      const { data } = await supabaseAdmin
        .from('positions').select('*')
        .eq('id', profile.position_id).maybeSingle()
      position = data
    }

    if (profile.department_id) {
      const { data } = await supabaseAdmin
        .from('departments').select('*')
        .eq('id', profile.department_id).maybeSingle()
      department = data
    }

    // 5. god_admin 전체 회사 목록
    let allCompanies: any[] = []
    if (profile.role === 'god_admin') {
      const { data } = await supabaseAdmin
        .from('companies')
        .select('id, name, plan, is_active')
        .eq('is_active', true)
        .order('name')
      allCompanies = data || []
    }

    return NextResponse.json({
      profile: {
        ...profile,
        companies: company,
        position,
        department,
      },
      allCompanies,
    })
  } catch (err: any) {
    console.error('Profile API error:', err)
    return NextResponse.json(
      { error: '서버 오류', detail: err.message },
      { status: 500 }
    )
  }
}
