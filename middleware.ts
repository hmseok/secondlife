import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 인증 없이 접근 가능한 경로
const PUBLIC_PATHS = [
  '/',              // 로그인/회원가입 페이지
  '/auth/callback', // 인증 콜백
  '/auth/verified', // 인증 완료 페이지
]

// ★ 리다이렉트 시 Supabase 세션 쿠키를 복사하는 헬퍼
function redirectWithCookies(url: URL, res: NextResponse): NextResponse {
  const redirectResponse = NextResponse.redirect(url)
  // 미들웨어가 갱신한 쿠키를 리다이렉트 응답에 복사
  res.headers.getSetCookie().forEach(cookie => {
    redirectResponse.headers.append('Set-Cookie', cookie)
  })
  return redirectResponse
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // 세션 갱신 (쿠키가 res에 설정됨)
  const { data: { session } } = await supabase.auth.getSession()

  const pathname = req.nextUrl.pathname

  // 공개 경로는 통과
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    // 이미 로그인된 상태에서 로그인 페이지 접근 시 대시보드로 리디렉션
    if (pathname === '/' && session) {
      // ★ 쿠키를 포함한 리다이렉트 — 이전에는 쿠키가 유실되어 무한루프 발생
      return redirectWithCookies(new URL('/dashboard', req.url), res)
    }
    return res
  }

  // API 라우트는 각 라우트에서 개별 인증 처리 (auth-guard.ts)
  if (pathname.startsWith('/api/')) {
    return res
  }

  // 세션이 없으면 로그인 페이지로 리디렉션
  if (!session) {
    const redirectUrl = new URL('/', req.url)
    redirectUrl.searchParams.set('redirect', pathname)
    // ★ 세션 없을 때도 쿠키 포함 (토큰 클리어 쿠키 등)
    return redirectWithCookies(redirectUrl, res)
  }

  return res
}

export const config = {
  matcher: [
    /*
     * 아래 경로를 제외한 모든 경로에서 실행:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화)
     * - favicon.ico (파비콘)
     * - manifest.json, icons (PWA)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/).*)',
  ],
}
