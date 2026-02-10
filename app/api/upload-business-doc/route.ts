import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ⚡️ 사업자등록증 업로드 — 회원가입 시 서버사이드에서 처리
// 회원가입 직후에는 이메일 인증 전이라 클라이언트 세션이 없음
// → service role key로 서버에서 직접 업로드

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('서버 설정 오류: Supabase 서비스 키가 없습니다.')
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const userId = formData.get('userId') as string | null

    if (!file || !userId) {
      return NextResponse.json({ error: '파일과 사용자 ID가 필요합니다.' }, { status: 400 })
    }

    // 파일 크기 체크 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: '파일 크기는 10MB 이하만 가능합니다.' }, { status: 400 })
    }

    // 파일 형식 체크
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: '허용되지 않는 파일 형식입니다.' }, { status: 400 })
    }

    // userId 유효성 검증 (실제 auth.users에 존재하는지)
    const supabaseAdmin = getServiceClient()
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (userError || !userData?.user) {
      return NextResponse.json({ error: '유효하지 않은 사용자입니다.' }, { status: 403 })
    }

    // 파일 업로드
    const ext = file.name.split('.').pop()?.toLowerCase() || 'file'
    const filePath = `${userId}/business_registration.${ext}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabaseAdmin.storage
      .from('business-docs')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) {
      console.error('📁 Storage 업로드 실패:', uploadError)
      return NextResponse.json({ error: '파일 업로드에 실패했습니다.' }, { status: 500 })
    }

    // 공개 URL 생성
    const { data: urlData } = supabaseAdmin.storage
      .from('business-docs')
      .getPublicUrl(filePath)

    const publicUrl = urlData?.publicUrl || null

    // 회사 레코드에 URL 저장 시도 (이미 회사가 생성된 경우)
    if (publicUrl) {
      try {
        const { error: rpcError } = await supabaseAdmin.rpc('update_company_doc_url', { doc_url: publicUrl })
        if (rpcError) console.log('RPC update_company_doc_url 스킵 (회사 미생성):', rpcError.message)
      } catch {
        // 회사가 아직 안 만들어졌을 수 있음 — 무시
      }
    }

    console.log(`✅ [사업자등록증 업로드] ${userId} → ${filePath}`)
    return NextResponse.json({ url: publicUrl })

  } catch (error: any) {
    console.error('사업자등록증 업로드 에러:', error.message)
    return NextResponse.json({ error: error.message || '업로드 처리 실패' }, { status: 500 })
  }
}
