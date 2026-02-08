import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  // Cloud Run 내부에서는 request.url이 내부 주소(0.0.0.0:8080)이므로
  // 실제 외부 도메인을 헤더에서 추출
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || requestUrl.host
  const protocol = headersList.get('x-forwarded-proto') || 'https'
  const origin = `${protocol}://${host}`

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    try {
      await supabase.auth.exchangeCodeForSession(code)
    } catch (error) {
      console.error('Auth Callback Error:', error)
      return NextResponse.redirect(`${origin}/?error=auth_failed`)
    }
  }

  // 인증 완료 페이지로 리다이렉트 (실제 도메인 사용)
  return NextResponse.redirect(`${origin}/auth/verified`)
}
