import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API 라우트 인증 가드
 * 모든 API 라우트에서 호출하여 인증된 사용자인지 확인
 *
 * 사용법:
 *   const auth = await requireAuth(req)
 *   if (auth.error) return auth.error
 *   // auth.userId, auth.email 사용 가능
 */
export async function requireAuth(req: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
        return { error: NextResponse.json({ error: '서버 설정 오류' }, { status: 500 }), userId: null, email: null }
    }

    // Authorization 헤더 또는 쿠키에서 토큰 추출
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    // 쿠키에서 Supabase 세션 토큰 추출 시도
    const cookies = req.cookies
    const accessToken = token
        || cookies.get('sb-access-token')?.value
        || cookies.get(`sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`)?.value

    if (!accessToken) {
        // 쿠키 기반 인증: Supabase anon key로 클라이언트를 만들고 쿠키의 세션을 확인
        // Next.js App Router에서는 클라이언트가 쿠키로 세션을 보냄
        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: {
                headers: {
                    cookie: req.headers.get('cookie') || '',
                }
            }
        })

        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
            return {
                error: NextResponse.json({ error: '인증이 필요합니다. 로그인해주세요.' }, { status: 401 }),
                userId: null,
                email: null
            }
        }

        return { error: null, userId: user.id, email: user.email }
    }

    // 토큰 기반 인증
    const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } }
    })

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
        return {
            error: NextResponse.json({ error: '인증이 필요합니다. 로그인해주세요.' }, { status: 401 }),
            userId: null,
            email: null
        }
    }

    return { error: null, userId: user.id, email: user.email }
}
