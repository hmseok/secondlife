import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API 라우트 인증 가드
 * createRouteHandlerClient를 사용하여 Supabase 쿠키 세션을 올바르게 읽음
 * (청크 쿠키 sb-xxx-auth-token.0, .1 등 자동 처리)
 *
 * 사용법:
 *   const auth = await requireAuth(req)
 *   if (auth.error) return auth.error
 *   // auth.userId, auth.email 사용 가능
 */
export async function requireAuth(req: NextRequest) {
  try {
    // Next.js 15+ 에서는 cookies()가 async
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return {
        error: NextResponse.json(
          { error: '인증이 필요합니다. 로그인해주세요.' },
          { status: 401 }
        ),
        userId: null,
        email: null
      }
    }

    return { error: null, userId: user.id, email: user.email }
  } catch (e: any) {
    console.error('[auth-guard] 인증 처리 오류:', e.message)

    // fallback: Authorization 헤더에서 직접 토큰 추출 시도
    try {
      const authHeader = req.headers.get('authorization')
      const token = authHeader?.replace('Bearer ', '')

      if (token) {
        const { createClient } = await import('@supabase/supabase-js')
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

        const supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: `Bearer ${token}` } }
        })

        const { data: { user }, error } = await supabase.auth.getUser()
        if (!error && user) {
          return { error: null, userId: user.id, email: user.email }
        }
      }
    } catch (fallbackErr) {
      console.error('[auth-guard] fallback 인증 실패:', fallbackErr)
    }

    return {
      error: NextResponse.json(
        { error: '인증 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      ),
      userId: null,
      email: null
    }
  }
}
