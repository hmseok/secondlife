import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// ============================================
// Supabase 클라이언트 (쿠키 기반 세션 관리)
// ★ REST API 요청을 서버 프록시(/api/sp/)로 경유
//   → service_role 키로 RLS 우회 (무한 재귀 문제 해결)
// ★ Auth 요청은 Supabase 직접 통신 (세션/쿠키 정상)
// ★ RLS 수정 후 options 부분만 제거하면 원래대로 복원됨
// ============================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

export const supabase = createClientComponentClient({
  options: {
    global: {
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url

        // REST API 호출 → 서버 프록시로 경유 (service_role로 RLS 우회)
        if (url.includes('/rest/v1/')) {
          const restPath = url.split('/rest/v1/')[1]
          const proxyUrl = `/api/sp/${restPath}`

          return fetch(proxyUrl, {
            method: init?.method || 'GET',
            headers: init?.headers,
            body: init?.body,
          })
        }

        // Auth, Realtime, Storage 등 → Supabase 직접 통신
        return fetch(input, init)
      }
    }
  }
})
