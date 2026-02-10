import { NextRequest, NextResponse } from 'next/server'

// ============================================
// Supabase REST Proxy — service_role로 RLS 우회
// /api/sp/{table}?... → SUPABASE_URL/rest/v1/{table}?...
// ★ 임시 조치: RLS 무한 재귀 수정 후 제거 가능
// ============================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// 전달할 헤더 목록
const FORWARD_HEADERS = [
  'content-type', 'prefer', 'range', 'accept',
  'accept-profile', 'content-profile',
]

async function proxyRequest(request: NextRequest, params: Promise<{ path: string[] }>) {
  const { path } = await params
  const tablePath = path.join('/')
  const search = request.nextUrl.search // ?select=*&id=eq.123 등

  const targetUrl = `${SUPABASE_URL}/rest/v1/${tablePath}${search}`

  // 요청 헤더 구성
  const headers: Record<string, string> = {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
  }

  // 원본 요청에서 필요한 헤더 전달
  for (const name of FORWARD_HEADERS) {
    const value = request.headers.get(name)
    if (value) headers[name] = value
  }

  // 요청 body 처리 (GET/HEAD는 body 없음)
  let body: string | null = null
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      body = await request.text()
    } catch {}
  }

  try {
    const res = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    })

    // 응답 헤더 전달
    const responseHeaders = new Headers()
    const passthroughHeaders = [
      'content-type', 'content-range', 'x-total-count',
      'preference-applied', 'location',
    ]
    for (const name of passthroughHeaders) {
      const value = res.headers.get(name)
      if (value) responseHeaders.set(name, value)
    }

    const responseBody = await res.text()
    return new NextResponse(responseBody, {
      status: res.status,
      headers: responseHeaders,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Proxy error', detail: err.message },
      { status: 502 }
    )
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx.params)
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx.params)
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx.params)
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx.params)
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx.params)
}
