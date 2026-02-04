'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [msg, setMsg] = useState('신원 확인 중...')

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      // 1. 권한 조회 (company_members 테이블)
      const { data: member } = await supabase
        .from('company_members')
        .select('role')
        .eq('user_id', session.user.id)
        .single()

      // 2. 권한별 라우팅 (여기가 핵심!)
      const role = member?.role || 'user'

      setMsg(`반갑습니다. ${role === 'admin' ? '시스템 최고 관리자' : '사용자'}님. 이동 중...`)

      if (role === 'admin' || role === 'super_admin') {
        // 👑 [God Mode] 대표님은 시스템 통제실로 이동
        router.replace('/admin')
      } else {
        // 👤 일반 직원은 차량 업무 페이지로 이동
        router.replace('/cars')
      }
    }

    checkUserAndRedirect()
  }, [router, supabase])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mb-6"></div>
      <h2 className="text-2xl font-bold text-gray-800 animate-pulse">{msg}</h2>
    </div>
  )
}