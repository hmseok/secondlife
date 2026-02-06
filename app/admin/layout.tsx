'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../utils/supabase' // 경로 확인! (../../utils/supabase 일 수도 있음)
import Link from 'next/link'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.replace('/')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle()

        if (profile?.role === 'god_admin') {
          setIsAuthorized(true)
        } else {
          alert('⛔️ 접근 권한이 없습니다. (최고 관리자 전용)')
          router.replace('/')
        }
      } catch (e) {
        console.error('관리자 체크 에러:', e)
        router.replace('/')
      } finally {
        setLoading(false)
      }
    }

    checkAdmin()
  }, [])

  // 👇 로그아웃 함수 추가
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/') // 로그인 페이지로 쫓아냄
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-xl font-bold text-gray-800 mb-2">👑 관리자 권한 확인 중...</div>
          <div className="text-sm text-gray-500">잠시만 기다려주세요.</div>
        </div>
      </div>
    )
  }

  if (!isAuthorized) return null

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* 사이드바 */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold">SECONDLIFE <span className="text-blue-500">ADMIN</span></h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link href="/admin" className="block px-4 py-3 rounded-lg bg-blue-600 text-white font-medium">
            대시보드
          </Link>
          {/* 메뉴들 추가 예정... */}
        </nav>

        {/* 👇 하단 로그아웃 버튼 영역 */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-slate-800 hover:bg-red-600/90 text-slate-300 hover:text-white transition-all font-medium text-sm group"
          >
            <span>🚪</span> 로그아웃
          </button>
        </div>
      </aside>

      {/* 메인 콘텐츠 (사이드바 너비만큼 밀어주기 pl-64) */}
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  )
}