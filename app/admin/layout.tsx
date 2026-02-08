'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '../utils/supabase'
import { useApp } from '../context/AppContext'
import Link from 'next/link'

// ============================================
// Admin Layout - 관리자 영역 레이아웃
// god_admin + master 접근 가능
// ============================================

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, role, loading } = useApp()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // 디버깅: AppContext 상태 확인
    console.log('🔍 Admin Layout 체크:', { loading, user: user?.email, role })

    if (loading) return

    if (!user) {
      console.log('❌ user 없음 → / 로 이동')
      router.replace('/')
      return
    }

    // god_admin 또는 master만 접근 가능
    if (role !== 'god_admin' && role !== 'master') {
      console.log('❌ role 불일치:', role, '→ /cars 로 이동')
      router.replace('/cars')
      return
    }

    console.log('✅ Admin 접근 허용:', role)
    setChecking(false)
  }, [user, role, loading])

  if (loading || checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold">접속 중...</p>
        </div>
      </div>
    )
  }

  // 관리 메뉴 항목
  const adminMenus = [
    { path: '/admin', name: '대시보드', exact: true },
    { path: '/admin/employees', name: '조직 관리', exact: false },
    { path: '/admin/permissions', name: '권한 설정', exact: false },
  ]

  // god_admin 전용 메뉴
  if (role === 'god_admin') {
    adminMenus.push({ path: '/admin/codes', name: '공통 코드', exact: false })
    adminMenus.push({ path: '/admin/model', name: '차종 관리', exact: false })
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* 사이드바 */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-20 shadow-xl">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-extrabold tracking-tight">
            Sideline <span className="text-blue-500">ERP</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {role === 'god_admin' ? 'Platform Admin' : 'Company Admin'}
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {adminMenus.map(menu => {
            const isActive = menu.exact
              ? pathname === menu.path
              : pathname.startsWith(menu.path) && (menu.path !== '/admin' || pathname === '/admin')

            return (
              <Link
                key={menu.path}
                href={menu.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {menu.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <button
            onClick={() => router.push('/cars')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold text-sm transition-all"
          >
            &larr; 업무 화면으로
          </button>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.replace('/'); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-red-600/90 text-slate-300 hover:text-white font-bold text-sm transition-all"
          >
            로그아웃
          </button>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 ml-64">
        {children}
      </main>
    </div>
  )
}
