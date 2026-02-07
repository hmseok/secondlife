import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // 1. 미들웨어 전용 Supabase 클라이언트 생성
  const supabase = createMiddlewareClient({ req, res })

  // 2. 세션 확인 및 쿠키 갱신 (이게 없으면 서버가 로그인을 모릅니다)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // 3. 보호된 경로(/admin) 접근 제어
  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      // 로그인 안 됐으면 메인으로 쫓아냄
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  // 4. 이미 로그인했는데 메인(/)에 왔다면? -> 관리자 페이지로 보냄
  if (req.nextUrl.pathname === '/') {
    if (session) {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
  }

  return res
}

// 미들웨어가 적용될 경로 설정
export const config = {
  matcher: ['/', '/admin/:path*'],
}