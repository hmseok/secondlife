import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()
  const path = req.nextUrl.pathname

  // 👇 [여기 주석 해제!]
  // 로그인 안 한 사람이 (로그인, 회원가입, auth) 제외한 곳에 오면 -> /login으로 쫓아냄
  if (!session && path !== '/login' && path !== '/signup' && !path.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // 이미 로그인한 사람이 로그인 페이지 오면 -> 메인(/)으로 보냄 -> 메인에서 다시 권한별 이동
  if (session && (path === '/login' || path === '/signup')) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}