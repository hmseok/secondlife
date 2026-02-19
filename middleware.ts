import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ============================================
// 미들웨어: 세션 갱신만 담당 (리다이렉트 안 함)
// 리다이렉트는 클라이언트에서 처리 → 프로덕션 쿠키 유실 문제 회피
// ============================================

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // 세션 갱신만 수행 — 리다이렉트 없이 항상 res 반환
  await supabase.auth.getSession()

  // ============================================
  // CDN 캐시 방지: HTML 페이지는 항상 최신 버전 제공
  // Next.js prerender가 s-maxage=31536000 설정 → Cloudflare가 1년 캐시
  // 이를 덮어써서 HTML은 절대 CDN 캐시되지 않도록 함
  // ============================================
  const { pathname } = req.nextUrl
  const isStaticAsset = pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|woff2?|ttf|eot|css|js|json)$/)

  if (!isStaticAsset) {
    res.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.headers.set('CDN-Cache-Control', 'no-store')
    res.headers.set('Cloudflare-CDN-Cache-Control', 'no-store')
    res.headers.set('Pragma', 'no-cache')
    res.headers.set('Expires', '0')
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/).*)',
  ],
}
